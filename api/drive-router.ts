import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// ─── Google Drive Service Account Auth ───────────────────────────

async function getDriveClient() {
  const { google } = await import("googleapis");
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY no configurado");

  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

// ─── OpenAI Analysis Prompt ─────────────────────────────────────

const DRIVE_ANALYSIS_PROMPT = `Eres un analista experto en inmobiliaria española. Analiza el siguiente contenido extraído de un archivo del Google Drive de una inmobiliaria (Promurcia) y extrae toda la información relevante.

Responde ÚNICAMENTE con JSON válido. No incluyas explicaciones, markdown ni texto adicional.

JSON de salida:
{
  "properties": [
    {
      "address": "dirección completa",
      "price": 150000,
      "bedrooms": 3,
      "bathrooms": 2,
      "sqm": 120,
      "propertyType": "Piso|Chalet|Ático|Dúplex|Estudio|Local|Nave|Parcela|Garaje|Trastero|Oficina",
      "phones": ["+34612345678"],
      "confidence": "high|medium|low",
      "notes": "notas adicionales"
    }
  ],
  "contacts": [
    {
      "name": "Nombre completo",
      "phones": ["+34612345678"],
      "emails": ["email@ejemplo.com"],
      "role": "Propietario|Comprador|Inquilino|Agente|Desconocido",
      "confidence": "high|medium|low"
    }
  ],
  "phones": [
    {
      "number": "+34612345678",
      "context": "contexto donde aparece",
      "type": "fijo|movil|desconocido"
    }
  ],
  "summary": {
    "totalProperties": 0,
    "totalContacts": 0,
    "totalPhones": 0,
    "documentType": "contactos|inmuebles|mixto|contrato|factura|correo|otro",
    "notes": "observaciones generales"
  }
}

REGLAS:
- Teléfonos: formato +34 seguido de 9 dígitos
- Precios: solo euros, número entero
- Direcciones: completas con calle/avenida/plaza/urbanización
- Confianza: "high" si datos claros y completos, "medium" si parciales, "low" si inferidos

Contenido del archivo:
`;

// ─── Phone Normalization ─────────────────────────────────────────

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) return `+34${digits}`;
  if (digits.length === 11 && digits.startsWith("34")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("0034")) return `+34${digits.slice(4)}`;
  return phone;
}

// ─── Router ─────────────────────────────────────────────────────

export const driveRouter = createRouter({
  // List files from Google Drive
  listFiles: publicQuery
    .input(
      z.object({
        folderId: z.string().optional(),
        mimeTypes: z.array(z.string()).optional(),
        pageSize: z.number().min(1).max(100).default(50),
        pageToken: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const startTime = Date.now();
      try {
        const drive = await getDriveClient();
        const mimeTypeFilter = input?.mimeTypes
          ? input.mimeTypes.map((m) => `mimeType='${m}'`).join(" or ")
          : "(mimeType='text/csv' or mimeType='application/vnd.google-apps.spreadsheet' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/pdf' or mimeType='image/jpeg' or mimeType='image/png' or mimeType='text/plain' or mimeType='application/json')";

        const folderFilter = input?.folderId
          ? `'${input.folderId}' in parents and `
          : "";

        const res = await drive.files.list({
          q: `${folderFilter}trashed=false and (${mimeTypeFilter})`,
          pageSize: input?.pageSize || 50,
          pageToken: input?.pageToken || undefined,
          fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink, thumbnailLink)",
          orderBy: "modifiedTime desc",
        });

        const files = (res.data.files || []).map((f) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          size: parseInt(f.size || "0"),
          modifiedTime: f.modifiedTime,
          createdTime: f.createdTime,
          webViewLink: f.webViewLink,
          thumbnailLink: f.thumbnailLink,
        }));

        return {
          success: true,
          files,
          nextPageToken: res.data.nextPageToken,
          total: files.length,
          elapsedMs: Date.now() - startTime,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Error al listar archivos de Drive",
          files: [],
          nextPageToken: null,
          total: 0,
          elapsedMs: Date.now() - startTime,
        };
      }
    }),

  // Get file content (for text-based files)
  getFileContent: publicQuery
    .input(z.object({ fileId: z.string(), mimeType: z.string().optional() }))
    .query(async ({ input }) => {
      const startTime = Date.now();
      try {
        const drive = await getDriveClient();

        // For Google Sheets, export as CSV
        if (input.mimeType?.includes("google-apps.spreadsheet")) {
          const res = await drive.files.export(
            { fileId: input.fileId, mimeType: "text/csv" },
            { responseType: "text" }
          );
          return {
            success: true,
            content: String(res.data),
            isText: true,
            elapsedMs: Date.now() - startTime,
          };
        }

        // For PDFs and images, return metadata (can't extract text without OCR)
        if (input.mimeType?.includes("pdf") || input.mimeType?.startsWith("image/")) {
          const res = await drive.files.get({
            fileId: input.fileId,
            fields: "id, name, mimeType, size, description, webViewLink",
          });
          return {
            success: true,
            content: `[${input.mimeType?.includes("pdf") ? "PDF" : "IMAGEN"}: ${res.data.name}]\nEste archivo requiere procesamiento OCR adicional.\nEnlace: ${res.data.webViewLink || ""}`,
            isText: false,
            mimeType: input.mimeType,
            fileInfo: res.data,
            elapsedMs: Date.now() - startTime,
          };
        }

        // For other files, download as text
        const res = await drive.files.get(
          { fileId: input.fileId, alt: "media" },
          { responseType: "text" }
        );
        return {
          success: true,
          content: String(res.data).substring(0, 15000),
          isText: true,
          elapsedMs: Date.now() - startTime,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Error al descargar archivo",
          content: "",
          isText: false,
          elapsedMs: Date.now() - startTime,
        };
      }
    }),

  // Analyze file content with OpenAI
  analyzeWithAI: publicQuery
    .input(
      z.object({
        fileName: z.string(),
        mimeType: z.string(),
        content: z.string().max(12000),
      })
    )
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Eres un analista de datos inmobiliarios español. Extraes información estructurada de documentos desorganizados. Responde SIEMPRE en JSON válido.",
            },
            {
              role: "user",
              content: DRIVE_ANALYSIS_PROMPT + `\n\n--- ARCHIVO: ${input.fileName} ---\nTIPO: ${input.mimeType}\n\n${input.content.substring(0, 10000)}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        });

        const rawContent = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(rawContent);

        // Normalize phones
        if (parsed.properties) {
          parsed.properties.forEach((p: any) => {
            if (p.phones) p.phones = p.phones.map(normalizePhone);
          });
        }
        if (parsed.contacts) {
          parsed.contacts.forEach((c: any) => {
            if (c.phones) c.phones = c.phones.map(normalizePhone);
            if (c.emails) c.emails = c.emails.map((e: string) => e.toLowerCase().trim());
          });
        }
        if (parsed.phones) {
          parsed.phones.forEach((p: any) => {
            if (p.number) p.number = normalizePhone(p.number);
          });
        }

        return {
          success: true,
          data: parsed,
          tokens: {
            prompt: response.usage?.prompt_tokens || 0,
            completion: response.usage?.completion_tokens || 0,
            total: response.usage?.total_tokens || 0,
          },
          elapsedMs: Date.now() - startTime,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || "Error en análisis IA",
          data: null,
          tokens: { prompt: 0, completion: 0, total: 0 },
          elapsedMs: Date.now() - startTime,
        };
      }
    }),

  // Full pipeline: list → extract → analyze
  runExtractionPipeline: publicQuery
    .input(
      z.object({
        fileIds: z.array(z.string()).max(10),
        mimeTypes: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];
      const drive = await getDriveClient();

      for (let i = 0; i < input.fileIds.length; i++) {
        const fileId = input.fileIds[i];
        const mimeType = input.mimeTypes[i];
        const stepStart = Date.now();

        try {
          // Step 1: Get file info
          const fileInfo = await drive.files.get({
            fileId,
            fields: "id, name, mimeType, size",
          });
          const fileName = fileInfo.data.name || "unknown";

          // Step 2: Get content
          let content = "";
          if (mimeType?.includes("google-apps.spreadsheet")) {
            const exportRes = await drive.files.export(
              { fileId, mimeType: "text/csv" },
              { responseType: "text" }
            );
            content = String(exportRes.data).substring(0, 12000);
          } else if (
            mimeType?.includes("csv") ||
            mimeType?.includes("text") ||
            mimeType?.includes("json")
          ) {
            const download = await drive.files.get(
              { fileId, alt: "media" },
              { responseType: "text" }
            );
            content = String(download.data).substring(0, 12000);
          } else {
            content = `[${mimeType}] Archivo binario. Se analizarán metadatos disponibles.`;
          }

          // Step 3: Analyze with AI
          const aiResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "Eres un analista de datos inmobiliarios español. Extraes información estructurada de documentos desorganizados. Responde SIEMPRE en JSON válido.",
              },
              {
                role: "user",
                content:
                  DRIVE_ANALYSIS_PROMPT + `\n\n--- ARCHIVO: ${fileName} ---\nTIPO: ${mimeType}\n\n${content.substring(0, 10000)}`,
              },
            ],
            temperature: 0.2,
            max_tokens: 4000,
            response_format: { type: "json_object" },
          });

          const rawContent = aiResponse.choices[0]?.message?.content || "{}";
          const parsed = JSON.parse(rawContent);

          // Normalize
          if (parsed.properties) {
            parsed.properties.forEach((p: any) => {
              if (p.phones) p.phones = p.phones.map(normalizePhone);
            });
          }
          if (parsed.contacts) {
            parsed.contacts.forEach((c: any) => {
              if (c.phones) c.phones = c.phones.map(normalizePhone);
            });
          }

          results.push({
            fileId,
            fileName,
            mimeType,
            success: true,
            data: parsed,
            tokens: aiResponse.usage?.total_tokens || 0,
            elapsedMs: Date.now() - stepStart,
          });
        } catch (error: any) {
          results.push({
            fileId,
            fileName: "unknown",
            mimeType,
            success: false,
            error: error.message || "Error",
            data: null,
            tokens: 0,
            elapsedMs: Date.now() - stepStart,
          });
        }
      }

      return { results, totalFiles: results.length };
    }),
});
