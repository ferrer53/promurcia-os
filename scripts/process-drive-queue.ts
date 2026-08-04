#!/usr/bin/env tsx
/**
 * Process Drive Queue — CLI entry point for background Drive ingestion.
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
  processOneDriveFile,
  runDriveWorkerLoop,
  type WorkerLogger,
} from "../api/processors/drive-worker";

const LOG_DIR = "/tmp/promurcia-drive";
const LOG_FILE = path.join(LOG_DIR, "queue-processing.log");
const DISCOVERY_STATE_FILE = path.join(LOG_DIR, "discovery-state.json");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

const scriptLogger: WorkerLogger = {
  log: (message: string, data?: Record<string, unknown>) => {
    const line = `[${new Date().toISOString()}] ${message}${data ? " " + JSON.stringify(data) : ""}`;
    console.log(line);
    ensureLogDir();
    fs.appendFileSync(LOG_FILE, line + "\n");
  },
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runDiscovery() {
  scriptLogger.log("Iniciando descubrimiento de Drive");
  let pageToken: string | undefined = undefined;
  let totalScanned = 0;
  let totalEnqueued = 0;

  // Load saved pageToken if exists
  if (fs.existsSync(DISCOVERY_STATE_FILE)) {
    try {
      const state = JSON.parse(fs.readFileSync(DISCOVERY_STATE_FILE, "utf8"));
      pageToken = state.pageToken;
      scriptLogger.log("Reanudando descubrimiento desde pageToken guardado");
    } catch {
      // ignore
    }
  }

  do {
    const result = await discoverDriveFiles(pageToken, 100);
    totalScanned += result.scanned;
    totalEnqueued += result.enqueued;
    pageToken = result.nextPageToken || undefined;

    scriptLogger.log(`Descubrimiento parcial`, {
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
  scriptLogger.log("Descubrimiento completado", { totalScanned, totalEnqueued });
}

async function main() {
  const mode = process.argv[2] || "process";

  scriptLogger.log(`Modo de ejecución: ${mode}`, {
    supportedMimeTypes: SUPPORTED_MIME_TYPES.length,
  });

  try {
    if (mode === "discover") {
      await runDiscovery();
    } else if (mode === "once") {
      const processed = await processOneDriveFile(scriptLogger);
      scriptLogger.log(processed ? "Procesado un archivo" : "No hay archivos pendientes");
    } else {
      await runDriveWorkerLoop({ logger: scriptLogger });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    scriptLogger.log(`Error crítico`, { error: msg });
    process.exit(1);
  } finally {
    // Close DB pool gracefully
    // @ts-ignore
    if (db?.$client?.end) await db.$client.end();
  }
}

main();
