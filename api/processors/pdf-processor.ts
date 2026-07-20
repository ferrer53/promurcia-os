/**
 * PDF Processor — PromurciaOS Document Processing Pipeline
 * Extracts text from PDFs, identifies document types, and extracts
 * structured data (phones, emails, prices, references, etc.)
 */

import { PDFParse } from "pdf-parse";

// ── Types ───────────────────────────────────────────────────────────

export type DocumentType =
  | "property_listing"
  | "contract"
  | "invoice"
  | "contact_list"
  | "valuation"
  | "unknown";

export interface PDFParseResult {
  text: string;
  pages: number;
  documentType: DocumentType;
  extractedData: Record<string, unknown>;
  tables: Array<Array<string[]>>;
  phones: string[];
  emails: string[];
  prices: Array<{ amount: number; currency: string; period?: string }>;
  references: string[];
  dates: string[];
  dniList: string[];
  confidence: number;
}

// ── Regex Patterns ──────────────────────────────────────────────────

const PATTERNS = {
  // Spanish phone numbers
  phoneWithPrefix: /\+34[\s\-.]?[6789]\d{2}[\s\-.]?\d{3}[\s\-.]?\d{3}/g,
  phoneGrouped: /[6789]\d{2}[\s\-.]\d{3}[\s\-.]\d{3}/g,
  phoneSimple: /\b[6789]\d{8}\b/g,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // Prices
  priceWithSymbol: /\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?\s*[€$£]/g,
  priceWithSymbolAfter: /[€$£]\s*\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?/g,
  pricePerMonth: /\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?\s*[€$£]?\s*\/\s*(?:mes|meses|m|month)/gi,

  // Property references
  reference: /\b(?:REF|Ref|ref)[\s\-.]*[A-Z0-9]+\b/g,
  referenceNumber: /\b(?:REF|Ref|ref)[\s\-.]*\d{3,}\b/g,

  // Dates (Spanish formats)
  date: /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g,
  dateISO: /\b\d{4}[\/\-.]\d{2}[\/\-.]\d{2}\b/g,

  // DNI / NIE
  dni: /\b\d{8}[A-Z]\b/g,
  nie: /\b[XYZ]\d{7}[A-Z]\b/g,

  // Spanish postal codes (5 digits starting with 3 for Murcia region)
  postalCode: /\b3\d{4}\b/g,
};

// ── Document Type Detection ─────────────────────────────────────────

interface TypeIndicator {
  type: DocumentType;
  keywords: string[];
  weight: number;
}

const TYPE_INDICATORS: TypeIndicator[] = [
  {
    type: "property_listing",
    keywords: [
      "ficha",
      "inmueble",
      "propiedad",
      "superficie",
      "habitaciones",
      "dormitorios",
      "baños",
      "metros",
      "m2",
      "precio",
      "referencia",
      "inmobiliaria",
      "promurcia",
      "características",
      "certificado energético",
      "orientación",
      "planta",
      "ascensor",
      "terraza",
    ],
    weight: 1,
  },
  {
    type: "contract",
    keywords: [
      "contrato",
      "arrendamiento",
      "alquiler",
      "arrendador",
      "arrendatario",
      "arras",
      "fianza",
      "depósito",
      "partes",
      "cláusula",
      "duración",
      "prórroga",
      "rescisión",
      "comparecen",
      "doy fe",
      "testigo",
      "notario",
      "escritura",
    ],
    weight: 1.5,
  },
  {
    type: "invoice",
    keywords: [
      "factura",
      "honorarios",
      "importe",
      "base imponible",
      "iva",
      "irpf",
      "total",
      "número de factura",
      "fecha de emisión",
      "cliente",
      "proveedor",
      "cif",
      "nif",
      "concepto",
      "cantidad",
      "precio unitario",
    ],
    weight: 1.5,
  },
  {
    type: "contact_list",
    keywords: [
      "listado",
      "contactos",
      "teléfono",
      "telefono",
      "nombre",
      "email",
      "agenda",
      "directorio",
      "cliente",
    ],
    weight: 1,
  },
  {
    type: "valuation",
    keywords: [
      "tasación",
      "valoración",
      "valor de mercado",
      "valor catastral",
      "tasador",
      "informe",
      "peritaje",
      "valor estimado",
      "precio de mercado",
      "comparable",
      "regresión",
    ],
    weight: 1.5,
  },
];

function detectDocumentType(text: string): { type: DocumentType; confidence: number } {
  const lowerText = text.toLowerCase();
  const scores: Record<DocumentType, number> = {
    property_listing: 0,
    contract: 0,
    invoice: 0,
    contact_list: 0,
    valuation: 0,
    unknown: 0,
  };

  for (const indicator of TYPE_INDICATORS) {
    for (const keyword of indicator.keywords) {
      if (lowerText.includes(keyword)) {
        scores[indicator.type] += indicator.weight;
      }
    }
  }

  // Bonus for multiple phone numbers in contact lists
  const phoneCount = extractPhoneNumbers(text).length;
  if (phoneCount > 5) {
    scores.contact_list += 2;
  }

  // Bonus for price + ref in property listings
  if (scores.property_listing > 0 && extractPrices(text).length > 0) {
    scores.property_listing += 1;
  }

  // Bonus for legal terms in contracts
  const legalTerms = ["comparece", "doy fe", "testigo", "notario", "poder", "representación"];
  const legalMatches = legalTerms.filter((t) => lowerText.includes(t)).length;
  if (legalMatches >= 2) {
    scores.contract += legalMatches;
  }

  // Determine winner
  let bestType: DocumentType = "unknown";
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as DocumentType;
    }
  }

  const confidence = bestScore > 0 ? Math.min(0.9, 0.4 + bestScore * 0.05) : 0.1;
  return { type: bestType, confidence };
}

// ── Phone Extraction ────────────────────────────────────────────────

export function extractPhoneNumbers(text: string): string[] {
  const phones = new Set<string>();

  const withPrefix = text.match(PATTERNS.phoneWithPrefix) || [];
  withPrefix.forEach((p) => phones.add(normalizePhone(p)));

  const grouped = text.match(PATTERNS.phoneGrouped) || [];
  grouped.forEach((p) => phones.add(normalizePhone(p)));

  const simple = text.match(PATTERNS.phoneSimple) || [];
  simple.forEach((p) => phones.add(normalizePhone(p)));

  return Array.from(phones).sort();
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // If it starts with 34 and has 11 digits total
  if (digits.length === 11 && digits.startsWith("34")) {
    return `+${digits}`;
  }
  // If it has 9 digits (Spanish number without prefix)
  if (digits.length === 9) {
    return `+34${digits}`;
  }
  // Otherwise return as-is with + prefix if needed
  if (digits.length > 9) {
    return `+${digits}`;
  }
  return digits;
}

// ── Email Extraction ────────────────────────────────────────────────

export function extractEmails(text: string): string[] {
  const matches = text.match(PATTERNS.email) || [];
  const emails = new Set<string>();
  matches.forEach((e) => {
    const clean = e.toLowerCase().trim();
    // Basic validation
    if (clean.includes(".") && clean.length > 5) {
      emails.add(clean);
    }
  });
  return Array.from(emails).sort();
}

// ── Price Extraction ────────────────────────────────────────────────

export function extractPrices(
  text: string
): Array<{ amount: number; currency: string; period?: string }> {
  const results: Array<{ amount: number; currency: string; period?: string }> = [];
  const seen = new Set<string>();

  // Pattern: "150.000 €" or "150000€"
  const priceMatches = [
    ...text.matchAll(/(\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?)\s*([€$£])/g),
    ...text.matchAll(/([€$£])\s*(\d{1,3}(?:[.\s]\d{3})+(?:,\d+)?)/g),
    ...text.matchAll(/(\d{1,3}(?:,\d{3})*\.?\d*)\s*([€$£])/g),
    ...text.matchAll(/([€$£])\s*(\d{1,3}(?:,\d{3})*\.?\d*)/g),
  ];

  for (const match of priceMatches) {
    const numStr = (match[1] || match[2] || "").replace(/[.\s]/g, "").replace(",", ".");
    const currency = (match[2] || match[1] || "€").replace(/[^€$£]/g, "€");
    const amount = parseFloat(numStr);

    if (!isNaN(amount) && amount > 0) {
      const key = `${amount}-${currency}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ amount, currency: mapCurrency(currency) });
      }
    }
  }

  // Pattern: "1.500 €/mes" or "1200€/mes"
  const perPeriodMatches = text.matchAll(
    /(\d{1,3}(?:[.\s]\d{3})*)\s*[€$£]?\s*\/\s*(mes|semana|dia|día|año|quincena|trimestre)/gi
  );
  for (const match of perPeriodMatches) {
    const numStr = match[1].replace(/[.\s]/g, "");
    const amount = parseFloat(numStr);
    const period = match[2].toLowerCase();

    if (!isNaN(amount) && amount > 0) {
      const key = `${amount}-mes-${period}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ amount, currency: "EUR", period });
      }
    }
  }

  return results;
}

function mapCurrency(symbol: string): string {
  switch (symbol) {
    case "$":
      return "USD";
    case "£":
      return "GBP";
    case "€":
    default:
      return "EUR";
  }
}

// ── Reference Extraction ────────────────────────────────────────────

export function extractReferences(text: string): string[] {
  const refs = new Set<string>();
  const matches = text.match(PATTERNS.reference) || [];
  matches.forEach((r) => refs.add(r.trim()));
  return Array.from(refs).sort();
}

// ── Date Extraction ─────────────────────────────────────────────────

export function extractDates(text: string): string[] {
  const dates = new Set<string>();
  const matches = text.match(PATTERNS.date) || [];
  matches.forEach((d) => dates.add(d.trim()));
  const isoMatches = text.match(PATTERNS.dateISO) || [];
  isoMatches.forEach((d) => dates.add(d.trim()));
  return Array.from(dates).sort();
}

// ── DNI/NIE Extraction ──────────────────────────────────────────────

export function extractDNI(text: string): string[] {
  const docs = new Set<string>();
  const dniMatches = text.match(PATTERNS.dni) || [];
  dniMatches.forEach((d) => docs.add(d));
  const nieMatches = text.match(PATTERNS.nie) || [];
  nieMatches.forEach((d) => docs.add(d));
  return Array.from(docs).sort();
}

// ── Table Extraction ────────────────────────────────────────────────

function extractTables(text: string): Array<Array<string[]>> {
  const tables: Array<Array<string[]>> = [];
  const lines = text.split(/\r?\n/);

  let currentTable: string[][] = [];
  for (const line of lines) {
    // Detect table-like rows by multiple whitespace separations or pipes
    const pipeSplit = line.split("|").map((s) => s.trim()).filter(Boolean);
    const tabSplit = line.split("\t").map((s) => s.trim()).filter((s) => s !== "");

    if (pipeSplit.length >= 3) {
      currentTable.push(pipeSplit);
    } else if (tabSplit.length >= 3) {
      currentTable.push(tabSplit);
    } else if (line.trim().match(/\s{3,}/) && line.trim().split(/\s{3,}/).length >= 3) {
      const cols = line.trim().split(/\s{3,}/).map((s) => s.trim());
      currentTable.push(cols);
    } else {
      if (currentTable.length >= 2) {
        tables.push([...currentTable]);
      }
      currentTable = [];
    }
  }

  if (currentTable.length >= 2) {
    tables.push(currentTable);
  }

  return tables;
}

// ── Structured Data Extraction ──────────────────────────────────────

function extractStructuredData(
  text: string,
  docType: DocumentType
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  switch (docType) {
    case "property_listing": {
      // Try to extract property details
      data.tipo = extractValueAfterKeywords(text, ["Tipo:", "TIPO:", "Tipo de propiedad:", "Tipología:"]);
      data.estado = extractValueAfterKeywords(text, ["Estado:", "ESTADO:", "Situación:", "Disponibilidad:"]);
      data.superficie = extractNumericValue(text, ["Superficie:", "SUPERFICIE:", "m² útil:", "Metros:"]);
      data.habitaciones = extractNumericValue(text, ["Habitaciones:", "HABITACIONES:", "Dormitorios:"]);
      data.banos = extractNumericValue(text, ["Baños:", "BAÑOS:", "Aseos:", "Wc:"]);
      data.planta = extractNumericValue(text, ["Planta:", "PLANTA:", "Floor:"]);
      data.anoConstruccion = extractNumericValue(text, ["Año:", "Antigüedad:", "Año construcción:"]);
      data.orientacion = extractValueAfterKeywords(text, ["Orientación:", "ORIENTACIÓN:", "Orientacion:"]);
      data.certificadoEnergetico = extractValueAfterKeywords(text, [
        "Certificado energético:",
        "Calificación energética:",
        "Consumo energético:",
        "Emisiones:",
        "CEE:",
      ]);

      // Extract yes/no features
      data.ascensor = detectYesNo(text, ["Ascensor:", "ascensor", "elevator"]);
      data.terraza = detectYesNo(text, ["Terraza:", "terraza", "balcón", "balcon"]);
      data.parking = detectYesNo(text, ["Parking:", "parking", "garaje", "plaza garaje"]);
      data.piscina = detectYesNo(text, ["Piscina:", "piscina"]);
      data.jardin = detectYesNo(text, ["Jardín:", "jardín", "jardin"]);
      data.aireAcondicionado = detectYesNo(text, ["Aire acondicionado:", "aire acondicionado", "climatizado"]);
      data.calefaccion = detectYesNo(text, ["Calefacción:", "calefacción", "calefaccion"]);
      data.amueblado = detectYesNo(text, ["Amueblado:", "amueblado", "mobiliario"]);
      break;
    }

    case "contract": {
      // Extract contract parties
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/ARRENDADOR|ARRENDATARIO|PROPIETARIO|INQUILINO|PARTE|COMPRADOR|VENDEDOR/i.test(line)) {
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.length > 3 && nextLine.length < 100) {
            const key = line.replace(/[:\s]/g, "").toLowerCase();
            data[key] = nextLine;
          }
        }
      }

      data.duracion = extractValueAfterKeywords(text, ["Duración:", "DURACIÓN:", "Plazo:", "Plazo contractual:"]);
      data.fianza = extractNumericValue(text, ["Fianza:", "FIANZA:", "Depósito:", "DEPÓSITO:"]);
      data.rentaMensual = extractNumericValue(text, ["Renta mensual:", "RENTA:", "Canon:"]);
      data.fechaInicio = extractValueAfterKeywords(text, [
        "Fecha de inicio:",
        "Fecha inicio:",
        "Comienzo:",
        "Desde:",
      ]);
      break;
    }

    case "invoice": {
      data.numeroFactura = extractValueAfterKeywords(text, [
        "Factura nº:",
        "Nº Factura:",
        "Factura No:",
        "Número de factura:",
      ]);
      data.fechaEmision = extractValueAfterKeywords(text, [
        "Fecha de emisión:",
        "Fecha emisión:",
        "Fecha:",
        "Fecha factura:",
      ]);
      data.cliente = extractValueAfterKeywords(text, ["Cliente:", "CLIENTE:", "Adquirente:", "Destinatario:"]);
      data.concepto = extractValueAfterKeywords(text, ["Concepto:", "CONCEPTO:", "Descripción:", "Servicio:"]);
      data.baseImponible = extractNumericValue(text, ["Base imponible:", "BASE IMPONIBLE:", "Base:"]);
      data.iva = extractNumericValue(text, ["IVA:", "Iva:", "% IVA:"]);
      data.irpf = extractNumericValue(text, ["IRPF:", "Irpf:", "Retención:"]);
      data.total = extractNumericValue(text, ["Total:", "TOTAL:", "Importe total:", "A pagar:"]);
      data.cif = extractValueAfterKeywords(text, ["CIF:", "C.I.F.:", "NIF:", "N.I.F.:", "CIF/NIF:"]);
      break;
    }

    case "contact_list": {
      // For contact lists, the structured data is the phone/email lists
      break;
    }

    case "valuation": {
      data.valorEstimado = extractNumericValue(text, ["Valor estimado:", "VALOR ESTIMADO:", "Valor de mercado:", "Valor:"]);
      data.valorMetro = extractNumericValue(text, ["Valor/m²:", "Valor metro cuadrado:", "€/m²:", "Precio/m²:"]);
      data.metros = extractNumericValue(text, ["Metros construidos:", "Superficie:", "m² construidos:"]);
      data.tasador = extractValueAfterKeywords(text, ["Tasador:", "Perito:", "Técnico:", "Informe realizado por:"]);
      data.fechaTasacion = extractValueAfterKeywords(text, ["Fecha de tasación:", "Fecha del informe:", "Fecha visita:"]);
      data.metodologia = extractValueAfterKeywords(text, ["Metodología:", "Método:", "Método aplicado:"]);
      break;
    }
  }

  // Always extract common fields
  data.ubicacion = extractValueAfterKeywords(text, ["Ubicación:", "Dirección:", "Direccion:", "Calle:"]);
  data.zona = extractValueAfterKeywords(text, ["Zona:", "Barrio:", "Zona/Barrio:", "Localidad:"]);
  data.ciudad = extractValueAfterKeywords(text, ["Ciudad:", "Población:", "Poblacion:", "Municipio:"]);

  return data;
}

// ── Helper: Extract value after keywords ────────────────────────────

function extractValueAfterKeywords(text: string, keywords: string[]): string | null {
  const lines = text.split(/\r?\n/);
  for (const keyword of keywords) {
    for (const line of lines) {
      const idx = line.indexOf(keyword);
      if (idx >= 0) {
        const value = line.substring(idx + keyword.length).trim().replace(/^[:\s]+/, "");
        if (value && value.length > 0 && value.length < 200) {
          return value;
        }
      }
    }
  }
  return null;
}

function extractNumericValue(text: string, keywords: string[]): number | null {
  for (const keyword of keywords) {
    const value = extractValueAfterKeywords(text, [keyword]);
    if (value) {
      // Extract first number from the value
      const match = value.match(/[\d.]+(?:,\d+)?/);
      if (match) {
        const num = parseFloat(match[0].replace(/\./g, "").replace(",", "."));
        if (!isNaN(num)) return num;
      }
    }
  }
  return null;
}

function detectYesNo(text: string, keywords: string[]): boolean | null {
  const lowerText = text.toLowerCase();
  for (const keyword of keywords) {
    const idx = lowerText.indexOf(keyword.toLowerCase());
    if (idx >= 0) {
      const after = lowerText.substring(idx + keyword.length, idx + keyword.length + 20);
      if (after.includes("sí") || after.includes("si") || after.includes("yes") || after.includes("1")) {
        return true;
      }
      if (after.includes("no") || after.includes("0")) {
        return false;
      }
    }
  }
  return null;
}

// ── Main Parser ─────────────────────────────────────────────────────

/**
 * Parse a PDF file buffer and extract structured data.
 */
export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  let parsed;
  try {
    parsed = await PDFParse(buffer, {
      max: 0, // No page limit
    });
  } catch (err) {
    // If pdf-parse fails, try with text extraction fallback
    const error = err instanceof Error ? err.message : "Error desconocido al procesar PDF";
    return {
      text: "",
      pages: 0,
      documentType: "unknown",
      extractedData: { parseError: error },
      tables: [],
      phones: [],
      emails: [],
      prices: [],
      references: [],
      dates: [],
      dniList: [],
      confidence: 0,
    };
  }

  const text = parsed.text || "";
  const pages = parsed.numpages || 1;

  // Detect document type
  const { type, confidence } = detectDocumentType(text);

  // Extract all structured data
  const phones = extractPhoneNumbers(text);
  const emails = extractEmails(text);
  const prices = extractPrices(text);
  const references = extractReferences(text);
  const dates = extractDates(text);
  const dniList = extractDNI(text);
  const tables = extractTables(text);
  const extractedData = extractStructuredData(text, type);

  return {
    text,
    pages,
    documentType: type,
    extractedData,
    tables,
    phones,
    emails,
    prices,
    references,
    dates,
    dniList,
    confidence,
  };
}

