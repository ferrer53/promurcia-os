import { z } from "zod";
import { eq, like, or, and, desc, asc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { leads, leadProperties, properties } from "../../db/schema";

const leadSourceEnum = z.enum(["manual", "idealista", "fotocasa", "email", "whatsapp", "webhook", "phone", "referral", "web"]);
const leadStatusEnum = z.enum(["nuevo", "contactado", "calificado", "en_segimiento", "descartado", "convertido"]);
const tierEnum = z.enum(["hot", "warm", "cold"]);
const personaEnum = z.enum(["inversor", "familia", "joven", "extranjero", "empresa", "particular"]);
const urgencyEnum = z.enum(["alta", "media", "baja"]);
const operationTypeEnum = z.enum(["compra", "alquiler", "venta"]);

function getLeadOrderBy(sortBy: string, sortOrder: "asc" | "desc") {
  const col = sortBy === "name" ? leads.name
    : sortBy === "email" ? leads.email
    : sortBy === "phone" ? leads.phone
    : sortBy === "status" ? leads.status
    : sortBy === "tier" ? leads.tier
    : sortBy === "score" ? leads.score
    : sortBy === "source" ? leads.source
    : sortBy === "createdAt" ? leads.createdAt
    : sortBy === "updatedAt" ? leads.updatedAt
    : leads.createdAt;
  return sortOrder === "desc" ? desc(col) : asc(col);
}

export const leadsRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: leadStatusEnum.optional(),
        source: leadSourceEnum.optional(),
        tier: tierEnum.optional(),
        search: z.string().optional(),
        sortBy: z.string().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, status, source, tier, search, sortBy = "createdAt", sortOrder = "desc" } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [];
      if (status) conditions.push(eq(leads.status, status));
      if (source) conditions.push(eq(leads.source, source));
      if (tier) conditions.push(eq(leads.tier, tier));
      if (search) {
        conditions.push(
          or(
            like(leads.name, `%${search}%`),
            like(leads.email, `%${search}%`),
            like(leads.phone, `%${search}%`)
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.query.leads.findMany({
          where,
          limit,
          offset,
          orderBy: getLeadOrderBy(sortBy, sortOrder),
          with: { assignedUser: true },
        }),
        db.select({ count: sql<number>`count(*)` }).from(leads).where(where),
      ]);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const lead = await db.query.leads.findFirst({
        where: eq(leads.id, input.id),
        with: { assignedUser: true },
      });
      if (!lead) throw new Error("Lead no encontrado");
      return lead;
    }),

  create: comercialProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nombre es obligatorio"),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        source: leadSourceEnum.default("manual"),
        status: leadStatusEnum.default("nuevo"),
        operationType: operationTypeEnum.optional(),
        zone: z.string().optional(),
        budgetMin: z.number().optional(),
        budgetMax: z.number().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        squareMeters: z.number().optional(),
        urgency: urgencyEnum.default("media"),
        notes: z.string().optional(),
        assignedTo: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(leads).values(input).returning();
      return result[0];
    }),

  update: comercialProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        source: leadSourceEnum.optional(),
        status: leadStatusEnum.optional(),
        tier: tierEnum.optional(),
        persona: personaEnum.optional(),
        score: z.number().optional(),
        tags: z.string().optional(),
        operationType: operationTypeEnum.optional(),
        zone: z.string().optional(),
        budgetMin: z.number().optional(),
        budgetMax: z.number().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        squareMeters: z.number().optional(),
        urgency: urgencyEnum.optional(),
        notes: z.string().optional(),
        assignedTo: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(leads).set({ ...data, updatedAt: new Date() }).where(eq(leads.id, id)).returning();
      if (!result[0]) throw new Error("Lead no encontrado");
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(leads).where(eq(leads.id, input.id));
      return { success: true };
    }),

  search: readOnlyProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const results = await db.query.leads.findMany({
        where: or(
          like(leads.name, `%${input.query}%`),
          like(leads.email, `%${input.query}%`),
          like(leads.phone, `%${input.query}%`)
        ),
        limit: 20,
      });
      return results;
    }),

  classify: comercialProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Mock AI classification
      const tiers: ("hot" | "warm" | "cold")[] = ["hot", "warm", "cold"];
      const personas: ("inversor" | "familia" | "joven" | "extranjero" | "empresa" | "particular")[] =
        ["inversor", "familia", "joven", "extranjero", "empresa", "particular"];
      const allTags = ["urgente", "presupuesto-alto", "familia-numerosa", "inversion", "primera-visita", "repetidor", "extranjero", "empresa"];

      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      const persona = personas[Math.floor(Math.random() * personas.length)];
      const score = Math.floor(Math.random() * 100);
      const numTags = Math.floor(Math.random() * 3) + 1;
      const shuffled = [...allTags].sort(() => 0.5 - Math.random());
      const tags = shuffled.slice(0, numTags).join(",");

      const result = await db.update(leads)
        .set({ tier, persona, score, tags, aiClassification: `AI: ${tier} | ${persona} | ${score}/100`, updatedAt: new Date() })
        .where(eq(leads.id, input.id))
        .returning();

      if (!result[0]) throw new Error("Lead no encontrado");
      return result[0];
    }),

  linkProperty: comercialProcedure
    .input(z.object({ leadId: z.number(), propertyId: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.leadProperties.findFirst({
        where: and(eq(leadProperties.leadId, input.leadId), eq(leadProperties.propertyId, input.propertyId)),
      });
      if (existing) return { success: true, alreadyLinked: true };

      await db.insert(leadProperties).values(input);
      return { success: true, alreadyLinked: false };
    }),

  unlinkProperty: comercialProcedure
    .input(z.object({ leadId: z.number(), propertyId: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(leadProperties)
        .where(and(eq(leadProperties.leadId, input.leadId), eq(leadProperties.propertyId, input.propertyId)));
      return { success: true };
    }),

  getLinkedProperties: readOnlyProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      const result = await db.query.leadProperties.findMany({
        where: eq(leadProperties.leadId, input.leadId),
        with: { property: true },
      });
      return result.map((lp) => lp.property);
    }),

  getByPhone: readOnlyProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ input }) => {
      const result = await db.query.leads.findMany({
        where: like(leads.phone, `%${input.phone}%`),
      });
      return result;
    }),
});
