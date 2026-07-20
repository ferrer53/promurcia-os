import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { interactions } from "../../db/schema";

const interactionTypeEnum = z.enum(["email", "call", "whatsapp", "note", "visit", "sms"]);
const directionEnum = z.enum(["inbound", "outbound"]);

export const interactionsRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        type: interactionTypeEnum.optional(),
        leadId: z.number().optional(),
        propertyId: z.number().optional(),
        operationId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, type, leadId, propertyId, operationId } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [];
      if (type) conditions.push(eq(interactions.type, type));
      if (leadId) conditions.push(eq(interactions.leadId, leadId));
      if (propertyId) conditions.push(eq(interactions.propertyId, propertyId));
      if (operationId) conditions.push(eq(interactions.operationId, operationId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.query.interactions.findMany({ where, limit, offset, orderBy: desc(interactions.createdAt) }),
        db.select({ count: sql<number>`count(*)` }).from(interactions).where(where),
      ]);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getByLead: readOnlyProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      return db.query.interactions.findMany({
        where: eq(interactions.leadId, input.leadId),
        orderBy: desc(interactions.createdAt),
      });
    }),

  create: comercialProcedure
    .input(
      z.object({
        type: interactionTypeEnum,
        leadId: z.number().optional(),
        propertyId: z.number().optional(),
        operationId: z.number().optional(),
        content: z.string().min(1, "Contenido obligatorio"),
        direction: directionEnum.default("outbound"),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await db.insert(interactions).values({
        ...input,
        createdBy: ctx.user.id,
      }).returning();
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(interactions).where(eq(interactions.id, input.id));
      return { success: true };
    }),
});
