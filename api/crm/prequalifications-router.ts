import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { prequalifications } from "../../db/schema";

const employmentStatusEnum = z.enum(["employed", "self_employed", "unemployed", "student", "retired"]);
const contractTypeEnum = z.enum(["indefinido", "temporal", "autonomo", "otro"]);
const prequalStatusEnum = z.enum(["pending", "approved", "rejected"]);

export const prequalificationsRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      status: prequalStatusEnum.optional(),
      leadId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { page = 1, limit = 20, status, leadId } = input || {};
      const offset = (page - 1) * limit;
      const conditions = [];
      if (status) conditions.push(eq(prequalifications.status, status));
      if (leadId) conditions.push(eq(prequalifications.leadId, leadId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.query.prequalifications.findMany({ where, limit, offset, orderBy: desc(prequalifications.createdAt) }),
        db.select({ count: sql<number>`count(*)` }).from(prequalifications).where(where),
      ]);
      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const pq = await db.query.prequalifications.findFirst({ where: eq(prequalifications.id, input.id) });
      if (!pq) throw new Error("Precalificacion no encontrada");
      return pq;
    }),

  create: comercialProcedure
    .input(z.object({
      leadId: z.number(),
      monthlyIncome: z.number().optional(),
      employmentStatus: employmentStatusEnum.optional(),
      contractType: contractTypeEnum.optional(),
      hasGuarantor: z.boolean().default(false),
      pets: z.boolean().default(false),
      smoker: z.boolean().default(false),
      numOccupants: z.number().default(1),
      preferredEntryDate: z.date().optional(),
      maxBudget: z.number().optional(),
      score: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await db.insert(prequalifications).values({ ...input, status: "pending" }).returning();
      return result[0];
    }),

  update: comercialProcedure
    .input(z.object({
      id: z.number(),
      monthlyIncome: z.number().optional(),
      employmentStatus: employmentStatusEnum.optional(),
      contractType: contractTypeEnum.optional(),
      hasGuarantor: z.boolean().optional(),
      pets: z.boolean().optional(),
      smoker: z.boolean().optional(),
      numOccupants: z.number().optional(),
      preferredEntryDate: z.date().optional(),
      maxBudget: z.number().optional(),
      score: z.number().optional(),
      status: prequalStatusEnum.optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(prequalifications).set({ ...data, updatedAt: new Date() }).where(eq(prequalifications.id, id)).returning();
      if (!result[0]) throw new Error("Precalificacion no encontrada");
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(prequalifications).where(eq(prequalifications.id, input.id));
      return { success: true };
    }),
});
