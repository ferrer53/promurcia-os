import { z } from "zod";
import { eq, like, or, and, desc, asc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { properties, leadProperties, leads } from "../../db/schema";

const propertyTypeEnum = z.enum(["apartamento", "casa", "duplex", "atico", "local", "oficina", "nave", "terreno", "parking", "trastero"]);
const propertyStatusEnum = z.enum(["disponible", "reservado", "alquilado", "vendido", "inactivo"]);
const propertyOperationEnum = z.enum(["alquiler", "venta", "ambos"]);
const conditionEnum = z.enum(["nuevo", "reforma", "bueno", "a_reformar"]);

function getPropertyOrderBy(sortBy: string, sortOrder: "asc" | "desc") {
  const col = sortBy === "title" ? properties.title
    : sortBy === "price" ? properties.price
    : sortBy === "zone" ? properties.zone
    : sortBy === "status" ? properties.status
    : sortBy === "type" ? properties.type
    : sortBy === "createdAt" ? properties.createdAt
    : sortBy === "updatedAt" ? properties.updatedAt
    : properties.createdAt;
  return sortOrder === "desc" ? desc(col) : asc(col);
}

export const propertiesRouter = createTRPCRouter({
  list: readOnlyProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        type: propertyTypeEnum.optional(),
        status: propertyStatusEnum.optional(),
        operation: propertyOperationEnum.optional(),
        zone: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        bedrooms: z.number().optional(),
        search: z.string().optional(),
        sortBy: z.string().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }).optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, type, status, operation, zone, minPrice, maxPrice, bedrooms, search, sortBy = "createdAt", sortOrder = "desc" } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [];
      if (type) conditions.push(eq(properties.type, type));
      if (status) conditions.push(eq(properties.status, status));
      if (operation) conditions.push(eq(properties.operation, operation));
      if (zone) conditions.push(like(properties.zone, `%${zone}%`));
      if (minPrice) conditions.push(sql`${properties.price} >= ${minPrice}`);
      if (maxPrice) conditions.push(sql`${properties.price} <= ${maxPrice}`);
      if (bedrooms) conditions.push(eq(properties.bedrooms, bedrooms));
      if (search) {
        conditions.push(
          or(
            like(properties.title, `%${search}%`),
            like(properties.reference, `%${search}%`),
            like(properties.address, `%${search}%`)
          )
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.query.properties.findMany({
          where,
          limit,
          offset,
          orderBy: getPropertyOrderBy(sortBy, sortOrder),
        }),
        db.select({ count: sql<number>`count(*)` }).from(properties).where(where),
      ]);

      return { items, total: countResult[0]?.count ?? 0, page, limit };
    }),

  getById: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const property = await db.query.properties.findFirst({
        where: eq(properties.id, input.id),
      });
      if (!property) throw new Error("Propiedad no encontrada");
      return property;
    }),

  create: comercialProcedure
    .input(
      z.object({
        reference: z.string().min(1, "Referencia obligatoria"),
        title: z.string().min(1, "Titulo obligatorio"),
        description: z.string().optional(),
        type: propertyTypeEnum,
        status: propertyStatusEnum.default("disponible"),
        operation: propertyOperationEnum.default("alquiler"),
        price: z.number().min(0, "Precio no valido"),
        priceSale: z.number().optional(),
        zone: z.string().min(1, "Zona obligatoria"),
        address: z.string().optional(),
        city: z.string().default("Murcia"),
        postalCode: z.string().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        squareMeters: z.number().optional(),
        squareMetersUseful: z.number().optional(),
        floor: z.number().optional(),
        hasElevator: z.boolean().default(false),
        hasTerrace: z.boolean().default(false),
        hasParking: z.boolean().default(false),
        hasStorage: z.boolean().default(false),
        hasPool: z.boolean().default(false),
        hasGarden: z.boolean().default(false),
        hasAirConditioning: z.boolean().default(false),
        hasHeating: z.boolean().default(false),
        hasFurniture: z.boolean().default(false),
        yearBuilt: z.number().optional(),
        condition: conditionEnum.optional(),
        energyRating: z.string().optional(),
        lat: z.number().optional(),
        lng: z.number().optional(),
        images: z.string().optional(),
        ownerName: z.string().optional(),
        ownerPhone: z.string().optional(),
        ownerEmail: z.string().optional(),
        monthlyRent: z.number().optional(),
        profitability: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.insert(properties).values(input).returning();
      return result[0];
    }),

  update: comercialProcedure
    .input(
      z.object({
        id: z.number(),
        reference: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        type: propertyTypeEnum.optional(),
        status: propertyStatusEnum.optional(),
        operation: propertyOperationEnum.optional(),
        price: z.number().optional(),
        zone: z.string().optional(),
        address: z.string().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        squareMeters: z.number().optional(),
        notes: z.string().optional(),
        hasElevator: z.boolean().optional(),
        hasTerrace: z.boolean().optional(),
        hasParking: z.boolean().optional(),
        hasPool: z.boolean().optional(),
        hasAirConditioning: z.boolean().optional(),
        ownerName: z.string().optional(),
        ownerPhone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.update(properties).set({ ...data, updatedAt: new Date() }).where(eq(properties.id, id)).returning();
      if (!result[0]) throw new Error("Propiedad no encontrada");
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(properties).where(eq(properties.id, input.id));
      return { success: true };
    }),

  search: readOnlyProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const results = await db.query.properties.findMany({
        where: or(
          like(properties.title, `%${input.query}%`),
          like(properties.reference, `%${input.query}%`),
          like(properties.address, `%${input.query}%`)
        ),
        limit: 20,
      });
      return results;
    }),

  getLinkedLeads: readOnlyProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(async ({ input }) => {
      const result = await db.query.leadProperties.findMany({
        where: eq(leadProperties.propertyId, input.propertyId),
        with: { lead: true },
      });
      return result.map((lp) => lp.lead);
    }),

  linkLead: comercialProcedure
    .input(z.object({ propertyId: z.number(), leadId: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await db.query.leadProperties.findFirst({
        where: and(eq(leadProperties.leadId, input.leadId), eq(leadProperties.propertyId, input.propertyId)),
      });
      if (existing) return { success: true, alreadyLinked: true };

      await db.insert(leadProperties).values({ leadId: input.leadId, propertyId: input.propertyId });
      return { success: true, alreadyLinked: false };
    }),
});
