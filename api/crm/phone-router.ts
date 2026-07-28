import { z } from "zod";
import { eq, like, or, inArray, desc } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { leads, properties, leadProperties, interactions, transcriptions } from "../../db/schema";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) return `+34${digits}`;
  if (digits.length === 11 && digits.startsWith("34")) return `+${digits}`;
  if (digits.length > 9) return `+${digits}`;
  return phone;
}

export const phoneRouter = createTRPCRouter({
  lookup: readOnlyProcedure
    .input(z.object({ phone: z.string().min(1, "Introduce un teléfono") }))
    .query(async ({ input }) => {
      const normalized = normalizePhone(input.phone);
      const last9 = normalized.slice(-9);

      // Find leads by phone
      const matchedLeads = await db.query.leads.findMany({
        where: or(
          like(leads.phone, `%${last9}%`),
          eq(leads.phone, normalized),
          eq(leads.phone, normalized.replace("+", ""))
        ),
        orderBy: desc(leads.createdAt),
        limit: 20,
      });

      const leadIds = matchedLeads.map((l) => l.id);

      // Find linked properties via leadProperties or ownerPhone
      const linkedPropertyRows = leadIds.length > 0
        ? await db.query.leadProperties.findMany({
            where: inArray(leadProperties.leadId, leadIds),
            with: { property: true },
          })
        : [];

      const linkedPropertyIds = linkedPropertyRows.map((r) => r.propertyId);

      const ownerProperties = await db.query.properties.findMany({
        where: or(
          like(properties.ownerPhone, `%${last9}%`),
          eq(properties.ownerPhone, normalized),
          eq(properties.ownerPhone, normalized.replace("+", ""))
        ),
        orderBy: desc(properties.createdAt),
        limit: 20,
      });

      const allPropertyIds = Array.from(new Set([...linkedPropertyIds, ...ownerProperties.map((p) => p.id)]));

      const relatedProperties = allPropertyIds.length > 0
        ? await db.query.properties.findMany({
            where: inArray(properties.id, allPropertyIds),
            orderBy: desc(properties.createdAt),
          })
        : [];

      // Interactions and transcriptions for these leads
      const relatedInteractions = leadIds.length > 0
        ? await db.query.interactions.findMany({
            where: inArray(interactions.leadId, leadIds),
            orderBy: desc(interactions.createdAt),
            limit: 50,
          })
        : [];

      const relatedTranscriptions = leadIds.length > 0
        ? await db.query.transcriptions.findMany({
            where: inArray(transcriptions.leadId, leadIds),
            orderBy: desc(transcriptions.createdAt),
            limit: 20,
          })
        : [];

      return {
        phone: normalized,
        leads: matchedLeads,
        properties: relatedProperties,
        interactions: relatedInteractions,
        transcriptions: relatedTranscriptions,
      };
    }),
});
