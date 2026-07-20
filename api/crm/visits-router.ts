import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { visits } from "../../db/schema";

const visitStatusEnum = z.enum(["scheduled", "completed", "cancelled", "no_show"]);

export const visitsRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      status: visitStatusEnum.optional(),
      propertyId: z.number().optional(),
      leadId: z.number().optional(),
      agentId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { page = 1, limit = 20, status, propertyId, leadId, agentId } = input || {};
      const offset = (page - 1) * limit;
      const conditions = [];
      if (status) conditions.push(eq(visits.status, status));
      if (propertyId) conditions.push(eq(visits.propertyId, propertyId));
      if (leadId) conditions.push(eq(visits.leadId, leadId));
      if (agentId) conditions.push(eq(visits.agentId, agentId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.query.visits.findMany({ where, limit, offset, orderBy: desc(visits.createdAt), with: { property: true, lead: true, agent: true } }),
        db.select({ count: sql<number>`count(*)` }).from(visits).where(where),
      ]);
      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const visit = await db.query.visits.findFirst({ where: eq(visits.id, input.id), with: { property: true, lead: true, agent: true } });
      if (!visit) throw new Error("Visita no encontrada");
      return visit;
    }),

  create: comercialProcedure
    .input(z.object({
      propertyId: z.number(),
      leadId: z.number(),
      agentId: z.number().optional(),
      scheduledAt: z.date(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await db.insert(visits).values({ ...input, status: "scheduled" }).returning();
      return result[0];
    }),

  update: comercialProcedure
    .input(z.object({
      id: z.number(),
      status: visitStatusEnum.optional(),
      scheduledAt: z.date().optional(),
      feedback: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
      if (data.status === "completed") {
        updateData.completedAt = new Date();
      }
      const result = await db.update(visits).set(updateData).where(eq(visits.id, id)).returning();
      if (!result[0]) throw new Error("Visita no encontrada");
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(visits).where(eq(visits.id, input.id));
      return { success: true };
    }),
});
