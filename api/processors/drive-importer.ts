/**
 * Drive Importer — create CRM entities from AI-analyzed Drive files.
 */

import { eq, like, or, and, sql } from "drizzle-orm";
import { db } from "../../db/connection";
import {
  leads,
  properties,
  interactions,
  documents,
  leadProperties,
  transcriptions,
  transcriptionAnalysis,
  driveImportQueue,
} from "../../db/schema";
import type {
  DriveAIAnalysis,
  AnalyzedLead,
  AnalyzedProperty,
  AnalyzedInteraction,
} from "./drive-ai-analyzer";
import type { EntityCreated } from "./drive-queue";
import { normalizePhone } from "./import-pipeline";

export interface ImportResult {
  category: "lead" | "property" | "interaction" | "document" | "audio" | "image" | "mixed" | "unknown";
  entities: EntityCreated[];
  errors: string[];
}

// ── Duplicate detection ─────────────────────────────────────────────

async function findLeadByPhone(phone: string): Promise<typeof leads.$inferSelect | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const last9 = normalized.slice(-9);
  const results = await db.query.leads.findMany({
    where: or(
      eq(leads.phone, normalized),
      like(leads.phone, `%${last9}%`),
      eq(leads.phone, normalized.replace("+", ""))
    ),
    limit: 1,
  });
  return results[0] || null;
}

async function findLeadByEmail(email: string): Promise<typeof leads.$inferSelect | null> {
  if (!email) return null;
  const results = await db.query.leads.findMany({
    where: eq(leads.email, email.toLowerCase().trim()),
    limit: 1,
  });
  return results[0] || null;
}

async function findPropertyByReference(reference: string): Promise<typeof properties.$inferSelect | null> {
  if (!reference) return null;
  const results = await db.query.properties.findMany({
    where: eq(properties.reference, reference.trim()),
    limit: 1,
  });
  return results[0] || null;
}

async function findPropertyByAddress(address: string): Promise<typeof properties.$inferSelect | null> {
  if (!address) return null;
  const results = await db.query.properties.findMany({
    where: like(properties.address, `%${address.trim()}%`),
    limit: 1,
  });
  return results[0] || null;
}

// ── Lead import / enrichment ────────────────────────────────────────

async function importLead(lead: AnalyzedLead, sourceNote: string): Promise<number | null> {
  const primaryPhone = lead.phones[0];
  const primaryEmail = lead.emails?.[0];

  let existing = primaryPhone ? await findLeadByPhone(primaryPhone) : null;
  if (!existing && primaryEmail) {
    existing = await findLeadByEmail(primaryEmail);
  }

  const enrichedNotes = [existing?.notes || "", sourceNote, lead.notes || ""]
    .filter(Boolean)
    .join("\n---\n");

  if (existing) {
    await db
      .update(leads)
      .set({
        name: lead.name && lead.name !== existing.name ? lead.name : existing.name,
        email: primaryEmail || existing.email,
        phone: primaryPhone || existing.phone,
        zone: lead.zone || existing.zone,
        budgetMin: lead.budgetMin ?? existing.budgetMin,
        budgetMax: lead.budgetMax ?? existing.budgetMax,
        bedrooms: lead.bedrooms ?? existing.bedrooms,
        bathrooms: lead.bathrooms ?? existing.bathrooms,
        squareMeters: lead.squareMeters ?? existing.squareMeters,
        urgency: lead.urgency || existing.urgency,
        notes: enrichedNotes,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, existing.id));

    // Register enrichment as interaction
    await db.insert(interactions).values({
      leadId: existing.id,
      type: "note",
      direction: "inbound",
      content: `Datos enriquecidos desde Drive. ${sourceNote}`,
      createdAt: new Date(),
    });

    return existing.id;
  }

  const [created] = await db
    .insert(leads)
    .values({
      name: lead.name || (primaryPhone ? `Contacto ${primaryPhone}` : "Contacto sin nombre"),
      email: primaryEmail || null,
      phone: primaryPhone || null,
      source: "import",
      status: "nuevo",
      zone: lead.zone || null,
      budgetMin: lead.budgetMin ?? null,
      budgetMax: lead.budgetMax ?? null,
      bedrooms: lead.bedrooms ?? null,
      bathrooms: lead.bathrooms ?? null,
      squareMeters: lead.squareMeters ?? null,
      urgency: lead.urgency || "media",
      notes: [sourceNote, lead.notes || ""].filter(Boolean).join("\n---\n"),
    } as any)
    .returning();

  await db.insert(interactions).values({
    leadId: created.id,
    type: "note",
    direction: "inbound",
    content: `Lead creado desde Drive. ${sourceNote}`,
    createdAt: new Date(),
  });

  return created.id;
}

// ── Property import / enrichment ────────────────────────────────────

function mapPropertyType(type?: string): typeof properties.$inferSelect.type {
  const valid = [
    "piso",
    "apartamento",
    "casa",
    "duplex",
    "atico",
    "estudio",
    "local",
    "oficina",
    "nave",
    "terreno",
    "garaje",
    "trastero",
    "parking",
  ];
  if (!type) return "piso";
  const normalized = String(type).toLowerCase().trim();
  if (valid.includes(normalized as any)) return normalized as any;
  if (["apartamento", "apto"].includes(normalized)) return "apartamento";
  if (["piso", "flat"].includes(normalized)) return "piso";
  if (["casa", "chalet", "house"].includes(normalized)) return "casa";
  if (["duplex", "dúplex"].includes(normalized)) return "duplex";
  if (["ático", "atico", "penthouse"].includes(normalized)) return "atico";
  if (["estudio", "studio"].includes(normalized)) return "estudio";
  if (["local", "comercial", "shop"].includes(normalized)) return "local";
  if (["oficina", "office"].includes(normalized)) return "oficina";
  if (["nave", "industrial", "warehouse"].includes(normalized)) return "nave";
  if (["terreno", "suelo", "plot", "land"].includes(normalized)) return "terreno";
  if (["parking", "garaje", "garage"].includes(normalized)) return "garaje";
  if (["trastero", "storage"].includes(normalized)) return "trastero";
  return "piso";
}

function mapOperation(op?: string): typeof properties.$inferSelect.operation {
  if (!op) return "venta";
  const v = String(op).toLowerCase();
  if (v.includes("alquiler") || v.includes("rent")) return "alquiler";
  if (v.includes("venta") || v.includes("sale")) return "venta";
  if (v.includes("ambos") || v.includes("both")) return "venta_alquiler";
  return "venta";
}

async function importProperty(prop: AnalyzedProperty, sourceNote: string): Promise<number | null> {
  let existing = prop.reference ? await findPropertyByReference(prop.reference) : null;
  if (!existing && prop.address) {
    existing = await findPropertyByAddress(prop.address);
  }

  const enrichedNotes = [existing?.notes || "", sourceNote, prop.notes || ""]
    .filter(Boolean)
    .join("\n---\n");

  if (existing) {
    await db
      .update(properties)
      .set({
        title: prop.title || existing.title,
        address: prop.address || existing.address,
        zone: prop.zone || existing.zone,
        city: prop.city || existing.city,
        price: prop.price ?? existing.price,
        priceSale: prop.priceSale ?? existing.priceSale,
        monthlyRent: prop.monthlyRent ?? existing.monthlyRent,
        type: mapPropertyType(prop.propertyType || existing.type || undefined),
        operation: mapOperation(prop.operation || existing.operation || undefined),
        bedrooms: prop.bedrooms ?? existing.bedrooms,
        bathrooms: prop.bathrooms ?? existing.bathrooms,
        squareMeters: prop.squareMeters ?? existing.squareMeters,
        floor: prop.floor ?? existing.floor,
        hasElevator: prop.hasElevator ?? existing.hasElevator,
        hasTerrace: prop.hasTerrace ?? existing.hasTerrace,
        hasParking: prop.hasParking ?? existing.hasParking,
        hasPool: prop.hasPool ?? existing.hasPool,
        hasGarden: prop.hasGarden ?? existing.hasGarden,
        hasAirConditioning: prop.hasAirConditioning ?? existing.hasAirConditioning,
        hasHeating: prop.hasHeating ?? existing.hasHeating,
        hasFurniture: prop.hasFurniture ?? existing.hasFurniture,
        yearBuilt: prop.yearBuilt ?? existing.yearBuilt,
        condition: prop.condition || existing.condition,
        energyRating: prop.energyRating || existing.energyRating,
        ownerName: prop.ownerName || existing.ownerName,
        ownerPhone: prop.ownerPhones?.[0] || existing.ownerPhone,
        ownerEmail: prop.ownerEmails?.[0] || existing.ownerEmail,
        notes: enrichedNotes,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, existing.id));
    return existing.id;
  }

  const reference = prop.reference || `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [created] = await db
    .insert(properties)
    .values({
      reference,
      title: prop.title || prop.address || reference,
      description: prop.notes || null,
      type: mapPropertyType(prop.propertyType),
      status: "disponible",
      operation: mapOperation(prop.operation),
      price: prop.price ?? null,
      priceSale: prop.priceSale ?? null,
      monthlyRent: prop.monthlyRent ?? null,
      zone: prop.zone || "Murcia",
      address: prop.address || null,
      city: prop.city || "Murcia",
      bedrooms: prop.bedrooms ?? null,
      bathrooms: prop.bathrooms ?? null,
      squareMeters: prop.squareMeters ?? null,
      floor: prop.floor ?? null,
      hasElevator: prop.hasElevator ?? false,
      hasTerrace: prop.hasTerrace ?? false,
      hasParking: prop.hasParking ?? false,
      hasPool: prop.hasPool ?? false,
      hasGarden: prop.hasGarden ?? false,
      hasAirConditioning: prop.hasAirConditioning ?? false,
      hasHeating: prop.hasHeating ?? false,
      hasFurniture: prop.hasFurniture ?? false,
      yearBuilt: prop.yearBuilt ?? null,
      condition: prop.condition || null,
      energyRating: prop.energyRating || null,
      ownerName: prop.ownerName || null,
      ownerPhone: prop.ownerPhones?.[0] || null,
      ownerEmail: prop.ownerEmails?.[0] || null,
      notes: [sourceNote, prop.notes || ""].filter(Boolean).join("\n---\n"),
    } as any)
    .returning();

  return created.id;
}

// ── Linking by phone ────────────────────────────────────────────────

async function linkLeadToProperties(leadId: number, phone: string): Promise<number> {
  const normalized = normalizePhone(phone);
  if (!normalized) return 0;
  const last9 = normalized.slice(-9);

  const matchingProps = await db.query.properties.findMany({
    where: or(
      eq(properties.ownerPhone, normalized),
      like(properties.ownerPhone, `%${last9}%`),
      eq(properties.ownerPhone, normalized.replace("+", ""))
    ),
    limit: 10,
  });

  let linked = 0;
  for (const prop of matchingProps) {
    const exists = await db.query.leadProperties.findFirst({
      where: and(eq(leadProperties.leadId, leadId), eq(leadProperties.propertyId, prop.id)),
    });
    if (!exists) {
      await db.insert(leadProperties).values({ leadId, propertyId: prop.id });
      linked++;
    }
  }
  return linked;
}

async function linkPropertyToLeads(propertyId: number, phone: string): Promise<number> {
  const normalized = normalizePhone(phone);
  if (!normalized) return 0;
  const last9 = normalized.slice(-9);

  const matchingLeads = await db.query.leads.findMany({
    where: or(
      eq(leads.phone, normalized),
      like(leads.phone, `%${last9}%`),
      eq(leads.phone, normalized.replace("+", ""))
    ),
    limit: 10,
  });

  let linked = 0;
  for (const lead of matchingLeads) {
    const exists = await db.query.leadProperties.findFirst({
      where: and(eq(leadProperties.leadId, lead.id), eq(leadProperties.propertyId, propertyId)),
    });
    if (!exists) {
      await db.insert(leadProperties).values({ leadId: lead.id, propertyId });
      linked++;
    }
  }
  return linked;
}

// ── Interaction import ──────────────────────────────────────────────

async function importInteraction(
  interaction: AnalyzedInteraction,
  sourceNote: string
): Promise<number | null> {
  let leadId: number | null = null;
  if (interaction.phone) {
    const lead = await findLeadByPhone(interaction.phone);
    if (lead) leadId = lead.id;
  }

  // If no lead found, create a placeholder lead for the phone
  if (!leadId && interaction.phone) {
    leadId = await importLead(
      {
        phones: [interaction.phone],
        notes: `Lead creado automáticamente desde interacción. ${sourceNote}`,
      },
      sourceNote
    );
  }

  if (!leadId) return null;

  const [created] = await db
    .insert(interactions)
    .values({
      leadId,
      type: interaction.type,
      direction: interaction.direction,
      content: [interaction.content, sourceNote].filter(Boolean).join("\n---\n"),
      duration: interaction.duration,
      createdAt: interaction.date ? new Date(interaction.date) : new Date(),
    } as any)
    .returning();

  return created.id;
}

// ── Document import ─────────────────────────────────────────────────

async function importDocument(
  driveFileId: string,
  fileName: string,
  mimeType: string,
  webViewLink: string | null,
  docType: "contract" | "invoice" | "report" | "photo" | "identity" | "other",
  entityType?: "lead" | "property" | "operation",
  entityId?: number
): Promise<number> {
  const [created] = await db
    .insert(documents)
    .values({
      name: fileName,
      type: docType,
      entityType,
      entityId,
      filePath: `drive://${driveFileId}`,
      mimeType,
      driveFileId,
      driveFileUrl: webViewLink,
    } as any)
    .returning();
  return created.id;
}

// ── Audio transcription record ──────────────────────────────────────

async function importTranscription(
  driveFileId: string,
  fileName: string,
  mimeType: string,
  transcript: string,
  duration?: number,
  leadId?: number | null
): Promise<number> {
  const [created] = await db
    .insert(transcriptions)
    .values({
      fileName,
      driveFileId,
      mimeType,
      transcript,
      duration: duration || 0,
      wordCount: transcript.split(/\s+/).length,
      leadId: leadId || null,
      processingStatus: "completed",
      processedAt: new Date(),
    } as any)
    .returning();
  return created.id;
}

async function importTranscriptionAnalysis(
  transcriptionId: number,
  analysis: DriveAIAnalysis
): Promise<number> {
  const [created] = await db
    .insert(transcriptionAnalysis)
    .values({
      transcriptionId,
      sentiment: analysis.confidence === "high" ? "positive" : "neutral",
      sentimentScore: analysis.confidence === "high" ? 0.8 : 0.5,
      topicsJson: JSON.stringify([analysis.documentType, ...(analysis.leads[0]?.notes ? ["lead"] : [])]),
      actionItemsJson: JSON.stringify([]),
      summary: analysis.summary,
      keyPointsJson: JSON.stringify(analysis.phones),
      recommendationsJson: JSON.stringify(analysis.notes ? [analysis.notes] : []),
    } as any)
    .returning();
  return created.id;
}

// ── Main import orchestrator ────────────────────────────────────────

export async function importAnalyzedDriveFile(
  queueItem: typeof driveImportQueue.$inferSelect,
  analysis: DriveAIAnalysis,
  extracted: { text: string; isAudio: boolean; duration?: number }
): Promise<ImportResult> {
  const entities: EntityCreated[] = [];
  const errors: string[] = [];
  const sourceNote = `Fuente: Drive (${queueItem.name})`;

  // 1. Import leads
  const leadIdMap = new Map<string, number>(); // phone -> leadId
  for (const lead of analysis.leads) {
    try {
      const id = await importLead(lead, sourceNote);
      if (id) {
        entities.push({ type: "lead", id });
        if (lead.phones[0]) leadIdMap.set(lead.phones[0], id);
      }
    } catch (err) {
      errors.push(`Lead error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2. Import properties
  const propertyIdMap = new Map<string, number>(); // address/ref -> propertyId
  for (const prop of analysis.properties) {
    try {
      const id = await importProperty(prop, sourceNote);
      if (id) {
        entities.push({ type: "property", id });
        if (prop.reference) propertyIdMap.set(prop.reference, id);
        if (prop.address) propertyIdMap.set(prop.address, id);

        // Link property to leads by owner phone
        if (prop.ownerPhones?.[0]) {
          await linkPropertyToLeads(id, prop.ownerPhones[0]);
        }
      }
    } catch (err) {
      errors.push(`Property error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Link leads to properties by phone
  for (const [phone, leadId] of leadIdMap.entries()) {
    try {
      await linkLeadToProperties(leadId, phone);
    } catch (err) {
      errors.push(`Link error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 4. Import interactions
  for (const interaction of analysis.interactions) {
    try {
      const id = await importInteraction(interaction, sourceNote);
      if (id) entities.push({ type: "interaction", id });
    } catch (err) {
      errors.push(`Interaction error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 5. Audio: create transcription record + analysis
  let transcriptionId: number | null = null;
  if (extracted.isAudio && extracted.text) {
    try {
      const leadId = interactionLeadId(analysis) || null;
      transcriptionId = await importTranscription(
        queueItem.driveFileId,
        queueItem.name,
        queueItem.mimeType,
        extracted.text,
        extracted.duration,
        leadId
      );
      entities.push({ type: "transcription", id: transcriptionId });
      await importTranscriptionAnalysis(transcriptionId, analysis);
    } catch (err) {
      errors.push(`Transcription error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 6. Documents (including images)
  const docType = documentTypeFromAnalysis(analysis);
  const primaryEntity = primaryEntityFromEntities(entities);
  try {
    const docId = await importDocument(
      queueItem.driveFileId,
      queueItem.name,
      queueItem.mimeType,
      queueItem.webViewLink,
      docType,
      primaryEntity?.type,
      primaryEntity?.id
    );
    entities.push({ type: "document", id: docId });
  } catch (err) {
    errors.push(`Document error: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Determine category
  const category = determineCategory(analysis, extracted.isAudio, queueItem.mimeType);

  return { category, entities, errors };
}

function interactionLeadId(analysis: DriveAIAnalysis): number | null {
  // We don't have the DB id here; interaction import already created it.
  // This helper is intentionally simple; the transcription can be linked later if needed.
  return null;
}

function documentTypeFromAnalysis(
  analysis: DriveAIAnalysis
): "contract" | "invoice" | "report" | "photo" | "identity" | "other" {
  if (analysis.documentType === "contrato") return "contract";
  if (analysis.documentType === "factura") return "invoice";
  if (analysis.documentType === "foto") return "photo";
  if (["contactos", "inmuebles", "mixto"].includes(analysis.documentType)) return "report";
  return "other";
}

function primaryEntityFromEntities(
  entities: EntityCreated[]
): { type: "lead" | "property" | "operation"; id: number } | undefined {
  const property = entities.find((e) => e.type === "property");
  if (property) return { type: "property", id: property.id };
  const lead = entities.find((e) => e.type === "lead");
  if (lead) return { type: "lead", id: lead.id };
  return undefined;
}

function determineCategory(
  analysis: DriveAIAnalysis,
  isAudio: boolean,
  mimeType: string
): ImportResult["category"] {
  if (isAudio) return "audio";
  if (mimeType.startsWith("image/")) return "image";
  if (analysis.leads.length > 0 && analysis.properties.length > 0) return "mixed";
  if (analysis.properties.length > 0) return "property";
  if (analysis.leads.length > 0) return "lead";
  if (analysis.interactions.length > 0) return "interaction";
  if (analysis.documents.length > 0) return "document";
  return "unknown";
}
