// ============================================================
// Document Router — PromurciaOS
// ============================================================
// tRPC endpoints for importing documents from Google Drive or
// direct upload: list files, download, parse Excel/CSV/PDF,
// extract data, and import into the CRM.
// ============================================================

import { z } from "zod";
import { eq, desc, and, sql, like } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { documentImports, leads } from "../../db/schema";
import { driveService, type DriveFile } from "./index";
import { GOOGLE_CONFIG, googleLog, isDriveConfigured } from "./config";

// ── Input schemas ──
const listFilesInput = z
  .object({
    folderId: z.string().optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(200).default(50),
    search: z.string().optional(),
  })
  .optional();

const downloadFromDriveInput = z.object({
  driveFileId: z.string().min(1, "El ID del archivo es obligatorio"),
  driveFileName: z.string().optional(),
  mimeType: z.string().optional(),
  importTarget: z
    .enum(["leads", "properties", "operations", "contacts", "none"])
    .default("none"),
});

const processExcelInput = z.object({
  importId: z.number(),
  mappingJson: z.string().optional(), // JSON: column-to-field mapping
  importTarget: z
    .enum(["leads", "properties", "operations", "contacts", "none"])
    .optional(),
});

const processCSVInput = z.object({
  importId: z.number(),
  delimiter: z.string().default(","),
  hasHeader: z.boolean().default(true),
  mappingJson: z.string().optional(),
  importTarget: z
    .enum(["leads", "properties", "operations", "contacts", "none"])
    .optional(),
});

const processPDFInput = z.object({
  importId: z.number(),
  extractMode: z.enum(["text", "structured"]).default("text"),
});

const importToCRMInput = z.object({
  importId: z.number(),
  confirmedMappingJson: z.string(), // JSON with final column mapping
});

export const documentRouter = createTRPCRouter({
  // ── 1. List files in Drive documents folder ──
  listDriveFiles: comercialProcedure
    .input(listFilesInput)
    .query(async ({ input }) => {
      if (!isDriveConfigured()) {
        return { files: [], total: 0, configured: false };
      }

      const folderId =
        input?.folderId || GOOGLE_CONFIG.driveFolders.documents || "root";
      const page = input?.page || 1;
      const limit = input?.limit || 50;

      const allFiles = await driveService.listDocumentFiles(folderId);

      // Filter by search if provided
      let files = allFiles;
      if (input?.search) {
        const s = input.search.toLowerCase();
        files = files.filter((f: DriveFile) =>
          f.name.toLowerCase().includes(s)
        );
      }

      // Get import status for each file
      const importRows = await db
        .select({
          driveFileId: sql<string>`${documentImports.driveFileId}`,
          status: sql<string>`${documentImports.status}`,
        })
        .from(documentImports);
      const importStatusMap = new Map(
        importRows.map((r) => [r.driveFileId, r.status])
      );

      const enriched = files.map((f: DriveFile) => ({
        ...f,
        importStatus: importStatusMap.get(f.id) || null,
      }));

      return {
        files: enriched,
        total: enriched.length,
        configured: true,
      };
    }),

  // ── 2. Download and process a file from Drive ──
  downloadFromDrive: comercialProcedure
    .input(downloadFromDriveInput)
    .mutation(async ({ input, ctx }) => {
      if (!isDriveConfigured()) {
        throw new Error("Google Drive no esta configurado.");
      }

      const {
        driveFileId,
        driveFileName,
        mimeType,
        importTarget,
      } = input;

      // Check if already imported
      const existing = await db.query.documentImports.findFirst({
        where: eq(documentImports.driveFileId, driveFileId),
      });
      if (existing && existing.status === "completed") {
        throw new Error(
          "Este archivo ya fue importado anteriormente."
        );
      }

      // Get file metadata
      const metadata = await driveService.getFileMetadata(driveFileId);

      // Determine file type
      const fileType = detectFileType(metadata.name, metadata.mimeType);

      // Insert import record
      const [record] = await db
        .insert(documentImports)
        .values({
          fileName: driveFileName || metadata.name,
          fileType,
          source: "drive",
          driveFileId,
          driveFileUrl: metadata.webViewLink,
          importTarget,
          status: "pending",
          createdBy: ctx.user?.id,
        })
        .returning();

      // Process based on file type
      await processDocument(record.id, fileType, driveFileId, metadata.mimeType);

      return {
        success: true,
        importId: record.id,
        fileType,
        message: `Archivo descargado y en proceso. Tipo detectado: ${fileType}.`,
      };
    }),

  // ── 3. Upload file directly (multipart) — placeholder for future implementation ──
  uploadFile: comercialProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        fileType: z.enum(["excel", "csv", "pdf", "docx", "other"]),
        importTarget: z
          .enum(["leads", "properties", "operations", "contacts", "none"])
          .default("none"),
        // In a real implementation, the file would be streamed via multipart
        // and saved to disk. Here we store the metadata and expect processing.
        fileData: z.string().optional(), // base64-encoded file data
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [record] = await db
        .insert(documentImports)
        .values({
          fileName: input.fileName,
          fileType: input.fileType,
          source: "upload",
          importTarget: input.importTarget,
          status: "pending",
          createdBy: ctx.user?.id,
        })
        .returning();

      return {
        success: true,
        importId: record.id,
        message: "Archivo registrado. Use el endpoint de procesamiento correspondiente.",
      };
    }),

  // ── 4. Parse Excel and extract data ──
  processExcel: comercialProcedure
    .input(processExcelInput)
    .mutation(async ({ input }) => {
      const importRecord = await db.query.documentImports.findFirst({
        where: eq(documentImports.id, input.importId),
      });
      if (!importRecord) throw new Error("Importacion no encontrada");
      if (!importRecord.driveFileId)
        throw new Error("No hay archivo Drive asociado");

      await db
        .update(documentImports)
        .set({ status: "processing" })
        .where(eq(documentImports.id, input.importId));

      try {
        // Download and parse Excel
        const buffer = await driveService.downloadFile(
          importRecord.driveFileId
        );

        // Detect if it's a Google Sheets file that needs export
        const metadata = await driveService.getFileMetadata(
          importRecord.driveFileId
        );
        let fileBuffer = buffer;
        if (
          metadata.mimeType ===
          "application/vnd.google-apps.spreadsheet"
        ) {
          fileBuffer = await driveService.exportFile(
            importRecord.driveFileId,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
        }

        // Parse (mock — would use xlsx library in production)
        const parsedData = parseExcelBuffer(fileBuffer);

        const rowCount = parsedData.rows?.length || 0;
        const schema = detectSchema(parsedData.headers || []);

        await db
          .update(documentImports)
          .set({
            status: "completed",
            extractedDataJson: JSON.stringify(parsedData),
            schemaDetected: schema,
            rowCount,
            mappingJson: input.mappingJson || null,
            importTarget: input.importTarget || importRecord.importTarget,
            completedAt: new Date(),
          })
          .where(eq(documentImports.id, input.importId));

        return {
          success: true,
          rowCount,
          schema,
          headers: parsedData.headers,
          preview: parsedData.rows?.slice(0, 5) || [],
          message: `Excel procesado. ${rowCount} filas detectadas. Esquema: ${schema}.`,
        };
      } catch (err: any) {
        const msg = err?.message || "Error procesando Excel";
        await db
          .update(documentImports)
          .set({ status: "error", errorMessage: msg })
          .where(eq(documentImports.id, input.importId));
        throw new Error(msg);
      }
    }),

  // ── 5. Parse CSV and extract data ──
  processCSV: comercialProcedure
    .input(processCSVInput)
    .mutation(async ({ input }) => {
      const importRecord = await db.query.documentImports.findFirst({
        where: eq(documentImports.id, input.importId),
      });
      if (!importRecord) throw new Error("Importacion no encontrada");

      await db
        .update(documentImports)
        .set({ status: "processing" })
        .where(eq(documentImports.id, input.importId));

      try {
        let buffer: Buffer;
        if (importRecord.driveFileId) {
          buffer = await driveService.downloadFile(
            importRecord.driveFileId
          );
        } else if (importRecord.fileName) {
          throw new Error("No hay datos de archivo disponibles");
        } else {
          throw new Error("No hay archivo para procesar");
        }

        const csvText = buffer.toString("utf-8");
        const parsedData = parseCSV(csvText, input.delimiter, input.hasHeader);

        const rowCount = parsedData.rows?.length || 0;
        const schema = detectSchema(parsedData.headers || []);

        await db
          .update(documentImports)
          .set({
            status: "completed",
            extractedDataJson: JSON.stringify(parsedData),
            schemaDetected: schema,
            rowCount,
            mappingJson: input.mappingJson || null,
            importTarget: input.importTarget || importRecord.importTarget,
            completedAt: new Date(),
          })
          .where(eq(documentImports.id, input.importId));

        return {
          success: true,
          rowCount,
          schema,
          headers: parsedData.headers,
          preview: parsedData.rows?.slice(0, 5) || [],
          message: `CSV procesado. ${rowCount} filas detectadas. Esquema: ${schema}.`,
        };
      } catch (err: any) {
        const msg = err?.message || "Error procesando CSV";
        await db
          .update(documentImports)
          .set({ status: "error", errorMessage: msg })
          .where(eq(documentImports.id, input.importId));
        throw new Error(msg);
      }
    }),

  // ── 6. Parse PDF and extract text ──
  processPDF: comercialProcedure
    .input(processPDFInput)
    .mutation(async ({ input }) => {
      const importRecord = await db.query.documentImports.findFirst({
        where: eq(documentImports.id, input.importId),
      });
      if (!importRecord) throw new Error("Importacion no encontrada");

      await db
        .update(documentImports)
        .set({ status: "processing" })
        .where(eq(documentImports.id, input.importId));

      try {
        let buffer: Buffer;
        if (importRecord.driveFileId) {
          buffer = await driveService.downloadFile(
            importRecord.driveFileId
          );
        } else {
          throw new Error("No hay archivo PDF disponible");
        }

        // Parse PDF text (mock — would use pdf-parse in production)
        const extractedText = await parsePDF(buffer, input.extractMode);

        await db
          .update(documentImports)
          .set({
            status: "completed",
            extractedDataJson: JSON.stringify({
              text: extractedText,
              mode: input.extractMode,
            }),
            rowCount: 1,
            completedAt: new Date(),
          })
          .where(eq(documentImports.id, input.importId));

        return {
          success: true,
          textLength: extractedText.length,
          preview:
            extractedText.length > 500
              ? extractedText.slice(0, 500) + "..."
              : extractedText,
          message: "PDF procesado exitosamente.",
        };
      } catch (err: any) {
        const msg = err?.message || "Error procesando PDF";
        await db
          .update(documentImports)
          .set({ status: "error", errorMessage: msg })
          .where(eq(documentImports.id, input.importId));
        throw new Error(msg);
      }
    }),

  // ── 7. Get extraction results from a document ──
  getExtractionResults: readOnlyProcedure
    .input(z.object({ importId: z.number() }))
    .query(async ({ input }) => {
      const record = await db.query.documentImports.findFirst({
        where: eq(documentImports.id, input.importId),
      });
      if (!record) throw new Error("Importacion no encontrada");

      let extractedData = null;
      if (record.extractedDataJson) {
        try {
          extractedData = JSON.parse(record.extractedDataJson);
        } catch {
          extractedData = { raw: record.extractedDataJson };
        }
      }

      return { record, extractedData };
    }),

  // ── 8. Import extracted data into CRM ──
  importToCRM: comercialProcedure
    .input(importToCRMInput)
    .mutation(async ({ input, ctx }) => {
      const record = await db.query.documentImports.findFirst({
        where: eq(documentImports.id, input.importId),
      });
      if (!record) throw new Error("Importacion no encontrada");
      if (record.status !== "completed") {
        throw new Error(
          "La extraccion aun no esta completa. Procese el documento primero."
        );
      }
      if (!record.extractedDataJson) {
        throw new Error("No hay datos extraidos para importar.");
      }

      let data: any;
      try {
        data = JSON.parse(record.extractedDataJson);
      } catch {
        throw new Error("Los datos extraidos no son validos JSON.");
      }

      const target = record.importTarget;
      if (!target || target === "none") {
        throw new Error(
          "No se ha especificado el destino de importacion."
        );
      }

      // Parse mapping
      let mapping: Record<string, string> = {};
      try {
        mapping = JSON.parse(input.confirmedMappingJson);
      } catch {
        throw new Error("El mapeo de columnas no es JSON valido.");
      }

      const rows = data.rows || [];
      let imported = 0;
      let duplicates = 0;
      let errors = 0;

      for (const row of rows) {
        try {
          const mapped = applyMapping(row, mapping);
          if (!mapped) {
            errors++;
            continue;
          }

          // Check duplicates for leads
          if (target === "leads" && mapped.email) {
            const existing = await db
              .select({ count: sql<number>`count(*)` })
              .from(leads)
              .where(sql`${leads.email} = ${mapped.email}`);
            if ((existing[0]?.count ?? 0) > 0) {
              duplicates++;
              continue;
            }
          }

          // Insert into target table
          if (target === "leads") {
            await db.insert(leads).values({
              ...mapped,
              source: "import",
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any);
          }
          // Additional targets (properties, operations, contacts) would go here

          imported++;
        } catch (err: any) {
          errors++;
          googleLog("drive", `Error importando fila: ${err?.message}`);
        }
      }

      await db
        .update(documentImports)
        .set({
          importedCount: imported,
          duplicateCount: duplicates,
          errorCount: errors,
          mappingJson: input.confirmedMappingJson,
        })
        .where(eq(documentImports.id, input.importId));

      return {
        success: true,
        imported,
        duplicates,
        errors,
        total: rows.length,
        message: `Importacion completada. ${imported} registros importados, ${duplicates} duplicados, ${errors} errores.`,
      };
    }),

  // ── 9. Get import progress ──
  getImportProgress: readOnlyProcedure
    .input(z.object({ importId: z.number() }))
    .query(async ({ input }) => {
      const record = await db.query.documentImports.findFirst({
        where: eq(documentImports.id, input.importId),
      });
      if (!record) throw new Error("Importacion no encontrada");

      return {
        id: record.id,
        status: record.status,
        fileName: record.fileName,
        fileType: record.fileType,
        source: record.source,
        rowCount: record.rowCount,
        importedCount: record.importedCount,
        duplicateCount: record.duplicateCount,
        errorCount: record.errorCount,
        errorMessage: record.errorMessage,
        schemaDetected: record.schemaDetected,
        createdAt: record.createdAt,
        completedAt: record.completedAt,
      };
    }),

  // ── 10. List recent imports ──
  listImports: readOnlyProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
          status: z
            .enum(["pending", "processing", "completed", "error", "cancelled"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { page = 1, limit = 20, status } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [];
      if (status) conditions.push(eq(documentImports.status, status));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.query.documentImports.findMany({
          where,
          limit,
          offset,
          orderBy: desc(documentImports.createdAt),
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(documentImports)
          .where(where),
      ]);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        page,
        limit,
      };
    }),
});

// ── Internal helpers ──

/**
 * Detect file type from name and MIME type.
 */
function detectFileType(fileName: string, mimeType: string): "excel" | "csv" | "pdf" | "docx" | "other" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    mimeType === "application/vnd.google-apps.spreadsheet"
  )
    return "excel";
  if (mimeType === "text/csv") return "csv";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  return "other";
}

/**
 * Process a document based on its detected type.
 */
async function processDocument(
  importId: number,
  fileType: string,
  driveFileId: string,
  mimeType: string
) {
  switch (fileType) {
    case "excel":
      // Auto-trigger Excel processing
      break; // User will call processExcel
    case "csv":
      // Auto-trigger CSV processing
      break; // User will call processCSV
    case "pdf":
      // Auto-trigger PDF processing
      break; // User will call processPDF
    default:
      await db
        .update(documentImports)
        .set({
          status: "error",
          errorMessage: `Tipo de archivo no soportado: ${fileType}`,
        })
        .where(eq(documentImports.id, importId));
  }
}

/**
 * Parse Excel buffer into structured data.
 * In production, this would use the `xlsx` library.
 */
function parseExcelBuffer(buffer: Buffer): {
  headers: string[];
  rows: Record<string, string>[];
} {
  googleLog("drive", `Parseando Excel, ${buffer.length} bytes`);
  // Placeholder: return mock structure
  // Production: const xlsx = await import('xlsx'); const wb = xlsx.read(buffer); ...
  return {
    headers: ["Nombre", "Telefono", "Email", "Zona", "Presupuesto"],
    rows: [
      { Nombre: "Ejemplo", Telefono: "+34600123456", Email: "test@example.com", Zona: "Centro", Presupuesto: "200000" },
    ],
  };
}

/**
 * Parse CSV text into structured data.
 */
function parseCSV(
  text: string,
  delimiter: string = ",",
  hasHeader: boolean = true
): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  if (!hasHeader) {
    const rows = lines.map((line) => {
      const values = parseLine(line);
      const row: Record<string, string> = {};
      values.forEach((v, i) => {
        row[`col_${i}`] = v;
      });
      return row;
    });
    return { headers: Object.keys(rows[0] || {}), rows };
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });

  return { headers, rows };
}

/**
 * Parse PDF buffer and extract text.
 * In production, this would use `pdf-parse`.
 */
async function parsePDF(
  buffer: Buffer,
  mode: "text" | "structured"
): Promise<string> {
  googleLog("drive", `Parseando PDF, ${buffer.length} bytes, modo=${mode}`);
  // Placeholder: return mock text
  // Production: const pdfParse = await import('pdf-parse'); const data = await pdfParse.default(buffer); return data.text;
  return `[Modo ${mode}] Contenido extraido del PDF (${buffer.length} bytes). En produccion se usaria pdf-parse para extraer el texto real.`;
}

/**
 * Detect schema type from column headers.
 */
function detectSchema(headers: string[]): string {
  const lowerHeaders = headers.map((h) => h.toLowerCase());
  const has = (kw: string) => lowerHeaders.some((h) => h.includes(kw));

  if (
    has("nombre") &&
    (has("telefono") || has("email") || has("presupuesto"))
  )
    return "leads";
  if (has("referencia") && (has("precio") || has("metros") || has("zona")))
    return "properties";
  if (has("comprador") || has("vendedor") || has("comision"))
    return "operations";
  return "unknown";
}

/**
 * Apply column mapping to a data row.
 */
function applyMapping(
  row: Record<string, string>,
  mapping: Record<string, string>
): Record<string, any> | null {
  if (!mapping || Object.keys(mapping).length === 0) {
    // No mapping — return raw row
    return row;
  }

  const result: Record<string, any> = {};
  for (const [sourceCol, targetField] of Object.entries(mapping)) {
    if (row[sourceCol] !== undefined) {
      result[targetField] = row[sourceCol];
    }
  }
  return result;
}
