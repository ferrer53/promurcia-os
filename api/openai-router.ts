import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "process.env.OPENAI_API_KEY",
});

const ANALYSIS_PROMPT = `Eres un analista experto en inmobiliaria española. Tu tarea es analizar el siguiente contenido extraído de documentos (CSV, Excel, PDF, imágenes OCR, etc.) y extraer toda la información relevante sobre inmuebles, contactos y teléfonos.

IMPORTANTE: Responde ÚNICAMENTE con un JSON válido. No incluyas explicaciones, markdown ni texto adicional fuera del JSON.

El JSON debe tener esta estructura exacta:
{
  "properties": [
    {
      "address": "dirección completa del inmueble",
      "price": 150000,
      "bedrooms": 3,
      "bathrooms": 2,
      "sqm": 120,
      "propertyType": "Piso|Chalet|Ático|Dúplex|Estudio|Local|Nave|Parcela|Garaje|Trastero",
      "phones": ["+34612345678"],
      "confidence": "high|medium|low",
      "notes": "notas adicionales sobre el inmueble"
    }
  ],
  "contacts": [
    {
      "name": "Nombre completo del contacto",
      "phones": ["+34612345678"],
      "emails": ["email@ejemplo.com"],
      "role": "Propietario|Comprador|Inquilino|Agente|Desconocido",
      "confidence": "high|medium|low"
    }
  ],
  "phones": [
    {
      "number": "+34612345678",
      "context": "contexto donde aparece el teléfono",
      "type": "fijo|movil|desconocido"
    }
  ],
  "documents": [
    {
      "type": "contactos|inmuebles|contrato|factura|correo|otro",
      "description": "descripción breve del documento",
      "confidence": "high|medium|low"
    }
  ],
  "summary": {
    "totalProperties": 0,
    "totalContacts": 0,
    "totalPhones": 0,
    "documentType": "contactos|inmuebles|mixto|contrato|otro",
    "notes": "observaciones generales del análisis"
  }
}

REGLAS DE NORMALIZACIÓN DE TELÉFONOS:
- Siempre usa formato +34 seguido de 9 dígitos: +346XXXXXXXX o +349XXXXXXXX
- Los móviles españoles empiezan por 6, 7, 8 o 9
- Fijos empiezan por 8 o 9 (seguido de 8 dígitos más)

REGLAS DE EXTRACCIÓN DE INMUEBLES:
- Busca direcciones completas: Calle, Avenida, Plaza, Urbanización, etc.
- Extrae precios en euros (ignora precios en otras monedas)
- Habitaciones, baños y metros cuadrados cuando estén disponibles
- El tipo de inmueble en español

REGLAS DE EXTRACCIÓN DE CONTACTOS:
- Nombres completos de personas
- Emails asociados
- Roles si están claros (propietario, agente, interesado, etc.)

Si no encuentras un campo, usa null para números y "" para strings. Los arrays deben estar vacíos [] si no hay datos.

Contenido a analizar:
`;

export const openaiRouter = createRouter({
  analyzeDocument: publicQuery
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        content: z.string().max(15000),
        source: z.enum(["csv", "excel", "pdf", "image", "txt", "json"]).optional(),
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
              content:
                "Eres un analista de datos inmobiliarios español. Extraes información estructurada de documentos desorganizados. Responde SIEMPRE en JSON válido.",
            },
            {
              role: "user",
              content: ANALYSIS_PROMPT + `\n\n--- ARCHIVO: ${input.fileName} ---\nTIPO: ${input.fileType}${input.source ? ` (${input.source})` : ""}\n\n${input.content.substring(0, 12000)}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        });

        const rawContent = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(rawContent);

        // Normalize all phones
        const normalizePhone = (phone: string): string => {
          const digits = phone.replace(/\D/g, "");
          if (digits.length === 9) return `+34${digits}`;
          if (digits.length === 11 && digits.startsWith("34")) return `+${digits}`;
          if (digits.length === 12 && digits.startsWith("0034")) return `+34${digits.slice(4)}`;
          return phone;
        };

        // Normalize phones in all entities
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
        if (parsed.phones) {
          parsed.phones.forEach((p: any) => {
            if (p.number) p.number = normalizePhone(p.number);
          });
        }

        return {
          success: true,
          data: parsed,
          model: response.model,
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
          error: error.message || "Error en análisis con OpenAI",
          data: null,
          model: "gpt-4o-mini",
          tokens: { prompt: 0, completion: 0, total: 0 },
          elapsedMs: Date.now() - startTime,
        };
      }
    }),

  analyzeBatch: publicQuery
    .input(
      z.object({
        documents: z.array(
          z.object({
            fileName: z.string(),
            fileType: z.string(),
            content: z.string().max(8000),
            source: z.enum(["csv", "excel", "pdf", "image", "txt", "json"]).optional(),
          })
        ).max(5),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];

      for (const doc of input.documents) {
        const startTime = Date.now();
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Eres un analista de datos inmobiliarios español. Extraes información estructurada de documentos desorganizados. Responde SIEMPRE en JSON válido.",
              },
              {
                role: "user",
                content:
                  ANALYSIS_PROMPT +
                  `\n\n--- ARCHIVO: ${doc.fileName} ---\nTIPO: ${doc.fileType}${doc.source ? ` (${doc.source})` : ""}\n\n${doc.content.substring(0, 6000)}`,
              },
            ],
            temperature: 0.2,
            max_tokens: 3000,
            response_format: { type: "json_object" },
          });

          const rawContent = response.choices[0]?.message?.content || "{}";
          const parsed = JSON.parse(rawContent);

          results.push({
            fileName: doc.fileName,
            success: true,
            data: parsed,
            tokens: response.usage?.total_tokens || 0,
            elapsedMs: Date.now() - startTime,
          });
        } catch (error: any) {
          results.push({
            fileName: doc.fileName,
            success: false,
            error: error.message || "Error",
            data: null,
            tokens: 0,
            elapsedMs: Date.now() - startTime,
          });
        }
      }

      return { results };
    }),
});
