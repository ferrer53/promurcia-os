/**
 * Drive AI Analyzer — analyze extracted Drive content with OpenAI.
 */

import OpenAI from "openai";
import type { ExtractedContent } from "./drive-content-extractor";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface AnalyzedLead {
  name?: string;
  phones: string[];
  emails?: string[];
  role?: "Propietario" | "Comprador" | "Inquilino" | "Agente" | "Desconocido";
  zone?: string;
  budgetMin?: number;
  budgetMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareMeters?: number;
  urgency?: "alta" | "media" | "baja";
  notes?: string;
}

export interface AnalyzedProperty {
  reference?: string;
  title?: string;
  address?: string;
  zone?: string;
  city?: string;
  price?: number;
  priceSale?: number;
  monthlyRent?: number;
  propertyType?: string;
  operation?: "venta" | "alquiler" | "venta_alquiler";
  bedrooms?: number;
  bathrooms?: number;
  squareMeters?: number;
  floor?: number;
  hasElevator?: boolean;
  hasTerrace?: boolean;
  hasParking?: boolean;
  hasPool?: boolean;
  hasGarden?: boolean;
  hasAirConditioning?: boolean;
  hasHeating?: boolean;
  hasFurniture?: boolean;
  yearBuilt?: number;
  condition?: string;
  energyRating?: string;
  ownerName?: string;
  ownerPhones?: string[];
  ownerEmails?: string[];
  notes?: string;
}

export interface AnalyzedInteraction {
  type: "call" | "whatsapp" | "email" | "note" | "visit";
  direction: "inbound" | "outbound";
  content: string;
  date?: string; // ISO
  phone?: string;
  duration?: number;
}

export interface AnalyzedDocument {
  documentType:
    | "contract"
    | "invoice"
    | "report"
    | "photo"
    | "identity"
    | "other";
  entityType?: "lead" | "property" | "operation";
  entityId?: number;
  summary?: string;
}

export interface DriveAIAnalysis {
  leads: AnalyzedLead[];
  properties: AnalyzedProperty[];
  interactions: AnalyzedInteraction[];
  documents: AnalyzedDocument[];
  phones: string[];
  emails: string[];
  documentType:
    | "contactos"
    | "inmuebles"
    | "mixto"
    | "contrato"
    | "factura"
    | "llamada"
    | "whatsapp"
    | "correo"
    | "foto"
    | "otro";
  summary: string;
  confidence: "high" | "medium" | "low";
  notes: string;
}

const BASE_SYSTEM_PROMPT = `Eres un analista experto en inmobiliaria española. Analiza el contenido de un archivo del Google Drive de la inmobiliaria Promurcia (Murcia, España) y extrae toda la información relevante.

Responde ÚNICAMENTE con JSON válido. No incluyas explicaciones, markdown ni texto adicional.

REGLAS GENERALES:
- Teléfonos españoles: formato +34 seguido de 9 dígitos (ej: +34612345678). Si faltan digitos, omite.
- Emails: en minúsculas.
- Precios: números enteros en euros. Ignora centimos.
- Direcciones: calle/avenida/plaza/urbanización + número + ciudad si aparece.
- Confianza: "high" si datos claros y completos, "medium" si parciales, "low" si inferidos.
- No inventes datos. Si no hay información, devuelve arrays vacíos.

JSON de salida:
{
  "leads": [
    {
      "name": "Nombre completo",
      "phones": ["+34612345678"],
      "emails": ["email@ejemplo.com"],
      "role": "Propietario|Comprador|Inquilino|Agente|Desconocido",
      "zone": "zona/barrio",
      "budgetMin": 150000,
      "budgetMax": 200000,
      "bedrooms": 3,
      "bathrooms": 2,
      "squareMeters": 120,
      "urgency": "alta|media|baja",
      "notes": "notas adicionales"
    }
  ],
  "properties": [
    {
      "reference": "REF123",
      "title": "titulo corto",
      "address": "dirección completa",
      "zone": "zona",
      "city": "Murcia",
      "price": 150000,
      "priceSale": 150000,
      "monthlyRent": 600,
      "propertyType": "piso|casa|atico|duplex|estudio|local|oficina|nave|terreno|garaje|trastero",
      "operation": "venta|alquiler|venta_alquiler",
      "bedrooms": 3,
      "bathrooms": 2,
      "squareMeters": 120,
      "floor": 2,
      "hasElevator": true,
      "hasTerrace": false,
      "hasParking": true,
      "hasPool": false,
      "hasGarden": false,
      "hasAirConditioning": true,
      "hasHeating": false,
      "hasFurniture": false,
      "yearBuilt": 2010,
      "condition": "nuevo|reforma|bueno|a_reformar",
      "energyRating": "A|B|C|D|E|F|G",
      "ownerName": "Nombre propietario",
      "ownerPhones": ["+34612345678"],
      "ownerEmails": ["owner@ejemplo.com"],
      "notes": "notas"
    }
  ],
  "interactions": [
    {
      "type": "call|whatsapp|email|note|visit",
      "direction": "inbound|outbound",
      "content": "resumen de la conversación",
      "date": "2024-01-15T10:30:00Z",
      "phone": "+34612345678",
      "duration": 120
    }
  ],
  "documents": [
    {
      "documentType": "contract|invoice|report|photo|identity|other",
      "entityType": "lead|property|operation",
      "summary": "resumen del documento"
    }
  ],
  "phones": ["+34612345678"],
  "emails": ["email@ejemplo.com"],
  "documentType": "contactos|inmuebles|mixto|contrato|factura|llamada|whatsapp|correo|foto|otro",
  "summary": "resumen general",
  "confidence": "high|medium|low",
  "notes": "observaciones generales"
}`;

function normalizeSpanishPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9 && /^[6789]/.test(digits)) return `+34${digits}`;
  if (digits.length === 11 && digits.startsWith("34")) return `+${digits}`;
  if (digits.length > 9) return `+${digits}`;
  return null;
}

function normalizePhones(phones?: string[]): string[] {
  if (!phones) return [];
  const result = new Set<string>();
  for (const p of phones) {
    const normalized = normalizeSpanishPhone(p);
    if (normalized) result.add(normalized);
  }
  return Array.from(result);
}

function normalizeEmails(emails?: string[]): string[] {
  if (!emails) return [];
  return emails.map((e) => e.toLowerCase().trim()).filter((e) => e.includes("@") && e.includes("."));
}

function cleanAnalysis(raw: any): DriveAIAnalysis {
  const leads: AnalyzedLead[] = (raw.leads || []).map((l: any) => ({
    name: l.name ? String(l.name).trim() : undefined,
    phones: normalizePhones(l.phones || []),
    emails: normalizeEmails(l.emails || []),
    role: ["Propietario", "Comprador", "Inquilino", "Agente", "Desconocido"].includes(l.role)
      ? l.role
      : "Desconocido",
    zone: l.zone ? String(l.zone) : undefined,
    budgetMin: typeof l.budgetMin === "number" ? l.budgetMin : undefined,
    budgetMax: typeof l.budgetMax === "number" ? l.budgetMax : undefined,
    bedrooms: typeof l.bedrooms === "number" ? l.bedrooms : undefined,
    bathrooms: typeof l.bathrooms === "number" ? l.bathrooms : undefined,
    squareMeters: typeof l.squareMeters === "number" ? l.squareMeters : undefined,
    urgency: ["alta", "media", "baja"].includes(l.urgency) ? l.urgency : undefined,
    notes: l.notes ? String(l.notes) : undefined,
  }));

  const properties: AnalyzedProperty[] = (raw.properties || []).map((p: any) => ({
    reference: p.reference ? String(p.reference).trim() : undefined,
    title: p.title ? String(p.title).trim() : undefined,
    address: p.address ? String(p.address).trim() : undefined,
    zone: p.zone ? String(p.zone) : undefined,
    city: p.city ? String(p.city) : undefined,
    price: typeof p.price === "number" ? p.price : undefined,
    priceSale: typeof p.priceSale === "number" ? p.priceSale : undefined,
    monthlyRent: typeof p.monthlyRent === "number" ? p.monthlyRent : undefined,
    propertyType: p.propertyType ? String(p.propertyType) : undefined,
    operation: ["venta", "alquiler", "venta_alquiler"].includes(p.operation) ? p.operation : undefined,
    bedrooms: typeof p.bedrooms === "number" ? p.bedrooms : undefined,
    bathrooms: typeof p.bathrooms === "number" ? p.bathrooms : undefined,
    squareMeters: typeof p.squareMeters === "number" ? p.squareMeters : undefined,
    floor: typeof p.floor === "number" ? p.floor : undefined,
    hasElevator: typeof p.hasElevator === "boolean" ? p.hasElevator : undefined,
    hasTerrace: typeof p.hasTerrace === "boolean" ? p.hasTerrace : undefined,
    hasParking: typeof p.hasParking === "boolean" ? p.hasParking : undefined,
    hasPool: typeof p.hasPool === "boolean" ? p.hasPool : undefined,
    hasGarden: typeof p.hasGarden === "boolean" ? p.hasGarden : undefined,
    hasAirConditioning: typeof p.hasAirConditioning === "boolean" ? p.hasAirConditioning : undefined,
    hasHeating: typeof p.hasHeating === "boolean" ? p.hasHeating : undefined,
    hasFurniture: typeof p.hasFurniture === "boolean" ? p.hasFurniture : undefined,
    yearBuilt: typeof p.yearBuilt === "number" ? p.yearBuilt : undefined,
    condition: p.condition ? String(p.condition) : undefined,
    energyRating: p.energyRating ? String(p.energyRating) : undefined,
    ownerName: p.ownerName ? String(p.ownerName) : undefined,
    ownerPhones: normalizePhones(p.ownerPhones || []),
    ownerEmails: normalizeEmails(p.ownerEmails || []),
    notes: p.notes ? String(p.notes) : undefined,
  }));

  const interactions: AnalyzedInteraction[] = (raw.interactions || []).map((i: any) => ({
    type: ["call", "whatsapp", "email", "note", "visit"].includes(i.type) ? i.type : "note",
    direction: ["inbound", "outbound"].includes(i.direction) ? i.direction : "inbound",
    content: i.content ? String(i.content) : "",
    date: i.date ? String(i.date) : undefined,
    phone: i.phone ? normalizeSpanishPhone(String(i.phone)) || undefined : undefined,
    duration: typeof i.duration === "number" ? i.duration : undefined,
  }));

  const documents: AnalyzedDocument[] = (raw.documents || []).map((d: any) => ({
    documentType: ["contract", "invoice", "report", "photo", "identity", "other"].includes(d.documentType)
      ? d.documentType
      : "other",
    entityType: ["lead", "property", "operation"].includes(d.entityType) ? d.entityType : undefined,
    summary: d.summary ? String(d.summary) : undefined,
  }));

  const allPhones = normalizePhones(raw.phones || []);
  const allEmails = normalizeEmails(raw.emails || []);

  return {
    leads,
    properties,
    interactions,
    documents,
    phones: allPhones,
    emails: allEmails,
    documentType: [
      "contactos",
      "inmuebles",
      "mixto",
      "contrato",
      "factura",
      "llamada",
      "whatsapp",
      "correo",
      "foto",
      "otro",
    ].includes(raw.documentType)
      ? raw.documentType
      : "otro",
    summary: raw.summary ? String(raw.summary) : "",
    confidence: ["high", "medium", "low"].includes(raw.confidence) ? raw.confidence : "low",
    notes: raw.notes ? String(raw.notes) : "",
  };
}

/**
 * Analyze text content with OpenAI.
 */
export async function analyzeDriveContent(
  fileName: string,
  mimeType: string,
  content: ExtractedContent
): Promise<DriveAIAnalysis> {
  const prompt = `${BASE_SYSTEM_PROMPT}\n\n--- ARCHIVO: ${fileName} ---\nTIPO: ${mimeType}\n\nCONTENIDO:\n${content.text}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Eres un asistente experto en análisis de datos inmobiliarios españoles. Extraes información estructurada de documentos desorganizados. Responde SIEMPRE en JSON válido.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const rawContent = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(rawContent);
  return cleanAnalysis(parsed);
}

/**
 * Analyze image content with OpenAI Vision (gpt-4o).
 */
export async function analyzeDriveImage(
  fileName: string,
  mimeType: string,
  imageBuffer: Buffer
): Promise<DriveAIAnalysis> {
  const base64 = imageBuffer.toString("base64");
  const dataUri = `data:${mimeType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "Eres un experto en inmobiliaria española. Analiza imágenes de documentos, fotos de inmuebles o capturas de pantalla y extrae información estructurada. Responde SIEMPRE en JSON válido.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${BASE_SYSTEM_PROMPT}\n\n--- IMAGEN: ${fileName} ---\nTIPO: ${mimeType}\n\nDescribe el contenido y extrae cualquier dato inmobiliario, teléfono, dirección, precio, referencia o persona visible.`,
          },
          {
            type: "image_url",
            image_url: { url: dataUri, detail: "auto" },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const rawContent = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(rawContent);
  return cleanAnalysis(parsed);
}

/**
 * Analyze audio transcript (already transcribed).
 */
export async function analyzeDriveAudio(
  fileName: string,
  mimeType: string,
  transcript: string,
  duration?: number
): Promise<DriveAIAnalysis> {
  const prompt = `${BASE_SYSTEM_PROMPT}\n\n--- AUDIO TRANSCRITO: ${fileName} ---\nTIPO: ${mimeType}\nDURACIÓN: ${duration || 0}s\n\nTRANSCRIPCIÓN:\n${transcript}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Eres un asistente experto en análisis de conversaciones inmobiliarias. Extraes información estructurada de transcripciones de llamadas o audios. Responde SIEMPRE en JSON válido.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const rawContent = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(rawContent);
  return cleanAnalysis(parsed);
}
