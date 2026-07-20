import { z } from "zod";
import { eq, like, or, desc, sql } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { users } from "../../db/schema";

const roleEnum = z.enum(["superCEO", "admin", "operaciones", "comercial", "solo_lectura", "agente"]);
const statusEnum = z.enum(["active", "inactive", "suspended"]);

export const usersRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(20),
        search: z.string().optional(),
        role: roleEnum.optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, search, role } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [];
      if (role) conditions.push(eq(users.role, role));
      if (search) {
        conditions.push(or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`)
        ));
      }

      const where = conditions.length > 0 ? or(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.query.users.findMany({ where, limit, offset, orderBy: desc(users.createdAt) }),
        db.select({ count: sql<number>`count(*)` }).from(users).where(where),
      ]);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      });
      if (!user) throw new Error("Usuario no encontrado");
      return user;
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nombre obligatorio"),
        email: z.string().email("Email invalido").optional(),
        avatar: z.string().optional(),
        role: roleEnum.default("comercial"),
        status: statusEnum.default("active"),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(users).values(input).returning();
      return result[0];
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        avatar: z.string().optional(),
        role: roleEnum.optional(),
        status: statusEnum.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
      if (!result[0]) throw new Error("Usuario no encontrado");
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
