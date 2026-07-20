import { z } from "zod";
import { eq, like, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { settings } from "../../db/schema";

export const settingsRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(z.object({
      category: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { category } = input || {};
      const where = category ? eq(settings.category, category) : undefined;
      return db.query.settings.findMany({ where, orderBy: desc(settings.updatedAt) });
    }),

  getByKey: readOnlyProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const setting = await db.query.settings.findFirst({ where: eq(settings.key, input.key) });
      return setting || null;
    }),

  set: adminProcedure
    .input(z.object({
      key: z.string().min(1),
      value: z.string().optional(),
      category: z.string().default("general"),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.query.settings.findFirst({ where: eq(settings.key, input.key) });
      if (existing) {
        const result = await db.update(settings).set({ value: input.value, category: input.category, updatedAt: new Date() }).where(eq(settings.id, existing.id)).returning();
        return result[0];
      }
      const result = await db.insert(settings).values(input).returning();
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(settings).where(eq(settings.key, input.key));
      return { success: true };
    }),
});
