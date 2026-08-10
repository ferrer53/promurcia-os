/**
 * Drive Content Extractor — download and convert Drive files to text.
 */

import { google } from "googleapis";
import { File } from "node:buffer";
import OpenAI from "openai";
import { GOOGLE_CONFIG, withGoogleRetry } from "../google/config";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

const MAX_TEXT_LENGTH = 25000;
const MAX_WHISPER_FILE_BYTES = 25 * 1024 * 1024;

async function transcribeWithWhisper(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{ transcript: string; duration: number }> {
  if (buffer.length > MAX_WHISPER_FILE_BYTES) {
    throw new Error(
      `Archivo de audio demasiado grande (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Máximo para Whisper: 25 MB.`
    );
  }

  // Whisper infiere el formato a partir de la extensión; conservamos la extensión original.
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.+/g, ".") || "audio.mp3";
  const file = new File([buffer], safeName, { type: mimeType });

  const result = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "es",
    response_format: "json",
  });

  // Whisper no devuelve duración. Estimamos muy aproximadamente para MP3 a 128 kbps.
  const estimatedDuration = Math.round((buffer.length * 8) / 128000);

  return {
    transcript: result.text || "",
    duration: Math.max(0, estimatedDuration),
  };
}

function parseServiceAccountKey(keyJson: string): any {
  const trimmed = keyJson.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }
  return JSON.parse(Buffer.from(trimmed, "base64").toString("utf8"));
}

async function getDriveClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY no configurado");

  const credentials = parseServiceAccountKey(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

export interface ExtractedContent {
  text: string;
  buffer: Buffer;
  mimeType: string;
  pages?: number;
  duration?: number;
  isImage: boolean;
  isAudio: boolean;
}

export function isSpreadsheet(mimeType: string): boolean {
  return (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType.includes("officedocument.spreadsheet")
  );
}

export function isCsv(mimeType: string): boolean {
  return mimeType.includes("csv") || mimeType.includes("text/plain");
}

export function isPdf(mimeType: string): boolean {
  return mimeType.includes("pdf");
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isAudio(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}

export function isJson(mimeType: string): boolean {
  return mimeType.includes("json");
}

/**
 * Export Google Sheet to CSV text.
 */
async function exportSpreadsheet(fileId: string): Promise<{ text: string; buffer: Buffer }> {
  const drive = await getDriveClient();
  const res = await withGoogleRetry(() =>
    drive.files.export(
      { fileId, mimeType: "text/csv" },
      { responseType: "text" }
    )
  );
  const text = String(res.data);
  return { text: text.slice(0, MAX_TEXT_LENGTH), buffer: Buffer.from(text, "utf8") };
}

/**
 * Download binary file as Buffer.
 */
async function downloadBinary(fileId: string): Promise<Buffer> {
  const drive = await getDriveClient();
  const res = await withGoogleRetry(() =>
    drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" })
  );
  return Buffer.from(res.data as ArrayBuffer);
}

/**
 * Extract text from a PDF buffer.
 */
async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const { default: PDFParse } = await import("pdf-parse");
  const parsed = await PDFParse(buffer);
  return {
    text: parsed.text.slice(0, MAX_TEXT_LENGTH),
    pages: parsed.numpages || 1,
  };
}

/**
 * Extract text from an Excel binary buffer.
 */
async function extractExcelText(buffer: Buffer): Promise<string> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, cellText: true });
  let text = "";
  for (const sheetName of workbook.SheetNames) {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
    text += `\n--- HOJA: ${sheetName} ---\n${csv}`;
    if (text.length > MAX_TEXT_LENGTH) break;
  }
  return text.slice(0, MAX_TEXT_LENGTH);
}

/**
 * Extract content from any supported Drive file.
 */
export async function extractDriveContent(
  fileId: string,
  mimeType: string
): Promise<ExtractedContent> {
  // Spreadsheet (Google Sheets)
  if (mimeType.includes("google-apps.spreadsheet")) {
    const { text, buffer } = await exportSpreadsheet(fileId);
    return { text, buffer, mimeType, isImage: false, isAudio: false };
  }

  // PDF
  if (isPdf(mimeType)) {
    const buffer = await downloadBinary(fileId);
    const { text, pages } = await extractPdfText(buffer);
    return { text, buffer, mimeType, pages, isImage: false, isAudio: false };
  }

  // Excel binary
  if (
    mimeType.includes("officedocument.spreadsheetml.sheet") ||
    mimeType.includes("vnd.ms-excel")
  ) {
    const buffer = await downloadBinary(fileId);
    const text = await extractExcelText(buffer);
    return { text, buffer, mimeType, isImage: false, isAudio: false };
  }

  // Audio — transcribe with OpenAI Whisper
  if (isAudio(mimeType)) {
    const buffer = await downloadBinary(fileId);
    const result = await transcribeWithWhisper(buffer, mimeType, `audio-${fileId}`);
    return {
      text: result.transcript.slice(0, MAX_TEXT_LENGTH),
      buffer,
      mimeType,
      duration: result.duration,
      isImage: false,
      isAudio: true,
    };
  }

  // Image
  if (isImage(mimeType)) {
    const buffer = await downloadBinary(fileId);
    return {
      text: "",
      buffer,
      mimeType,
      isImage: true,
      isAudio: false,
    };
  }

  // JSON / CSV / Text
  const buffer = await downloadBinary(fileId);
  const text = buffer.toString("utf8").slice(0, MAX_TEXT_LENGTH);
  return { text, buffer, mimeType, isImage: false, isAudio: false };
}
