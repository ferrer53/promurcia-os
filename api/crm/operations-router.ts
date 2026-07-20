import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { operations, operationTimeline, operationChecklist } from "../../db/schema";

const operationTypeEnum = z.enum(["alquiler", "venta", "pre_alquiler", "renovacion"]);
const operationStatusEnum = z.enum(["activa", "pausada", "cerrada", "cancelada"]);
const stageEnum = z.enum(["nueva", "documentacion", "visita", "negociacion", "contrato", "firma", "cerrada"]);

const stageOrder = ["nueva", "documentacion", "visita", "negociacion", "contrato", "firma", "cerrada"];

export const operationsRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        type: operationTypeEnum.optional(),
        stage: stageEnum.optional(),
        status: operationStatusEnum.optional(),
        leadId: z.number().optional(),
        agentId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, type, stage, status, leadId, agentId } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [];
      if (type) conditions.push(eq(operations.type, type));
      if (stage) conditions.push(eq(operations.stage, stage));
      if (status) conditions.push(eq(operations.status, status));
      if (leadId) conditions.push(eq(operations.leadId, leadId));
      if (agentId) conditions.push(eq(operations.agentId, agentId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.query.operations.findMany({
          where,
          limit,
          offset,
          orderBy: desc(operations.createdAt),
          with: { lead: true, property: true, agent: true },
        }),
        db.select({ count: sql<number>`count(*)` }).from(operations).where(where),
      ]);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const op = await db.query.operations.findFirst({
        where: eq(operations.id, input.id),
        with: { lead: true, property: true, agent: true },
      });
      if (!op) throw new Error("Operacion no encontrada");
      return op;
    }),

  create: comercialProcedure
    .input(
      z.object({
        type: operationTypeEnum,
        leadId: z.number(),
        propertyId: z.number().optional(),
        agentId: z.number().optional(),
        title: z.string().min(1, "Titulo obligatorio"),
        description: z.string().optional(),
        estimatedValue: z.number().optional(),
        estimatedCloseDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(operations).values({
        ...input,
        stage: "nueva",
        status: "activa",
        startDate: new Date(),
      }).returning();

      // Create initial timeline entry
      await db.insert(operationTimeline).values({
        operationId: result[0].id,
        stage: "nueva",
        action: "creacion",
        notes: "Operacion creada",
      });

      return result[0];
    }),

  update: comercialProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        estimatedValue: z.number().optional(),
        estimatedCloseDate: z.date().optional(),
        agentId: z.number().optional(),
        propertyId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(operations).set({ ...data, updatedAt: new Date() }).where(eq(operations.id, id)).returning();
      if (!result[0]) throw new Error("Operacion no encontrada");
      return result[0];
    }),

  changeStage: comercialProcedure
    .input(
      z.object({
        id: z.number(),
        direction: z.enum(["next", "previous"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const op = await db.query.operations.findFirst({
        where: eq(operations.id, input.id),
      });
      if (!op) throw new Error("Operacion no encontrada");

      const currentIndex = stageOrder.indexOf(op.stage);
      let newIndex = input.direction === "next"
        ? Math.min(currentIndex + 1, stageOrder.length - 1)
        : Math.max(currentIndex - 1, 0);

      const newStage = stageOrder[newIndex] as typeof stageOrder[number];

      const [updated] = await db.update(operations)
        .set({ stage: newStage, updatedAt: new Date() })
        .where(eq(operations.id, input.id))
        .returning();

      await db.insert(operationTimeline).values({
        operationId: input.id,
        stage: newStage,
        action: input.direction === "next" ? "avance" : "retroceso",
        notes: input.notes || `Cambio de etapa: ${op.stage} -> ${newStage}`,
      });

      return updated;
    }),

  close: comercialProcedure
    .input(
      z.object({
        id: z.number(),
        isSuccess: z.boolean(),
        finalValue: z.number().optional(),
        closeReason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, isSuccess, finalValue, closeReason } = input;
      const result = await db.update(operations)
        .set({
          status: "cerrada",
          stage: "cerrada",
          isSuccess,
          finalValue,
          closeReason,
          closeDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(operations.id, id))
        .returning();

      await db.insert(operationTimeline).values({
        operationId: id,
        stage: "cerrada",
        action: isSuccess ? "cierre_exitoso" : "cierre_fallido",
        notes: closeReason || `Operacion cerrada ${isSuccess ? "con exito" : "sin exito"}`,
      });

      if (!result[0]) throw new Error("Operacion no encontrada");
      return result[0];
    }),

  getPipeline: readOnlyProcedure.query(async () => {
    const allOps = await db.query.operations.findMany({
      where: eq(operations.status, "activa"),
      with: { lead: true, property: true },
    });

    const pipeline: Record<string, typeof allOps> = {};
    for (const stage of stageOrder) {
      pipeline[stage] = allOps.filter((op) => op.stage === stage);
    }
    return pipeline;
  }),

  getTimeline: readOnlyProcedure
    .input(z.object({ operationId: z.number() }))
    .query(async ({ input }) => {
      return db.query.operationTimeline.findMany({
        where: eq(operationTimeline.operationId, input.operationId),
        orderBy: desc(operationTimeline.createdAt),
      });
    }),

  addTimelineEntry: comercialProcedure
    .input(
      z.object({
        operationId: z.number(),
        stage: z.string(),
        action: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(operationTimeline).values(input).returning();
      return result[0];
    }),

  getChecklist: readOnlyProcedure
    .input(z.object({ operationId: z.number() }))
    .query(async ({ input }) => {
      return db.query.operationChecklist.findMany({
        where: eq(operationChecklist.operationId, input.operationId),
      });
    }),

  updateChecklist: comercialProcedure
    .input(
      z.object({
        items: z.array(z.object({
          id: z.number().optional(),
          operationId: z.number(),
          label: z.string(),
          checked: z.boolean(),
        })),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];
      for (const item of input.items) {
        if (item.id) {
          const [updated] = await db.update(operationChecklist)
            .set({ checked: item.checked })
            .where(eq(operationChecklist.id, item.id))
            .returning();
          results.push(updated);
        } else {
          const [created] = await db.insert(operationChecklist)
            .values({ operationId: item.operationId, label: item.label, checked: item.checked })
            .returning();
          results.push(created);
        }
      }
      return results;
    }),
});
