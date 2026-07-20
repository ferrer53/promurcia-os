import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { alerts } from "../../db/schema";

const alertTypeEnum = z.enum(["lead", "property", "task", "system", "offer", "reservation"]);
const severityEnum = z.enum(["info", "warning", "critical"]);
const entityTypeEnum = z.enum(["lead", "property", "operation", "task", "system"]);

export const alertsRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      type: alertTypeEnum.optional(),
      severity: severityEnum.optional(),
      read: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { page = 1, limit = 20, type, severity, read } = input || {};
      const offset = (page - 1) * limit;
      const conditions = [];
      if (type) conditions.push(eq(alerts.type, type));
      if (severity) conditions.push(eq(alerts.severity, severity));
      if (read !== undefined) conditions.push(eq(alerts.read, read));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.query.alerts.findMany({ where, limit, offset, orderBy: desc(alerts.createdAt) }),
        db.select({ count: sql<number>`count(*)` }).from(alerts).where(where),
      ]);
      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const alert = await db.query.alerts.findFirst({ where: eq(alerts.id, input.id) });
      if (!alert) throw new Error("Alerta no encontrada");
      return alert;
    }),

  create: adminProcedure
    .input(z.object({
      type: alertTypeEnum,
      severity: severityEnum.default("info"),
      title: z.string().min(1, "Titulo obligatorio"),
      message: z.string().min(1, "Mensaje obligatorio"),
      entityType: entityTypeEnum.optional(),
      entityId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await db.insert(alerts).values(input).returning();
      return result[0];
    }),

  markRead: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await db.update(alerts).set({ read: true }).where(eq(alerts.id, input.id)).returning();
      if (!result[0]) throw new Error("Alerta no encontrada");
      return result[0];
    }),

  markAllRead: readOnlyProcedure.mutation(async () => {
    await db.update(alerts).set({ read: true });
    return { success: true };
  }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(alerts).where(eq(alerts.id, input.id));
      return { success: true };
    }),
});
