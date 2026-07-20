/**
 * Import Pipeline — PromurciaOS Document Processing Pipeline
 * Coordinates the full import process: parse → transform → validate → import → link
 */

import { parseExcel } from "./excel-processor";
import { parseCSV } from "./csv-processor";
import { parsePDF } from "./pdf-processor";
import { db } from "../../db/connection";
import { leads, properties, leadProperties, importJobs, importRows, interactions } from "../../db/schema";
import { eq, like, or, and } from "drizzle-orm";
import type { ImportJob, InsertImportJob } from "../../db/schema";

// ── Types ───────────────────────────────────────────────────────────

export interface ImportPipelineResult {
  jobId: number;
  totalRows: number;
  imported: number;
  duplicates: number;
  errors: number;
  linked: number;
  details: Array<{
    row: number;
    type: "lead" | "property";
    action: "created" | "duplicate" | "error" | "linked" | "skipped";
    data: Record<string, unknown>;
    error?: string;
    entityId?: number;
  }>;
}

export interface ImportOptions {
  skipDuplicates?: boolean;
  autoLink?: boolean;
  assignTo?: number; // user ID
  defaultSource?: string;
  defaultStatus?: string;
}

// ── Phone Normalization ─────────────────────────────────────────────

/**
 * Normalize Spanish phone numbers to +34XXXXXXXXX format.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const digits = String(phone).replace(/\D/g, "");

  // Already has country code: 34XXXXXXXXX (11 digits)
  if (digits.length === 11 && digits.startsWith("34")) {
    return `+${digits}`;
  }

  // Has country code with other prefix
  if (digits.length === 11) {
    return `+${digits}`;
  }

  // Spanish mobile/landline without prefix (9 digits starting with 6,7,8,9)
  if (digits.length === 9 && /^[6789]/.test(digits)) {
    return `+34${digits}`;
  }

  // International with + prefix stripped
  if (digits.length > 9) {
    return `+${digits}`;
  }

  // Too short
  if (digits.length < 9) {
    return digits.length > 0 ? digits : null;
  }

  return `+34${digits.slice(-9)}`;
}

// ── Duplicate Detection ─────────────────────────────────────────────

async function findExistingLeadByPhone(phone: string): Promise<number | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  // Search for exact match or partial match
  const results = await db.query.leads.findMany({
    where: or(
      like(leads.phone, `%${normalized.slice(-9)}%`),
      eq(leads.phone, normalized),
      eq(leads.phone, normalized.replace("+", ""))
    ),
    limit: 1,
  });

  return results[0]?.id ?? null;
}

async function findExistingLeadByEmail(email: string): Promise<number | null> {
  if (!email || email.trim() === "") return null;

  const results = await db.query.leads.findMany({
    where: eq(leads.email, email.toLowerCase().trim()),
    limit: 1,
  });

  return results[0]?.id ?? null;
}

async function findExistingPropertyByReference(reference: string): Promise<number | null> {
  if (!reference || reference.trim() === "") return null;

  const results = await db.query.properties.findMany({
    where: eq(properties.reference, reference.trim()),
    limit: 1,
  });

  return results[0]?.id ?? null;
}

async function findExistingPropertyByAddress(address: string): Promise<number | null> {
  if (!address || address.trim() === "") return null;

  const results = await db.query.properties.findMany({
    where: like(properties.address, `%${address.trim()}%`),
    limit: 1,
  });

  return results[0]?.id ?? null;
}

// ── Row Transformation ──────────────────────────────────────────────

interface TransformedRow {
  type: "lead" | "property" | "mixed" | "unknown";
  leadData: Record<string, unknown> | null;
  propertyData: Record<string, unknown> | null;
  raw: Record<string, unknown>;
}

function transformRow(
  row: Record<string, unknown>,
  detectedType: "contacts" | "properties" | "mixed" | "unknown",
  options: ImportOptions
): TransformedRow {
  const result: TransformedRow = {
    type: "unknown",
    leadData: null,
    propertyData: null,
    raw: row,
  };

  const keys = Object.keys(row);
  const hasPhone = keys.includes("phone") && row.phone;
  const hasName = keys.includes("name") && row.name;
  const hasEmail = keys.includes("email") && row.email;
  const hasAddress = keys.includes("address") && row.address;
  const hasPrice = keys.includes("price") && row.price;
  const hasPropertyRef = keys.includes("propertyRef") && row.propertyRef;

  const isContact = hasPhone || hasName || hasEmail;
  const isProperty = hasAddress || hasPrice || hasPropertyRef || keys.includes("bedrooms");

  // Build lead data
  if (isContact || detectedType === "contacts" || detectedType === "mixed") {
    const name = String(row.name || row.cliente || row.contacto || row.nombre || "").trim();
    const phone = normalizePhone(row.phone || row.telefono || row.tlf || row.movil || null);
    const email = row.email
      ? String(row.email).toLowerCase().trim()
      : null;

    if (name || phone || email) {
      result.leadData = {
        name: name || (phone ? `Contacto ${phone}` : email ? `Contacto ${email}` : "Sin nombre"),
        phone,
        email,
        source: options.defaultSource || "import",
        status: options.defaultStatus || "nuevo",
        zone: row.zone || row.zona || row.barrio || row.area || row.localidad || null,
        operationType: mapOperationType(row.operationType || row.operacion || row.tipo),
        budgetMin: toNumber(row.budgetMin) || toNumber(row.price) || null,
        budgetMax: null,
        bedrooms: toNumber(row.bedrooms),
        bathrooms: toNumber(row.bathrooms),
        squareMeters: toNumber(row.squareMeters),
        urgency: mapUrgency(row.urgency),
        notes: row.notes || row.notas || row.comentarios || row.observaciones || null,
        assignedTo: options.assignTo || null,
      };
      result.type = "lead";
    }
  }

  // Build property data
  if (isProperty || detectedType === "properties" || detectedType === "mixed") {
    const ref = String(row.propertyRef || row.referencia || row.ref || row.codigo || "").trim();
    const title = String(row.title || row.titulo || row.descripcion_corta || ref || "").trim();
    const address = String(row.address || row.direccion || row.calle || "").trim();

    if (ref || title || address || hasPrice) {
      result.propertyData = {
        reference: ref || `AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: title || address || ref || "Propiedad sin título",
        description: row.notes || row.notas || row.comentarios || row.observaciones || null,
        type: mapPropertyType(row.propertyType || row.tipo || row.tipologia),
        status: "disponible",
        operation: mapPropertyOperation(row.operation || row.operacion || row.modalidad),
        price: toNumber(row.price) || 0,
        zone: String(row.zone || row.zona || row.barrio || row.area || row.localidad || "Murcia").trim(),
        address: address || null,
        city: String(row.city || row.ciudad || row.poblacion || "Murcia").trim(),
        postalCode: row.postalCode ? String(row.postalCode) : null,
        bedrooms: toNumber(row.bedrooms),
        bathrooms: toNumber(row.bathrooms),
        squareMeters: toNumber(row.squareMeters),
        floor: toNumber(row.floor),
        hasElevator: toBoolean(row.elevator || row.ascensor),
        hasTerrace: toBoolean(row.terrace || row.terraza || row.balcon),
        hasParking: toBoolean(row.garage || row.garaje || row.parking),
        hasPool: toBoolean(row.pool || row.piscina),
        hasGarden: toBoolean(row.garden || row.jardin),
        hasAirConditioning: toBoolean(row.airConditioning || row.aireAcondicionado || row.climatizado),
        hasHeating: toBoolean(row.heating || row.calefaccion),
        hasFurniture: toBoolean(row.furnished || row.amueblado || row.mobiliario),
        yearBuilt: toNumber(row.yearBuilt || row.ano || row.antiguedad),
        condition: mapCondition(row.condition || row.estado),
        energyRating: row.energyCert ? String(row.energyCert) : null,
        ownerName: row.owner ? String(row.owner) : null,
        ownerPhone: normalizePhone(row.ownerPhone || row.telefonoPropietario || null),
        ownerEmail: row.ownerEmail ? String(row.ownerEmail).toLowerCase() : null,
        monthlyRent: toNumber(row.monthlyRent || row.alquilerMensual),
        notes: row.notes || row.notas || row.comentarios || null,
      };
      result.type = result.type === "lead" ? "mixed" : "property";
    }
  }

  return result;
}

// ── Value Mappers ───────────────────────────────────────────────────

function mapOperationType(value: unknown): string | null {
  if (!value) return null;
  const v = String(value).toLowerCase().trim();
  if (v.includes("alquiler") || v.includes("rent") || v.includes("alq")) return "alquiler";
  if (v.includes("compra") || v.includes("buy") || v.includes("venta")) return "compra";
  if (v.includes("venta")) return "venta";
  return null;
}

function mapUrgency(value: unknown): string {
  if (!value) return "media";
  const v = String(value).toLowerCase().trim();
  if (v.includes("alta") || v.includes("high") || v.includes("urgente")) return "alta";
  if (v.includes("baja") || v.includes("low")) return "baja";
  return "media";
}

function mapPropertyType(value: unknown): string {
  if (!value) return "apartamento";
  const v = String(value).toLowerCase().trim();
  if (v.includes("apartamento") || v.includes("apto") || v.includes("piso") || v.includes("flat"))
    return "apartamento";
  if (v.includes("casa") || v.includes("chalet") || v.includes("house")) return "casa";
  if (v.includes("duplex") || v.includes("dúplex")) return "duplex";
  if (v.includes("ático") || v.includes("atico") || v.includes("penthouse")) return "atico";
  if (v.includes("local") || v.includes("comercial") || v.includes("shop")) return "local";
  if (v.includes("oficina") || v.includes("office")) return "oficina";
  if (v.includes("nave") || v.includes("industrial") || v.includes("warehouse")) return "nave";
  if (v.includes("terreno") || v.includes("suelo") || v.includes("plot") || v.includes("land"))
    return "terreno";
  if (v.includes("parking") || v.includes("garaje") || v.includes("garage")) return "parking";
  if (v.includes("trastero") || v.includes("storage")) return "trastero";
  return "apartamento";
}

function mapPropertyOperation(value: unknown): string {
  if (!value) return "alquiler";
  const v = String(value).toLowerCase().trim();
  if (v.includes("alquiler") || v.includes("rent") || v.includes("alq")) return "alquiler";
  if (v.includes("venta") || v.includes("sale") || v.includes("sell")) return "venta";
  if (v.includes("ambos") || v.includes("both")) return "ambos";
  return "alquiler";
}

function mapCondition(value: unknown): string | null {
  if (!value) return null;
  const v = String(value).toLowerCase().trim();
  if (v.includes("nuevo") || v.includes("new")) return "nuevo";
  if (v.includes("reforma") || v.includes("renovated")) return "reforma";
  if (v.includes("buen") || v.includes("good")) return "bueno";
  if (v.includes("reformar") || v.includes("renovate")) return "a_reformar";
  return null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const str = String(value).replace(/[\s.]/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function toBoolean(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value > 0 ? 1 : 0;
  const str = String(value).toLowerCase().trim();
  if (["si", "sí", "yes", "true", "1", "x"].includes(str)) return 1;
  return 0;
}

// ── Lead Creator ────────────────────────────────────────────────────

async function createLead(data: Record<string, unknown>): Promise<number> {
  const result = await db
    .insert(leads)
    .values({
      name: String(data.name || ""),
      email: data.email ? String(data.email) : null,
      phone: data.phone ? String(data.phone) : null,
      source: data.source ? String(data.source) : "import",
      status: data.status ? String(data.status) : "nuevo",
      operationType: data.operationType as "compra" | "alquiler" | "venta" | null,
      zone: data.zone ? String(data.zone) : null,
      budgetMin: data.budgetMin as number | null,
      budgetMax: data.budgetMax as number | null,
      bedrooms: data.bedrooms as number | null,
      bathrooms: data.bathrooms as number | null,
      squareMeters: data.squareMeters as number | null,
      urgency: data.urgency as "alta" | "media" | "baja" | null,
      notes: data.notes ? String(data.notes) : null,
      assignedTo: data.assignedTo as number | null,
    } as const)
    .returning();

  return result[0].id;
}

// ── Property Creator ─────────────────────────────────────────────────

async function createProperty(data: Record<string, unknown>): Promise<number> {
  const result = await db
    .insert(properties)
    .values({
      reference: String(data.reference || ""),
      title: String(data.title || ""),
      description: data.description ? String(data.description) : null,
      type: data.type as
        | "apartamento"
        | "casa"
        | "duplex"
        | "atico"
        | "local"
        | "oficina"
        | "nave"
        | "terreno"
        | "parking"
        | "trastero",
      status: (data.status as "disponible" | "reservado" | "alquilado" | "vendido" | "inactivo") || "disponible",
      operation: (data.operation as "alquiler" | "venta" | "ambos") || "alquiler",
      price: data.price as number,
      zone: String(data.zone || "Murcia"),
      address: data.address ? String(data.address) : null,
      city: data.city ? String(data.city) : "Murcia",
      postalCode: data.postalCode ? String(data.postalCode) : null,
      bedrooms: data.bedrooms as number | null,
      bathrooms: data.bathrooms as number | null,
      squareMeters: data.squareMeters as number | null,
      floor: data.floor as number | null,
      hasElevator: data.hasElevator as number | null,
      hasTerrace: data.hasTerrace as number | null,
      hasParking: data.hasParking as number | null,
      hasPool: data.hasPool as number | null,
      hasGarden: data.hasGarden as number | null,
      hasAirConditioning: data.hasAirConditioning as number | null,
      hasHeating: data.hasHeating as number | null,
      hasFurniture: data.hasFurniture as number | null,
      yearBuilt: data.yearBuilt as number | null,
      condition: data.condition as "nuevo" | "reforma" | "bueno" | "a_reformar" | null,
      energyRating: data.energyRating ? String(data.energyRating) : null,
      ownerName: data.ownerName ? String(data.ownerName) : null,
      ownerPhone: data.ownerPhone ? String(data.ownerPhone) : null,
      ownerEmail: data.ownerEmail ? String(data.ownerEmail) : null,
      monthlyRent: data.monthlyRent as number | null,
      notes: data.notes ? String(data.notes) : null,
    } as const)
    .returning();

  return result[0].id;
}

// ── Phone-based Auto-Linking ────────────────────────────────────────

async function autoLinkByPhone(leadId: number, phone: string): Promise<number | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  // Find properties with matching owner phone
  const matchingProperties = await db.query.properties.findMany({
    where: or(
      like(properties.ownerPhone, `%${normalized.slice(-9)}%`),
      eq(properties.ownerPhone, normalized),
      eq(properties.ownerPhone, normalized.replace("+", ""))
    ),
    limit: 5,
  });

  let linkedCount = 0;
  for (const prop of matchingProperties) {
    // Check if already linked
    const existing = await db.query.leadProperties.findFirst({
      where: and(eq(leadProperties.leadId, leadId), eq(leadProperties.propertyId, prop.id)),
    });

    if (!existing) {
      await db.insert(leadProperties).values({
        leadId,
        propertyId: prop.id,
      });
      linkedCount++;
    }
  }

  return linkedCount;
}

async function autoLinkPropertyToLeads(propertyId: number, ownerPhone: string): Promise<number> {
  const normalized = normalizePhone(ownerPhone);
  if (!normalized) return 0;

  const matchingLeads = await db.query.leads.findMany({
    where: or(
      like(leads.phone, `%${normalized.slice(-9)}%`),
      eq(leads.phone, normalized),
      eq(leads.phone, normalized.replace("+", ""))
    ),
    limit: 5,
  });

  let linkedCount = 0;
  for (const lead of matchingLeads) {
    const existing = await db.query.leadProperties.findFirst({
      where: and(eq(leadProperties.leadId, lead.id), eq(leadProperties.propertyId, propertyId)),
    });

    if (!existing) {
      await db.insert(leadProperties).values({
        leadId: lead.id,
        propertyId,
      });
      linkedCount++;
    }
  }

  return linkedCount;
}

// ── Job Management ──────────────────────────────────────────────────

export async function createImportJob(
  fileName: string,
  fileType: "xlsx" | "csv" | "pdf",
  fileSize: number,
  options: ImportOptions,
  startedBy?: number
): Promise<number> {
  const result = await db
    .insert(importJobs)
    .values({
      fileName,
      fileType,
      fileSize,
      status: "pending",
      config: JSON.stringify(options),
      startedBy: startedBy || null,
    } as InsertImportJob)
    .returning();

  return result[0].id;
}

export async function updateImportJobStatus(
  jobId: number,
  status: ImportJob["status"],
  updates?: Partial<ImportJob>
): Promise<void> {
  await db
    .update(importJobs)
    .set({
      status,
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(importJobs.id, jobId));
}

// ── Main Pipeline ───────────────────────────────────────────────────

/**
 * Run the full import pipeline on a file buffer.
 */
export async function runImportPipeline(
  fileBuffer: Buffer,
  fileType: "xlsx" | "csv" | "pdf",
  options: ImportOptions = {}
): Promise<ImportPipelineResult> {
  const defaults: ImportOptions = {
    skipDuplicates: true,
    autoLink: true,
    assignTo: undefined,
    defaultSource: "import",
    defaultStatus: "nuevo",
  };
  const opts = { ...defaults, ...options };

  // Step 1: Create import job
  const jobId = await createImportJob(
    `import-${Date.now()}.${fileType}`,
    fileType,
    fileBuffer.length,
    opts,
    opts.assignTo
  );

  const result: ImportPipelineResult = {
    jobId,
    totalRows: 0,
    imported: 0,
    duplicates: 0,
    errors: 0,
    linked: 0,
    details: [],
  };

  try {
    await updateImportJobStatus(jobId, "parsing");

    // Step 2: Parse file
    let allRows: Array<Record<string, unknown>> = [];
    let detectedType: "contacts" | "properties" | "mixed" | "unknown" = "unknown";
    let confidence = 0;

    if (fileType === "xlsx") {
      const excelResult = parseExcel(fileBuffer);
      // Flatten all sheets
      allRows = excelResult.sheets.flatMap((s) => s.rows);
      // Weighted detected type by row count
      const sheetTypes = excelResult.sheets.map((s) => ({ type: s.detectedType, count: s.rowCount }));
      const contactsCount = sheetTypes.filter((s) => s.type === "contacts").reduce((a, s) => a + s.count, 0);
      const propertiesCount = sheetTypes.filter((s) => s.type === "properties").reduce((a, s) => a + s.count, 0);
      const mixedCount = sheetTypes.filter((s) => s.type === "mixed").reduce((a, s) => a + s.count, 0);

      if (contactsCount > propertiesCount && contactsCount > mixedCount) detectedType = "contacts";
      else if (propertiesCount > contactsCount && propertiesCount > mixedCount) detectedType = "properties";
      else if (mixedCount > 0) detectedType = "mixed";

      confidence = excelResult.confidence;
    } else if (fileType === "csv") {
      const csvResult = parseCSV(fileBuffer);
      allRows = csvResult.rows;
      detectedType = csvResult.detectedType;
      confidence = csvResult.confidence;
    } else if (fileType === "pdf") {
      const pdfResult = await parsePDF(fileBuffer);
      // For PDFs, we extract phone numbers and create leads from them
      if (pdfResult.phones.length > 0) {
        const pdfRows: Array<Record<string, unknown>> = [];
        for (const phone of pdfResult.phones) {
          pdfRows.push({
            phone,
            name: pdfResult.extractedData.cliente || pdfResult.extractedData.propietario || null,
            email: pdfResult.emails[0] || null,
            notes: `Extraído de PDF (${pdfResult.documentType}): ${pdfResult.text.slice(0, 500)}`,
          });
        }
        // Also add structured data
        if (Object.keys(pdfResult.extractedData).length > 0) {
          pdfRows.push({
            ...pdfResult.extractedData,
            notes: `Datos extraídos de PDF (${pdfResult.documentType})`,
          });
        }
        allRows = pdfRows;
        detectedType = pdfResult.phones.length > 3 ? "contacts" : "mixed";
      }
      confidence = pdfResult.confidence;
    }

    result.totalRows = allRows.length;

    await updateImportJobStatus(jobId, "importing", {
      detectedType,
      confidence,
      totalRows: allRows.length,
    });

    // Step 3: Transform and import each row
    let rowNumber = 0;
    for (const row of allRows) {
      rowNumber++;

      try {
        const transformed = transformRow(row, detectedType, opts);

        // Track raw data
        await db.insert(importRows).values({
          importId: jobId,
          rowNumber,
          entityType: transformed.type === "mixed" ? "mixed" : transformed.type,
          rawData: JSON.stringify(row),
          normalizedData: JSON.stringify({
            lead: transformed.leadData,
            property: transformed.propertyData,
          }),
        });

        // Import lead
        if (transformed.leadData) {
          const leadPhone = transformed.leadData.phone as string | null;
          const leadEmail = transformed.leadData.email as string | null;

          // Check duplicates
          let existingLeadId: number | null = null;
          if (leadPhone) {
            existingLeadId = await findExistingLeadByPhone(leadPhone);
          }
          if (!existingLeadId && leadEmail) {
            existingLeadId = await findExistingLeadByEmail(leadEmail);
          }

          if (existingLeadId && opts.skipDuplicates) {
            result.duplicates++;
            result.details.push({
              row: rowNumber,
              type: "lead",
              action: "duplicate",
              data: transformed.leadData,
              entityId: existingLeadId,
            });
          } else {
            const leadId = await createLead(transformed.leadData);
            result.imported++;
            result.details.push({
              row: rowNumber,
              type: "lead",
              action: "created",
              data: transformed.leadData,
              entityId: leadId,
            });

            // Auto-link by phone
            if (opts.autoLink && leadPhone) {
              const linkedCount = await autoLinkByPhone(leadId, leadPhone);
              if (linkedCount > 0) {
                result.linked += linkedCount;
                // Create interaction record
                await db.insert(interactions).values({
                  type: "nota",
                  leadId,
                  content: `Importado automáticamente. Vinculado a ${linkedCount} propiedad(es) por número de teléfono coincidente.`,
                  direction: "entrante",
                  createdAt: new Date(),
                });
              }
            }
          }
        }

        // Import property
        if (transformed.propertyData) {
          const propRef = transformed.propertyData.reference as string;
          const propAddress = transformed.propertyData.address as string | null;
          const ownerPhone = transformed.propertyData.ownerPhone as string | null;

          let existingPropId: number | null = null;
          if (propRef) {
            existingPropId = await findExistingPropertyByReference(propRef);
          }
          if (!existingPropId && propAddress) {
            existingPropId = await findExistingPropertyByAddress(propAddress);
          }

          if (existingPropId && opts.skipDuplicates) {
            result.duplicates++;
            result.details.push({
              row: rowNumber,
              type: "property",
              action: "duplicate",
              data: transformed.propertyData,
              entityId: existingPropId,
            });
          } else {
            const propId = await createProperty(transformed.propertyData);
            result.imported++;
            result.details.push({
              row: rowNumber,
              type: "property",
              action: "created",
              data: transformed.propertyData,
              entityId: propId,
            });

            // Auto-link property to leads by owner phone
            if (opts.autoLink && ownerPhone) {
              const linkedCount = await autoLinkPropertyToLeads(propId, ownerPhone);
              if (linkedCount > 0) {
                result.linked += linkedCount;
              }
            }
          }
        }

        // Update row status
        await db
          .update(importRows)
          .set({
            status: "created",
            entityType: transformed.type === "mixed" ? "mixed" : transformed.type,
          })
          .where(and(eq(importRows.importId, jobId), eq(importRows.rowNumber, rowNumber)));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Error desconocido";
        result.errors++;
        result.details.push({
          row: rowNumber,
          type: "lead",
          action: "error",
          data: row,
          error: errorMsg,
        });

        await db
          .update(importRows)
          .set({
            status: "error",
            errorMessage: errorMsg,
          })
          .where(and(eq(importRows.importId, jobId), eq(importRows.rowNumber, rowNumber)));
      }
    }

    // Step 4: Finalize
    await updateImportJobStatus(jobId, "completed", {
      imported: result.imported,
      duplicates: result.duplicates,
      errors: result.errors,
      linked: result.linked,
      completedAt: new Date(),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Error crítico en el pipeline de importación";
    await updateImportJobStatus(jobId, "error", {
      errorLog: errorMsg,
    });
    throw new Error(`Error en la importación: ${errorMsg}`);
  }

  return result;
}

// ── Preview (no DB changes) ─────────────────────────────────────────

/**
 * Generate a preview of what would be imported without writing to the database.
 */
export function generateImportPreview(
  fileBuffer: Buffer,
  fileType: "xlsx" | "csv" | "pdf"
): Array<{
  row: number;
  type: string;
  preview: Record<string, unknown>;
  wouldCreate: boolean;
}> {
  const preview: Array<{
    row: number;
    type: string;
    preview: Record<string, unknown>;
    wouldCreate: boolean;
  }> = [];

  if (fileType === "xlsx") {
    const excelResult = parseExcel(fileBuffer);
    let rowNum = 0;
    for (const sheet of excelResult.sheets) {
      for (const row of sheet.rows) {
        rowNum++;
        const transformed = transformRow(row, sheet.detectedType, {});
        if (transformed.leadData || transformed.propertyData) {
          preview.push({
            row: rowNum,
            type: transformed.type,
            preview: transformed.leadData || transformed.propertyData || row,
            wouldCreate: true,
          });
        }
      }
    }
  } else if (fileType === "csv") {
    const csvResult = parseCSV(fileBuffer);
    csvResult.rows.forEach((row, i) => {
      const transformed = transformRow(row, csvResult.detectedType, {});
      if (transformed.leadData || transformed.propertyData) {
        preview.push({
          row: i + 1,
          type: transformed.type,
          preview: transformed.leadData || transformed.propertyData || row,
          wouldCreate: true,
        });
      }
    });
  } else if (fileType === "pdf") {
    // PDF preview is async, return empty for now
  }

  return preview;
}
