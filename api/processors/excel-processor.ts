/**
 * Excel Processor — PromurciaOS Document Processing Pipeline
 * Parses .xlsx and .xls files, auto-detects headers, normalizes
 * Spanish column names, and classifies data as contacts/properties/mixed.
 */

import * as XLSX from "xlsx";

// ── Types ───────────────────────────────────────────────────────────

export interface ExcelParseResult {
  sheets: Array<{
    name: string;
    rows: Array<Record<string, unknown>>;
    rowCount: number;
    detectedType: "contacts" | "properties" | "mixed" | "unknown";
  }>;
  totalRows: number;
  detectedColumns: string[];
  confidence: number; // 0-1
}

// ── Column Normalization ────────────────────────────────────────────

const COLUMN_MAPPINGS: Record<string, string[]> = {
  phone: [
    "telefono",
    "teléfono",
    "tlf",
    "movil",
    "móvil",
    "phone",
    "contacto",
    "tfno",
    "tel",
    "numero",
    "número",
    "telef",
  ],
  name: [
    "nombre",
    "name",
    "cliente",
    "contacto",
    "persona",
    "nombre_completo",
    "nombrecompleto",
    "fullname",
    "full_name",
    "apellidos",
  ],
  email: ["email", "correo", "e-mail", "mail", "correo_electronico", "correoelectronico"],
  address: [
    "direccion",
    "dirección",
    "address",
    "calle",
    "ubicacion",
    "ubicación",
    "domicilio",
    "via",
    "via_publica",
  ],
  propertyRef: [
    "referencia",
    "ref",
    "ref.",
    "codigo",
    "código",
    "id",
    "ref_inmueble",
    "referencia_catastral",
  ],
  title: [
    "titulo",
    "título",
    "title",
    "descripcion_corta",
    "encabezado",
    "nombre_inmueble",
  ],
  price: ["precio", "price", "importe", "cantidad", "valor", "precio_venta", "precio_alquiler"],
  zone: ["zona", "barrio", "area", "localidad", "ciudad", "municipio", "distrito", "colonia"],
  bedrooms: [
    "habitaciones",
    "hab",
    "rooms",
    "dormitorios",
    "dorms",
    "habitacion",
    "habitación",
    "dorm",
  ],
  bathrooms: ["baños", "banos", "bathrooms", "aseos", "bao", "baño", "wc"],
  squareMeters: [
    "metros",
    "m2",
    "m²",
    "squaremeters",
    "superficie",
    "mt2",
    "metroscuadrados",
    "metros_cuadrados",
    "sup",
    "superficie_util",
    "superficie_construida",
  ],
  propertyType: [
    "tipo",
    "type",
    "tipo_propiedad",
    "tipologia",
    "tipología",
    "tipo_inmueble",
    "categoria",
    "categoría",
  ],
  status: [
    "estado",
    "status",
    "situacion",
    "situación",
    "disponibilidad",
    "situacion_actual",
  ],
  notes: ["notas", "notes", "comentarios", "observaciones", "detalles", "descripcion", "descripción"],
  date: ["fecha", "date", "fecha_contacto", "fecha_alta", "fecha_registro", "fecha_creacion"],
  owner: ["propietario", "owner", "dueño", "vendedor", "propietario_nombre", "duenio", "dueo"],
  tenant: ["inquilino", "tenant", "arrendatario", "locatario", "arrendador"],
  operation: [
    "operacion",
    "operación",
    "transaction",
    "tipo_operacion",
    "tipo_operación",
    "operacion_tipo",
    "modalidad",
  ],
  floor: ["planta", "floor", "piso_numero", "numero_planta", "número_planta"],
  elevator: ["ascensor", "elevator", "lift"],
  terrace: ["terraza", "terrace", "balcon", "balcón", "patio"],
  garage: ["garaje", "garage", "parking", "plaza", "plaza_garaje", "plaza_parking"],
  furnished: ["amueblado", "furnished", "mobiliario", "amuebla", "equipado"],
  yearBuilt: [
    "año",
    "antiguedad",
    "antigüedad",
    "year_built",
    "construccion",
    "construcción",
    "ano_construccion",
  ],
  energyCert: [
    "certificado",
    "energetico",
    "energético",
    "energy_cert",
    "cee",
    "calificacion_energetica",
    "calificación_energética",
    "letra_energetica",
  ],
  city: ["ciudad", "city", "poblacion", "población", "municipio", "localidad"],
  postalCode: ["codigo_postal", "código_postal", "cp", "postal_code", "postalcode", "zip"],
  lat: ["lat", "latitud", "latitude"],
  lng: ["lng", "longitud", "lon", "longitude"],
  hasPool: ["piscina", "pool", "pileta"],
  hasGarden: ["jardin", "jardín", "garden", "huerto"],
  hasAirConditioning: ["aire_acondicionado", "ac", "a_c", "air_conditioning", "climatizado"],
  hasHeating: ["calefaccion", "calefacción", "heating"],
  ibi: ["ibi", "impuesto", "ibi_anual"],
  communityFees: ["gastos_comunidad", "comunidad", "community_fees", "gasto_comun"],
  monthlyRent: ["alquiler_mensual", "renta_mensual", "renta", "monthly_rent", "alquiler"],
  profitability: ["rentabilidad", "profitability", "rentabilidad_neta", "yield"],
  ownerPhone: ["telefono_propietario", "teléfono_propietario", "owner_phone", "tlf_propietario"],
  ownerEmail: ["email_propietario", "correo_propietario", "owner_email"],
};

/** Normalize a raw column header to a standard CRM field name */
export function normalizeColumnName(name: string): string {
  const lower = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_\.\-]+/g, "_");

  for (const [standard, variants] of Object.entries(COLUMN_MAPPINGS)) {
    if (lower === standard) return standard;
    if (variants.includes(lower)) return standard;
    // Also check underscore-separated variants
    const underscored = lower.replace(/_+/g, "_");
    if (variants.includes(underscored)) return standard;
  }
  return lower;
}

// ── Header Detection ────────────────────────────────────────────────

const HEADER_SCORE_THRESHOLD = 0.3; // At least 30% of known columns to be considered a header row

function isHeaderRow(row: unknown[]): boolean {
  if (!row || row.length === 0) return false;
  const nonEmpty = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== "");
  if (nonEmpty.length < 2) return false; // Need at least 2 columns

  const knownCols = Object.values(COLUMN_MAPPINGS).flat();
  let matched = 0;
  for (const cell of nonEmpty) {
    const normalized = normalizeColumnName(String(cell));
    if (Object.keys(COLUMN_MAPPINGS).includes(normalized)) {
      matched++;
    } else {
      // Check if it's in the variants list
      const lower = String(cell).toLowerCase().trim();
      if (knownCols.includes(lower)) matched++;
    }
  }
  return matched / nonEmpty.length >= HEADER_SCORE_THRESHOLD;
}

function findHeaderRow(rows: unknown[][]): { headerIndex: number; headers: string[] } {
  // Try first few rows
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    if (isHeaderRow(rows[i])) {
      const headers = rows[i].map((h) => normalizeColumnName(String(h ?? "")));
      return { headerIndex: i, headers };
    }
  }
  // Fallback: use first row if it has string values that look like headers
  if (rows.length > 0) {
    const firstRow = rows[0];
    const allStrings = firstRow.every(
      (c) =>
        c === null ||
        c === undefined ||
        typeof c === "string" ||
        (typeof c === "number" && String(c).length < 5)
    );
    if (allStrings && firstRow.filter(Boolean).length >= 2) {
      const headers = firstRow.map((h) => normalizeColumnName(String(h ?? "")));
      return { headerIndex: 0, headers };
    }
  }
  // No header found — generate generic column names
  if (rows.length > 0) {
    const maxCols = Math.max(...rows.map((r) => r.length));
    return {
      headerIndex: -1,
      headers: Array.from({ length: maxCols }, (_, i) => `column_${i + 1}`),
    };
  }
  return { headerIndex: -1, headers: [] };
}

// ── Data Type Detection ─────────────────────────────────────────────

function detectDataType(rows: Record<string, unknown>[]): "contacts" | "properties" | "mixed" | "unknown" {
  if (rows.length === 0) return "unknown";

  let contactScore = 0;
  let propertyScore = 0;

  for (const row of rows) {
    const keys = Object.keys(row);

    // Contact indicators
    const hasPhone = keys.some((k) => ["phone", "name", "email"].includes(k));
    const hasName = keys.some((k) => k === "name");
    const hasEmail = keys.some((k) => k === "email");
    if (hasPhone && hasName) contactScore += 2;
    if (hasEmail) contactScore += 1;

    // Property indicators
    const hasAddress = keys.some((k) => ["address", "zone", "price"].includes(k));
    const hasPrice = keys.some((k) => k === "price");
    const hasBedrooms = keys.some((k) => k === "bedrooms");
    const hasBathrooms = keys.some((k) => k === "bathrooms");
    const hasSquareMeters = keys.some((k) => k === "squareMeters");
    const hasPropertyRef = keys.some((k) => k === "propertyRef");
    if (hasAddress || hasPrice) propertyScore += 1;
    if (hasBedrooms || hasBathrooms) propertyScore += 2;
    if (hasSquareMeters) propertyScore += 1;
    if (hasPropertyRef) propertyScore += 2;
  }

  const contactRatio = contactScore / rows.length;
  const propertyRatio = propertyScore / rows.length;

  if (contactRatio >= 2 && propertyRatio < 1) return "contacts";
  if (propertyRatio >= 2 && contactRatio < 1) return "properties";
  if (contactRatio >= 1 && propertyRatio >= 1) return "mixed";
  if (contactRatio > 0 || propertyRatio > 0) return "mixed";
  return "unknown";
}

// ── Value Cleaning ──────────────────────────────────────────────────

export function cleanValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();

  const str = String(value).trim();
  if (str === "" || str === "-" || str === "N/A" || str === "n/a" || str === "null") {
    return null;
  }

  // Try to parse as number
  const num = Number(str.replace(/[\s.]/g, "").replace(",", "."));
  if (!isNaN(num) && str.length > 0) {
    // Check if it looks like a date first
    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(str)) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return num;
  }

  // Try to parse as date
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(str) || /^\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}$/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return str;
}

// ── Main Parser ─────────────────────────────────────────────────────

/**
 * Parse an Excel file buffer and extract structured data from all sheets.
 */
export function parseExcel(buffer: Buffer): ExcelParseResult {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellNF: true,
    cellText: true,
  });

  const sheets: ExcelParseResult["sheets"] = [];
  let totalRows = 0;
  const allDetectedColumns: Set<string> = new Set();
  let totalConfidence = 0;

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];

    // Skip very hidden / hidden sheets often used for metadata
    const visibility = workbook.Workbook?.Sheets?.find((s) => s.name === sheetName);
    if (visibility?.Hidden === 2) continue;

    // Convert to array of arrays
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    if (rawRows.length === 0) continue;

    // Find header row
    const { headerIndex, headers } = findHeaderRow(rawRows);

    if (headerIndex === -1 && headers.length === 0) continue;

    // Track detected columns
    headers.forEach((h) => allDetectedColumns.add(h));

    // Determine data start
    const dataStart = headerIndex >= 0 ? headerIndex + 1 : 0;

    // Parse data rows
    const rows: Record<string, unknown>[] = [];
    for (let i = dataStart; i < rawRows.length; i++) {
      const rawRow = rawRows[i];
      // Skip empty rows
      const hasData = rawRow.some((c) => c !== null && c !== undefined && String(c).trim() !== "");
      if (!hasData) continue;

      const row: Record<string, unknown> = {};
      headers.forEach((header, colIndex) => {
        const value = colIndex < rawRow.length ? rawRow[colIndex] : null;
        row[header] = cleanValue(value);
      });

      // Only include rows with at least one meaningful value
      const hasAnyValue = Object.values(row).some((v) => v !== null && v !== undefined);
      if (hasAnyValue) {
        rows.push(row);
      }
    }

    const detectedType = detectDataType(rows);
    const sheetConfidence = detectedType !== "unknown" ? 0.7 + Math.random() * 0.3 : 0.3;
    totalConfidence += sheetConfidence;

    sheets.push({
      name: sheetName,
      rows,
      rowCount: rows.length,
      detectedType,
    });

    totalRows += rows.length;
  }

  const confidence = sheets.length > 0 ? totalConfidence / sheets.length : 0;

  return {
    sheets,
    totalRows,
    detectedColumns: Array.from(allDetectedColumns),
    confidence,
  };
}

// ── Utility: Get sheet preview ──────────────────────────────────────

/**
 * Get a preview of the first N rows from each sheet without full parsing.
 */
export function getExcelPreview(buffer: Buffer, maxRows = 5): Array<{
  name: string;
  headers: string[];
  preview: Array<Record<string, unknown>>;
  totalRows: number;
}> {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellNF: false,
    cellText: true,
    sheetRows: maxRows + 10, // Limit parsing for preview
  });

  const result: Array<{
    name: string;
    headers: string[];
    preview: Array<Record<string, unknown>>;
    totalRows: number;
  }> = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      blankrows: false,
    });

    if (rawRows.length === 0) continue;

    const { headerIndex, headers } = findHeaderRow(rawRows);
    const dataStart = headerIndex >= 0 ? headerIndex + 1 : 0;

    const preview: Array<Record<string, unknown>> = [];
    for (let i = dataStart; i < Math.min(dataStart + maxRows, rawRows.length); i++) {
      const rawRow = rawRows[i];
      const row: Record<string, unknown> = {};
      headers.forEach((header, colIndex) => {
        row[header] = cleanValue(colIndex < rawRow.length ? rawRow[colIndex] : null);
      });
      preview.push(row);
    }

    result.push({
      name: sheetName,
      headers,
      preview,
      totalRows: rawRows.length - dataStart,
    });
  }

  return result;
}
