import { z } from "zod";
import { eq, and, desc, sql, isNotNull, lt } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { tasks } from "../../db/schema";

const taskStatusEnum = z.enum(["pending", "in_progress", "completed", "cancelled"]);
const taskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);

export const tasksRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: taskStatusEnum.optional(),
        priority: taskPriorityEnum.optional(),
        assignedTo: z.number().optional(),
        leadId: z.number().optional(),
        propertyId: z.number().optional(),
        operationId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, status, priority, assignedTo, leadId, propertyId, operationId } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [];
      if (status) conditions.push(eq(tasks.status, status));
      if (priority) conditions.push(eq(tasks.priority, priority));
      if (assignedTo) conditions.push(eq(tasks.assignedTo, assignedTo));
      if (leadId) conditions.push(eq(tasks.leadId, leadId));
      if (propertyId) conditions.push(eq(tasks.propertyId, propertyId));
      if (operationId) conditions.push(eq(tasks.operationId, operationId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.query.tasks.findMany({
          where,
          limit,
          offset,
          orderBy: desc(tasks.createdAt),
          with: { assignedUser: true },
        }),
        db.select({ count: sql<number>`count(*)` }).from(tasks).where(where),
      ]);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, input.id),
        with: { assignedUser: true },
      });
      if (!task) throw new Error("Tarea no encontrada");
      return task;
    }),

  create: comercialProcedure
    .input(
      z.object({
        title: z.string().min(1, "Titulo obligatorio"),
        description: z.string().optional(),
        status: taskStatusEnum.default("pending"),
        priority: taskPriorityEnum.default("medium"),
        assignedTo: z.number().optional(),
        leadId: z.number().optional(),
        propertyId: z.number().optional(),
        operationId: z.number().optional(),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(tasks).values(input).returning();
      return result[0];
    }),

  update: comercialProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: taskStatusEnum.optional(),
        priority: taskPriorityEnum.optional(),
        assignedTo: z.number().optional(),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(tasks).set({ ...data, updatedAt: new Date() }).where(eq(tasks.id, id)).returning();
      if (!result[0]) throw new Error("Tarea no encontrada");
      return result[0];
    }),

  complete: comercialProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db.update(tasks)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(tasks.id, input.id))
        .returning();
      if (!result[0]) throw new Error("Tarea no encontrada");
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(tasks).where(eq(tasks.id, input.id));
      return { success: true };
    }),

  getByLead: readOnlyProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      return db.query.tasks.findMany({
        where: eq(tasks.leadId, input.leadId),
        orderBy: desc(tasks.createdAt),
        with: { assignedUser: true },
      });
    }),

  getByProperty: readOnlyProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      return db.query.tasks.findMany({
        where: eq(tasks.propertyId, input.propertyId),
        orderBy: desc(tasks.createdAt),
        with: { assignedUser: true },
      });
    }),

  getByUser: readOnlyProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return db.query.tasks.findMany({
        where: eq(tasks.assignedTo, input.userId),
        orderBy: desc(tasks.createdAt),
      });
    }),

  getOverdue: readOnlyProcedure.query(async () => {
    const now = new Date();
    return db.query.tasks.findMany({
      where: and(
        eq(tasks.status, "pending"),
        isNotNull(tasks.dueDate),
        lt(tasks.dueDate, now)
      ),
      orderBy: desc(tasks.dueDate),
      with: { assignedUser: true, lead: true },
    });
  }),
});
