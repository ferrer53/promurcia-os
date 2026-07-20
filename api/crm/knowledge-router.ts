import { z } from "zod";
import { eq, like, or, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { knowledgeArticles } from "../../db/schema";

export const knowledgeRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
        category: z.string().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, category, search } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [];
      if (category) conditions.push(eq(knowledgeArticles.category, category));
      if (search) {
        conditions.push(or(
          like(knowledgeArticles.title, `%${search}%`),
          like(knowledgeArticles.content, `%${search}%`),
          like(knowledgeArticles.tags, `%${search}%`)
        ));
      }

      const where = conditions.length > 0 ? or(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.query.knowledgeArticles.findMany({ where, limit, offset, orderBy: desc(knowledgeArticles.createdAt) }),
        db.select({ count: sql<number>`count(*)` }).from(knowledgeArticles).where(where),
      ]);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const article = await db.query.knowledgeArticles.findFirst({
        where: eq(knowledgeArticles.id, input.id),
      });
      if (!article) throw new Error("Articulo no encontrado");
      return article;
    }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "Titulo obligatorio"),
        slug: z.string().min(1, "Slug obligatorio"),
        content: z.string().min(1, "Contenido obligatorio"),
        category: z.string().min(1, "Categoria obligatoria"),
        tags: z.string().optional(),
        template: z.string().optional(),
        isPublic: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(knowledgeArticles).values(input).returning();
      return result[0];
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        slug: z.string().optional(),
        content: z.string().optional(),
        category: z.string().optional(),
        tags: z.string().optional(),
        template: z.string().optional(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(knowledgeArticles).set({ ...data, updatedAt: new Date() }).where(eq(knowledgeArticles.id, id)).returning();
      if (!result[0]) throw new Error("Articulo no encontrado");
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(knowledgeArticles).where(eq(knowledgeArticles.id, input.id));
      return { success: true };
    }),

  search: readOnlyProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      return db.query.knowledgeArticles.findMany({
        where: or(
          like(knowledgeArticles.title, `%${input.query}%`),
          like(knowledgeArticles.content, `%${input.query}%`),
          like(knowledgeArticles.tags, `%${input.query}%`)
        ),
        limit: 20,
      });
    }),

  getTemplates: readOnlyProcedure.query(async () => {
    return db.query.knowledgeArticles.findMany({
      where: like(knowledgeArticles.category, "%template%"),
      orderBy: desc(knowledgeArticles.createdAt),
    });
  }),

  getTemplate: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const article = await db.query.knowledgeArticles.findFirst({
        where: eq(knowledgeArticles.id, input.id),
      });
      if (!article) throw new Error("Plantilla no encontrada");
      return article;
    }),
});
