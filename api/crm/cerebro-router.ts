import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { cerebroSessions, cerebroMessages } from "../../db/schema";

export const cerebroRouter = createTRPCRouter({
  listSessions: comercialProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ input, ctx }) => {
      const { page = 1, limit = 20 } = input || {};
      const offset = (page - 1) * limit;
      const [items, countResult] = await Promise.all([
        db.query.cerebroSessions.findMany({
          limit, offset,
          orderBy: desc(cerebroSessions.updatedAt),
        }),
        db.select({ count: sql<number>`count(*)` }).from(cerebroSessions),
      ]);
      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getSession: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const session = await db.query.cerebroSessions.findFirst({
        where: eq(cerebroSessions.id, input.id),
        with: { messages: true },
      });
      if (!session) throw new Error("Sesion no encontrada");
      return session;
    }),

  createSession: comercialProcedure
    .input(z.object({
      title: z.string().optional(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.insert(cerebroSessions).values({
        ...input,
        userId: ctx.user.id,
      }).returning();
      return result[0];
    }),

  updateSession: comercialProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(cerebroSessions).set({ ...data, updatedAt: new Date() }).where(eq(cerebroSessions.id, id)).returning();
      if (!result[0]) throw new Error("Sesion no encontrada");
      return result[0];
    }),

  deleteSession: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(cerebroMessages).where(eq(cerebroMessages.sessionId, input.id));
      await db.delete(cerebroSessions).where(eq(cerebroSessions.id, input.id));
      return { success: true };
    }),

  sendMessage: comercialProcedure
    .input(z.object({
      sessionId: z.number(),
      content: z.string().min(1, "Mensaje vacio"),
    }))
    .mutation(async ({ input }) => {
      // Store user message
      await db.insert(cerebroMessages).values({
        sessionId: input.sessionId,
        role: "user",
        content: input.content,
      });

      // Mock AI response
      const responses = [
        "Entiendo, voy a analizar esa informacion para ti.",
        "He encontrado datos relevantes sobre tu consulta.",
        "Basandome en los datos del CRM, te sugiero lo siguiente...",
        "Puedo ayudarte con eso. Aqui tienes el analisis.",
        "Interesante consulta. He procesado la informacion.",
      ];
      const aiResponse = responses[Math.floor(Math.random() * responses.length)];

      const [aiMessage] = await db.insert(cerebroMessages).values({
        sessionId: input.sessionId,
        role: "assistant",
        content: aiResponse,
      }).returning();

      // Update session timestamp
      await db.update(cerebroSessions).set({ updatedAt: new Date() }).where(eq(cerebroSessions.id, input.sessionId));

      return aiMessage;
    }),

  getMessages: readOnlyProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      return db.query.cerebroMessages.findMany({
        where: eq(cerebroMessages.sessionId, input.sessionId),
        orderBy: (m) => [m.createdAt],
      });
    }),
});
