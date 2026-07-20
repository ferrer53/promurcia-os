/**
 * CSV Processor — PromurciaOS Document Processing Pipeline
 * Parses CSV files with auto-detect delimiter, encoding, and header normalization.
 */

import { parse } from "csv-parse/sync";
import { normalizeColumnName, cleanValue } from "./excel-processor";

// ── Types ───────────────────────────────────────────────────────────

export interface CSVParseResult {
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  detectedType: "contacts" | "properties" | "mixed" | "unknown";
  delimiter: string;
  encoding: string;
  headers: string[];
  confidence: number;
}

// ── Delimiter Detection ─────────────────────────────────────────────

const DELIMITER_CANDIDATES = [";", ",", "\t", "|"];

function detectDelimiter(content: string): string {
  const firstLines = content.split(/\r?\n/).slice(0, 10).join("\n");

  let bestDelimiter = ",";
  let bestScore = 0;

  for (const delim of DELIMITER_CANDIDATES) {
    const lines = firstLines.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) continue;

    const counts = lines.map((line) => {
      let count = 0;
      for (const char of line) {
        if (char === '"') {
          // Skip quoted sections
          continue;
        }
        if (char === delim) count++;
      }
      return count;
    });

    // All lines should have the same count
    const firstCount = counts[0] || 0;
    if (firstCount === 0) continue;

    const consistent = counts.every((c) => c === firstCount || c === 0);
    const score = firstCount * (consistent ? 2 : 1);

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
}

// ── Encoding Detection ──────────────────────────────────────────────

function detectEncoding(buffer: Buffer): string {
  // Check for UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return "utf-8-bom";
  }

  // Check for UTF-16 LE BOM
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return "utf-16le";
  }

  // Check for UTF-16 BE BOM
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return "utf-16be";
  }

  // Simple heuristic: if buffer contains invalid UTF-8 sequences, assume latin1
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    decoder.decode(buffer);
    return "utf-8";
  } catch {
    return "latin1";
  }
}

function decodeBuffer(buffer: Buffer, encoding: string): string {
  if (encoding === "utf-8-bom") {
    return buffer.subarray(3).toString("utf-8");
  }
  if (encoding === "utf-16le") {
    return buffer.toString("utf16le");
  }
  if (encoding === "utf-16be") {
    // Manual decode: swap byte order then decode as utf16le
    const swapped = Buffer.alloc(buffer.length);
    for (let i = 0; i < buffer.length - 1; i += 2) {
      swapped[i] = buffer[i + 1];
      swapped[i + 1] = buffer[i];
    }
    return swapped.toString("utf16le");
  }
  if (encoding === "latin1") {
    return buffer.toString("latin1");
  }
  return buffer.toString("utf-8");
}

// ── Data Type Detection ─────────────────────────────────────────────

function detectDataType(rows: Record<string, unknown>[]): "contacts" | "properties" | "mixed" | "unknown" {
  if (rows.length === 0) return "unknown";

  let contactScore = 0;
  let propertyScore = 0;
  let rowsWithData = 0;

  for (const row of rows) {
    const keys = Object.keys(row);
    const nonNullKeys = keys.filter((k) => row[k] !== null && row[k] !== undefined);
    if (nonNullKeys.length === 0) continue;
    rowsWithData++;

    // Contact indicators
    const hasPhone = keys.some((k) => ["phone", "name", "email"].includes(k));
    const hasName = keys.some((k) => k === "name");
    const hasEmail = keys.some((k) => k === "email");
    if (hasPhone) contactScore += 1;
    if (hasName) contactScore += 1;
    if (hasEmail) contactScore += 0.5;

    // Property indicators
    const hasAddress = keys.some((k) => ["address", "zone", "title"].includes(k));
    const hasPrice = keys.some((k) => k === "price");
    const hasBedrooms = keys.some((k) => k === "bedrooms");
    const hasBathrooms = keys.some((k) => k === "bathrooms");
    const hasSquareMeters = keys.some((k) => k === "squareMeters");
    const hasPropertyRef = keys.some((k) => k === "propertyRef");
    const hasPropertyType = keys.some((k) => k === "propertyType");

    if (hasAddress) propertyScore += 1;
    if (hasPrice) propertyScore += 1.5;
    if (hasBedrooms || hasBathrooms) propertyScore += 1;
    if (hasSquareMeters) propertyScore += 1;
    if (hasPropertyRef) propertyScore += 1.5;
    if (hasPropertyType) propertyScore += 1;
  }

  if (rowsWithData === 0) return "unknown";

  const contactRatio = contactScore / rowsWithData;
  const propertyRatio = propertyScore / rowsWithData;

  if (contactRatio >= 1.5 && propertyRatio < 1) return "contacts";
  if (propertyRatio >= 1.5 && contactRatio < 1) return "properties";
  if (contactRatio >= 1 || propertyRatio >= 1) return "mixed";
  return "unknown";
}

// ── Main Parser ─────────────────────────────────────────────────────

/**
 * Parse a CSV file buffer and extract structured data.
 * Auto-detects delimiter, encoding, and normalizes headers.
 */
export function parseCSV(buffer: Buffer): CSVParseResult {
  // Step 1: Detect encoding
  const encoding = detectEncoding(buffer);

  // Step 2: Decode buffer to string
  let content = decodeBuffer(buffer, encoding);

  // Step 3: Detect delimiter
  const delimiter = detectDelimiter(content);

  // Step 4: Parse CSV
  const records = parse(content, {
    delimiter,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: encoding === "utf-8-bom",
    relax_quotes: true,
    relax_column_count: true,
  });

  if (!Array.isArray(records) || records.length === 0) {
    return {
      rows: [],
      rowCount: 0,
      detectedType: "unknown",
      delimiter,
      encoding,
      headers: [],
      confidence: 0,
    };
  }

  // Step 5: Normalize headers
  const rawHeaders = Object.keys(records[0]);
  const headers = rawHeaders.map((h) => normalizeColumnName(h));

  // Step 6: Transform rows with normalized column names
  const rows: Array<Record<string, unknown>> = [];
  for (const record of records) {
    const row: Record<string, unknown> = {};
    let hasAnyValue = false;

    rawHeaders.forEach((rawHeader, index) => {
      const normalizedHeader = headers[index] || rawHeader;
      const value = cleanValue(record[rawHeader]);
      row[normalizedHeader] = value;
      if (value !== null && value !== undefined) {
        hasAnyValue = true;
      }
    });

    if (hasAnyValue) {
      rows.push(row);
    }
  }

  // Step 7: Detect data type
  const detectedType = detectDataType(rows);
  const confidence = detectedType !== "unknown" ? 0.7 : 0.3;

  return {
    rows,
    rowCount: rows.length,
    detectedType,
    delimiter,
    encoding,
    headers,
    confidence,
  };
}

// ── Utility: Get CSV preview ────────────────────────────────────────

/**
 * Get a preview of the first N rows from a CSV file.
 */
export function getCSVPreview(buffer: Buffer, maxRows = 5): {
  headers: string[];
  preview: Array<Record<string, unknown>>;
  totalRows: number;
  delimiter: string;
  encoding: string;
} {
  const encoding = detectEncoding(buffer);
  let content = decodeBuffer(buffer, encoding);
  const delimiter = detectDelimiter(content);

  const records = parse(content, {
    delimiter,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: encoding === "utf-8-bom",
    relax_quotes: true,
    relax_column_count: true,
  });

  if (!Array.isArray(records) || records.length === 0) {
    return { headers: [], preview: [], totalRows: 0, delimiter, encoding };
  }

  const rawHeaders = Object.keys(records[0]);
  const headers = rawHeaders.map((h) => normalizeColumnName(h));

  const preview: Array<Record<string, unknown>> = [];
  for (let i = 0; i < Math.min(maxRows, records.length); i++) {
    const row: Record<string, unknown> = {};
    rawHeaders.forEach((rawHeader, index) => {
      const normalizedHeader = headers[index] || rawHeader;
      row[normalizedHeader] = cleanValue(records[i][rawHeader]);
    });
    preview.push(row);
  }

  return {
    headers,
    preview,
    totalRows: records.length,
    delimiter,
    encoding,
  };
}
