#!/usr/bin/env tsx
/**
 * Process Drive Queue — background worker for high-quality Drive ingestion.
 *
 * Usage:
 *   npx tsx scripts/process-drive-queue.ts [discover|process|once]
 *
 * - discover: scan all Drive and enqueue supported files
 * - process:  loop processing one file at a time until stopped
 * - once:     process a single pending file and exit
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { db } from "../db/connection";
import {
  discoverDriveFiles,
  SUPPORTED_MIME_TYPES,
} from "../api/processors/drive-discovery";
import {
  getNextPendingItem,
  updateQueueItem,
  markImported,
  markError,
  getQueueCounts,
  type EntityCreated,
} from "../api/processors/drive-queue";
import {
  extractDriveContent,
  isImage,
  isAudio,
} from "../api/processors/drive-content-extractor";
import {
  analyzeDriveContent,
  analyzeDriveImage,
  analyzeDriveAudio,
  type DriveAIAnalysis,
} from "../api/processors/drive-ai-analyzer";
import { importAnalyzedDriveFile } from "../api/processors/drive-importer";

const LOG_DIR = "/tmp/promurcia-drive";
const LOG_FILE = path.join(LOG_DIR, "queue-processing.log");
const DISCOVERY_STATE_FILE = path.join(LOG_DIR, "discovery-state.json");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message: string, data?: Record<string, unknown>) {
  const line = `[${new Date().toISOString()}] ${message}${data ? " " + JSON.stringify(data) : ""}`;
  console.log(line);
  ensureLogDir();
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDiscovery() {
  log("Iniciando descubrimiento de Drive");
  let pageToken: string | undefined = undefined;
  let totalScanned = 0;
  let totalEnqueued = 0;

  // Load saved pageToken if exists
  if (fs.existsSync(DISCOVERY_STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(DISCOVERY_STATE_FILE, "utf8"));
      pageToken = state.pageToken;
      log("Reanudando descubrimiento desde pageToken guardado");
    } catch {
      // ignore
    }
  }

  do {
    const result = await discoverDriveFiles(pageToken, 100);
    totalScanned += result.scanned;
    totalEnqueued += result.enqueued;
    pageToken = result.nextPageToken || undefined;

    log(`Descubrimiento parcial`, {
      scanned: result.scanned,
      enqueued: result.enqueued,
      totalScanned,
      totalEnqueued,
    });

    // Save state for resumption
    fs.writeFileSync(
      DISCOVERY_STATE_FILE,
      JSON.stringify({ pageToken, totalScanned, totalEnqueued, updatedAt: new Date().toISOString() })
    );

    if (pageToken) await sleep(1000);
  } while (pageToken);

  fs.unlinkSync(DISCOVERY_STATE_FILE);
  log("Descubrimiento completado", { totalScanned, totalEnqueued });
}

async function processOneFile(): Promise<boolean> {
  const item = await getNextPendingItem();
  if (!item) {
    log("No hay archivos pendientes");
    return false;
  }

  log(`Procesando archivo`, {
    id: item.id,
    driveFileId: item.driveFileId,
    name: item.name,
    mimeType: item.mimeType,
    status: item.status,
    retryCount: item.retryCount,
  });

  await updateQueueItem(item.id, { status: "analyzing" });

  try {
    const extracted = await extractDriveContent(item.driveFileId, item.mimeType);
    log("Contenido extraído", {
      textLength: extracted.text.length,
      bufferSize: extracted.buffer.length,
      isImage: extracted.isImage,
      isAudio: extracted.isAudio,
      duration: extracted.duration,
    });

    let analysis: DriveAIAnalysis;
    if (extracted.isImage) {
      analysis = await analyzeDriveImage(item.name, item.mimeType, extracted.buffer);
    } else if (extracted.isAudio) {
      analysis = await analyzeDriveAudio(
        item.name,
        item.mimeType,
        extracted.text,
        extracted.duration
      );
    } else {
      analysis = await analyzeDriveContent(item.name, item.mimeType, extracted);
    }

    await updateQueueItem(item.id, {
      status: "analyzed",
      extractedText: extracted.text.slice(0, 20000),
      aiAnalysisJson: JSON.stringify(analysis),
    });

    log("Análisis IA completado", {
      documentType: analysis.documentType,
      confidence: analysis.confidence,
      leads: analysis.leads.length,
      properties: analysis.properties.length,
      interactions: analysis.interactions.length,
      phones: analysis.phones.length,
    });

    await updateQueueItem(item.id, { status: "importing" });

    const result = await importAnalyzedDriveFile(item, analysis, {
      text: extracted.text,
      isAudio: extracted.isAudio,
      duration: extracted.duration,
    });

    await markImported(item.id, result.entities, result.category);

    log("Importación completada", {
      category: result.category,
      entitiesCreated: result.entities.length,
      errors: result.errors.length,
    });

    if (result.errors.length > 0) {
      log("Errores parciales en importación", { errors: result.errors });
    }

    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Error procesando archivo`, { driveFileId: item.driveFileId, error: msg });
    await markError(item.id, msg);
    return true;
  }
}

async function runProcessLoop() {
  log("Iniciando bucle de procesamiento");
  let consecutiveEmpty = 0;

  while (true) {
    const processed = await processOneFile();
    if (!processed) {
      consecutiveEmpty++;
      const waitMinutes = Math.min(consecutiveEmpty, 5);
      log(`Cola vacía, esperando ${waitMinutes} minutos antes de reintentar`);
      await sleep(waitMinutes * 60 * 1000);
    } else {
      consecutiveEmpty = 0;
      // Pause between files to respect API limits and prioritize quality
      await sleep(3000);
    }

    // Periodic stats every 10 iterations
    if (Math.random() < 0.1) {
      const counts = await getQueueCounts();
      log("Estadísticas de cola", counts);
    }
  }
}

async function main() {
  const mode = process.argv[2] || "process";

  log(`Modo de ejecución: ${mode}`, {
    supportedMimeTypes: SUPPORTED_MIME_TYPES.length,
  });

  try {
    if (mode === "discover") {
      await runDiscovery();
    } else if (mode === "once") {
      await processOneFile();
    } else {
      await runProcessLoop();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Error crítico`, { error: msg });
    process.exit(1);
  } finally {
    // Close DB pool gracefully
    // @ts-ignore
    if (db?.$client?.end) await db.$client.end();
  }
}

main();
