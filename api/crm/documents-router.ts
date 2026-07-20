import { z } from "zod";
import { eq, and, desc, sql, like } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { documents } from "../../db/schema";

const docTypeEnum = z.enum(["contract", "invoice", "report", "photo", "identity", "other"]);
const entityTypeEnum = z.enum(["lead", "property", "operation"]);

export const documentsRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      type: docTypeEnum.optional(),
      entityType: entityTypeEnum.optional(),
      entityId: z.number().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const { page = 1, limit = 20, type, entityType, entityId, search } = input || {};
      const offset = (page - 1) * limit;
      const conditions = [];
      if (type) conditions.push(eq(documents.type, type));
      if (entityType) conditions.push(eq(documents.entityType, entityType));
      if (entityId) conditions.push(eq(documents.entityId, entityId));
      if (search) conditions.push(like(documents.name, `%${search}%`));
      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const [items, countResult] = await Promise.all([
        db.query.documents.findMany({ where, limit, offset, orderBy: desc(documents.createdAt) }),
        db.select({ count: sql<number>`count(*)` }).from(documents).where(where),
      ]);
      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const doc = await db.query.documents.findFirst({ where: eq(documents.id, input.id) });
      if (!doc) throw new Error("Documento no encontrado");
      return doc;
    }),

  create: comercialProcedure
    .input(z.object({
      name: z.string().min(1, "Nombre obligatorio"),
      type: docTypeEnum.default("other"),
      entityType: entityTypeEnum.optional(),
      entityId: z.number().optional(),
      filePath: z.string().optional(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.insert(documents).values({ ...input, uploadedBy: ctx.user.id }).returning();
      return result[0];
    }),

  update: comercialProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      type: docTypeEnum.optional(),
      filePath: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(documents).set(data).where(eq(documents.id, id)).returning();
      if (!result[0]) throw new Error("Documento no encontrado");
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(documents).where(eq(documents.id, input.id));
      return { success: true };
    }),
});
