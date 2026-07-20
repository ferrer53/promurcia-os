import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { reservations } from "../../db/schema";

const reservationStatusEnum = z.enum(["pending", "confirmed", "cancelled", "expired"]);

export const reservationsRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      status: reservationStatusEnum.optional(),
      propertyId: z.number().optional(),
      leadId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { page = 1, limit = 20, status, propertyId, leadId } = input || {};
      const offset = (page - 1) * limit;
      const conditions = [];
      if (status) conditions.push(eq(reservations.status, status));
      if (propertyId) conditions.push(eq(reservations.propertyId, propertyId));
      if (leadId) conditions.push(eq(reservations.leadId, leadId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.query.reservations.findMany({ where, limit, offset, orderBy: desc(reservations.createdAt), with: { property: true, lead: true } }),
        db.select({ count: sql<number>`count(*)` }).from(reservations).where(where),
      ]);
      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const res = await db.query.reservations.findFirst({ where: eq(reservations.id, input.id), with: { property: true, lead: true } });
      if (!res) throw new Error("Reserva no encontrada");
      return res;
    }),

  create: comercialProcedure
    .input(z.object({
      propertyId: z.number(),
      leadId: z.number(),
      amount: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await db.insert(reservations).values({ ...input, status: "pending" }).returning();
      return result[0];
    }),

  update: comercialProcedure
    .input(z.object({
      id: z.number(),
      status: reservationStatusEnum.optional(),
      amount: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(reservations).set({ ...data, updatedAt: new Date() }).where(eq(reservations.id, id)).returning();
      if (!result[0]) throw new Error("Reserva no encontrada");
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(reservations).where(eq(reservations.id, input.id));
      return { success: true };
    }),
});
