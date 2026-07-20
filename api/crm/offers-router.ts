import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { offers } from "../../db/schema";

const offerTypeEnum = z.enum(["alquiler", "venta"]);
const offerStatusEnum = z.enum(["draft", "sent", "accepted", "rejected", "expired"]);

export const offersRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      type: offerTypeEnum.optional(),
      status: offerStatusEnum.optional(),
      leadId: z.number().optional(),
      propertyId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { page = 1, limit = 20, type, status, leadId, propertyId } = input || {};
      const offset = (page - 1) * limit;
      const conditions = [];
      if (type) conditions.push(eq(offers.type, type));
      if (status) conditions.push(eq(offers.status, status));
      if (leadId) conditions.push(eq(offers.leadId, leadId));
      if (propertyId) conditions.push(eq(offers.propertyId, propertyId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.query.offers.findMany({ where, limit, offset, orderBy: desc(offers.createdAt) }),
        db.select({ count: sql<number>`count(*)` }).from(offers).where(where),
      ]);
      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const offer = await db.query.offers.findFirst({ where: eq(offers.id, input.id) });
      if (!offer) throw new Error("Oferta no encontrada");
      return offer;
    }),

  create: comercialProcedure
    .input(z.object({
      type: offerTypeEnum,
      propertyId: z.number().optional(),
      leadId: z.number(),
      amount: z.number().optional(),
      conditions: z.string().optional(),
      validUntil: z.date().optional(),
      content: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.insert(offers).values({ ...input, status: "draft", createdBy: ctx.user.id }).returning();
      return result[0];
    }),

  update: comercialProcedure
    .input(z.object({
      id: z.number(),
      type: offerTypeEnum.optional(),
      status: offerStatusEnum.optional(),
      amount: z.number().optional(),
      conditions: z.string().optional(),
      validUntil: z.date().optional(),
      content: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(offers).set({ ...data, updatedAt: new Date() }).where(eq(offers.id, id)).returning();
      if (!result[0]) throw new Error("Oferta no encontrada");
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(offers).where(eq(offers.id, input.id));
      return { success: true };
    }),
});
