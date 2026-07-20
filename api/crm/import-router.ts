/**
 * Import Router — PromurciaOS CRM
 * tRPC endpoints for document import: upload, parse preview, confirm import,
 * history, details, and statistics.
 * All user-facing text in SPANISH.
 */

import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { importJobs, importRows } from "../../db/schema";
import { parseExcel, getExcelPreview } from "../processors/excel-processor";
import { parseCSV, getCSVPreview } from "../processors/csv-processor";
import { parsePDF } from "../processors/pdf-processor";
import { runImportPipeline, normalizePhone } from "../processors/import-pipeline";

// ── Shared Validation ───────────────────────────────────────────────

const fileTypeEnum = z.enum(["xlsx", "csv", "pdf"]);

const importConfigSchema = z.object({
  skipDuplicates: z.boolean().default(true),
  autoLink: z.boolean().default(true),
  assignTo: z.number().optional(),
  defaultSource: z.string().default("import"),
  defaultStatus: z.string().default("nuevo"),
});

// ── Helper: Decode base64 buffer ────────────────────────────────────

function decodeBase64File(base64Data: string): Buffer {
  // Handle data URI prefix (data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,...)
  const base64 = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
  return Buffer.from(base64, "base64");
}

// ── Router ──────────────────────────────────────────────────────────

export const importRouter = createTRPCRouter({
  // ── Upload & Parse (returns preview) ──────────────────────────────
  parseFile: comercialProcedure
    .input(
      z.object({
        fileName: z.string().min(1, "El nombre del archivo es obligatorio"),
        fileType: fileTypeEnum,
        fileData: z.string().min(1, "El contenido del archivo es obligatorio"), // base64
        config: importConfigSchema.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { fileName, fileType, fileData } = input;
      const buffer = decodeBase64File(fileData);

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (buffer.length > maxSize) {
        throw new Error("El archivo excede el límite de 50MB");
      }

      let preview: Array<{
        row: number;
        type: string;
        data: Record<string, unknown>;
        sheet?: string;
      }> = [];

      let detectedType: "contacts" | "properties" | "mixed" | "unknown" = "unknown";
      let totalRows = 0;
      let confidence = 0;
      let sheets: Array<{ name: string; headers: string[] }> = [];

      try {
        if (fileType === "xlsx") {
          const excelResult = parseExcel(buffer);
          detectedType =
            excelResult.sheets.length === 1
              ? excelResult.sheets[0].detectedType
              : classifyMixedType(excelResult.sheets.map((s) => s.detectedType));
          totalRows = excelResult.totalRows;
          confidence = excelResult.confidence;

          // Build preview (first 10 rows across all sheets)
          let globalRow = 0;
          for (const sheet of excelResult.sheets) {
            sheets.push({ name: sheet.name, headers: Object.keys(sheet.rows[0] || {}) });
            for (let i = 0; i < Math.min(10, sheet.rows.length); i++) {
              globalRow++;
              preview.push({
                row: globalRow,
                type: sheet.detectedType,
                data: sheet.rows[i],
                sheet: sheet.name,
              });
            }
          }
        } else if (fileType === "csv") {
          const csvResult = parseCSV(buffer);
          detectedType = csvResult.detectedType;
          totalRows = csvResult.rowCount;
          confidence = csvResult.confidence;
          sheets = [{ name: "Datos CSV", headers: csvResult.headers }];

          preview = csvResult.rows.slice(0, 10).map((row, i) => ({
            row: i + 1,
            type: csvResult.detectedType,
            data: row,
          }));
        } else if (fileType === "pdf") {
          const pdfResult = await parsePDF(buffer);
          detectedType = pdfResult.phones.length > 0 ? "contacts" : "unknown";
          totalRows = pdfResult.phones.length;
          confidence = pdfResult.confidence;
          sheets = [{ name: "Contenido PDF", headers: ["campo", "valor"] }];

          // Build preview from extracted data
          preview = [
            { row: 1, type: "pdf_info", data: { tipoDocumento: pdfResult.documentType, paginas: pdfResult.pages } },
            { row: 2, type: "contacts", data: { telefonos: pdfResult.phones, emails: pdfResult.emails } },
            { row: 3, type: "financial", data: { precios: pdfResult.prices.map((p) => `${p.amount} ${p.currency}`) } },
            { row: 4, type: "metadata", data: { referencias: pdfResult.references, fechas: pdfResult.dates } },
            { row: 5, type: "extracted", data: pdfResult.extractedData },
          ];
        }

        return {
          success: true,
          fileName,
          fileType,
          fileSize: buffer.length,
          detectedType,
          totalRows,
          confidence,
          preview,
          sheets,
          config: input.config || {},
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error al procesar el archivo";
        throw new Error(`Error de procesamiento: ${msg}`);
      }
    }),

  // ── Confirm Import (executes the actual import) ───────────────────
  confirmImport: comercialProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileType: fileTypeEnum,
        fileData: z.string().min(1), // base64
        config: importConfigSchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { fileName, fileType, fileData } = input;
      const buffer = decodeBase64File(fileData);

      const config = {
        skipDuplicates: input.config?.skipDuplicates ?? true,
        autoLink: input.config?.autoLink ?? true,
        assignTo: input.config?.assignTo || ctx.user?.id,
        defaultSource: "import",
        defaultStatus: "nuevo",
      };

      try {
        const result = await runImportPipeline(buffer, fileType, config);

        return {
          success: true,
          jobId: result.jobId,
          message: `Importación completada: ${result.imported} creados, ${result.duplicates} duplicados, ${result.errors} errores, ${result.linked} vinculados`,
          summary: {
            totalRows: result.totalRows,
            imported: result.imported,
            duplicates: result.duplicates,
            errors: result.errors,
            linked: result.linked,
          },
          details: result.details.slice(0, 100), // Limit details in response
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error en la importación";
        throw new Error(`Error de importación: ${msg}`);
      }
    }),

  // ── Get Import History ────────────────────────────────────────────
  getHistory: readOnlyProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(50).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20 } = input || {};
      const offset = (page - 1) * limit;

      const [items, countResult] = await Promise.all([
        db.query.importJobs.findMany({
          orderBy: [desc(importJobs.createdAt)],
          limit,
          offset,
        }),
        db.select({ count: sql<number>`count(*)` }).from(importJobs),
      ]);

      return {
        items: items.map((job) => ({
          ...job,
          config: safeJsonParse(job.config),
        })),
        total: countResult[0]?.count ?? 0,
        page,
        limit,
      };
    }),

  // ── Get Import Details ────────────────────────────────────────────
  getDetails: readOnlyProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const job = await db.query.importJobs.findFirst({
        where: eq(importJobs.id, input.jobId),
      });

      if (!job) {
        throw new Error("Importación no encontrada");
      }

      const rows = await db.query.importRows.findMany({
        where: eq(importRows.importId, input.jobId),
        orderBy: [importRows.rowNumber],
      });

      return {
        job: {
          ...job,
          config: safeJsonParse(job.config),
        },
        rows: rows.map((row) => ({
          ...row,
          rawData: safeJsonParse(row.rawData),
          normalizedData: safeJsonParse(row.normalizedData),
        })),
      };
    }),

  // ── Get Import Statistics ─────────────────────────────────────────
  getStats: readOnlyProcedure.query(async () => {
    const [totalImports] = await db
      .select({ count: sql<number>`count(*)` })
      .from(importJobs);

    const [completedImports] = await db
      .select({ count: sql<number>`count(*)` })
      .from(importJobs)
      .where(eq(importJobs.status, "completed"));

    const [totalImported] = await db
      .select({ total: sql<number>`COALESCE(SUM(${importJobs.imported}), 0)` })
      .from(importJobs);

    const [totalDuplicates] = await db
      .select({ total: sql<number>`COALESCE(SUM(${importJobs.duplicates}), 0)` })
      .from(importJobs);

    const [totalLinked] = await db
      .select({ total: sql<number>`COALESCE(SUM(${importJobs.linked}), 0)` })
      .from(importJobs);

    // Recent imports
    const recentImports = await db.query.importJobs.findMany({
      orderBy: [desc(importJobs.createdAt)],
      limit: 5,
    });

    // Imports by type
    const byType = await db
      .select({
        type: importJobs.detectedType,
        count: sql<number>`count(*)`,
      })
      .from(importJobs)
      .groupBy(importJobs.detectedType);

    // Imports by file type
    const byFileType = await db
      .select({
        fileType: importJobs.fileType,
        count: sql<number>`count(*)`,
      })
      .from(importJobs)
      .groupBy(importJobs.fileType);

    return {
      totalImports: totalImports?.count ?? 0,
      completedImports: completedImports?.count ?? 0,
      totalImported: totalImported?.total ?? 0,
      totalDuplicates: totalDuplicates?.total ?? 0,
      totalLinked: totalLinked?.total ?? 0,
      successRate:
        totalImports && totalImports.count > 0
          ? Math.round(((completedImports?.count ?? 0) / totalImports.count) * 100)
          : 0,
      recentImports: recentImports.map((job) => ({
        ...job,
        config: safeJsonParse(job.config),
      })),
      byType,
      byFileType,
    };
  }),

  // ── Delete Import Record ──────────────────────────────────────────
  delete: comercialProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(importRows).where(eq(importRows.importId, input.jobId));
      await db.delete(importJobs).where(eq(importJobs.id, input.jobId));
      return { success: true };
    }),

  // ── Retry Failed Import ───────────────────────────────────────────
  retry: comercialProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      const job = await db.query.importJobs.findFirst({
        where: eq(importJobs.id, input.jobId),
      });

      if (!job) throw new Error("Importación no encontrada");
      if (job.status !== "error" && job.status !== "cancelled") {
        throw new Error("Solo se pueden reintentar importaciones fallidas o canceladas");
      }

      await db
        .update(importJobs)
        .set({ status: "pending", errorLog: null, updatedAt: new Date() })
        .where(eq(importJobs.id, input.jobId));

      // Delete previous row records
      await db.delete(importRows).where(eq(importRows.importId, input.jobId));

      return { success: true, message: "Importación reiniciada. Sube el archivo de nuevo." };
    }),

  // ── Preview only (no import) ──────────────────────────────────────
  preview: comercialProcedure
    .input(
      z.object({
        fileType: fileTypeEnum,
        fileData: z.string().min(1),
        maxRows: z.number().min(1).max(50).default(10),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = decodeBase64File(input.fileData);
      const { fileType, maxRows } = input;

      if (fileType === "xlsx") {
        const result = getExcelPreview(buffer, maxRows);
        return {
          type: "xlsx",
          sheets: result.map((s) => ({
            name: s.name,
            headers: s.headers,
            preview: s.preview,
            totalRows: s.totalRows,
          })),
        };
      } else if (fileType === "csv") {
        const result = getCSVPreview(buffer, maxRows);
        return {
          type: "csv",
          headers: result.headers,
          preview: result.preview,
          totalRows: result.totalRows,
          delimiter: result.delimiter,
          encoding: result.encoding,
        };
      } else if (fileType === "pdf") {
        const result = await parsePDF(buffer);
        return {
          type: "pdf",
          pages: result.pages,
          documentType: result.documentType,
          phones: result.phones,
          emails: result.emails,
          prices: result.prices,
          references: result.references,
          extractedData: result.extractedData,
        };
      }

      throw new Error("Tipo de archivo no soportado para previsualización");
    }),

  // ── Get Phone Lookup (utility for auto-link debugging) ────────────
  phoneLookup: readOnlyProcedure
    .input(z.object({ phone: z.string().min(1) }))
    .query(async ({ input }) => {
      const normalized = normalizePhone(input.phone);
      if (!normalized) return { normalized: null, leads: [], properties: [] };

      const last9 = normalized.slice(-9);

      const matchingLeads = await db.query.leads.findMany({
        where: eq(leads.phone, normalized) || like(leads.phone, `%${last9}%`),
        limit: 10,
      });

      const matchingProperties = await db.query.properties.findMany({
        where:
          eq(properties.ownerPhone, normalized) || like(properties.ownerPhone, `%${last9}%`),
        limit: 10,
      });

      return { normalized, leads: matchingLeads, properties: matchingProperties };
    }),
});

// ── Helpers ─────────────────────────────────────────────────────────

function safeJsonParse(str: string | null): Record<string, unknown> | null {
  if (!str) return null;
  try {
    return JSON.parse(str) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function classifyMixedType(types: Array<string>): "contacts" | "properties" | "mixed" | "unknown" {
  const counts: Record<string, number> = {};
  for (const t of types) {
    counts[t] = (counts[t] || 0) + 1;
  }
  if (counts.contacts && counts.properties) return "mixed";
  if (counts.contacts) return "contacts";
  if (counts.properties) return "properties";
  return "unknown";
}
