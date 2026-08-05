/**
 * Drive Worker — background ingestion loop that runs inside the web process.
 *
 * This module is used both by the standalone CLI script (`scripts/process-drive-queue.ts`)
 * and by the production web server (`api/boot.ts`). When enabled via `DRIVE_WORKER_ENABLED`,
 * it picks one pending Drive file at a time, analyzes it with AI and imports the resulting
 * CRM entities, surviving redeploys because it is part of the main process.
 */

import { db } from "../../db/connection";
import {
  getNextPendingItem,
  updateQueueItem,
  markImported,
  markError,
  getQueueCounts,
  type EntityCreated,
} from "./drive-queue";
import {
  extractDriveContent,
  isImage,
  isAudio,
} from "./drive-content-extractor";
import {
  analyzeDriveContent,
  analyzeDriveImage,
  analyzeDriveAudio,
  type DriveAIAnalysis,
} from "./drive-ai-analyzer";
import { importAnalyzedDriveFile } from "./drive-importer";
import {
  discoverDriveFiles,
  loadDiscoveryState,
  saveDiscoveryState,
  type DiscoveryState,
} from "./drive-discovery";

const DEFAULT_PROCESS_INTERVAL_MS = 3_000;
const DEFAULT_EMPTY_INTERVAL_MS = 30_000;
const DEFAULT_EMPTY_BACKOFF_MAX_MS = 5 * 60 * 1_000;
const DEFAULT_FILE_TIMEOUT_MS = 5 * 60 * 1_000;

let workerStarted = false;
let discoveryStarted = false;

const DEFAULT_DISCOVERY_INTERVAL_MS = 10_000;
const DEFAULT_DISCOVERY_RESTART_INTERVAL_MS = 60 * 60 * 1_000; // 1 hour

export interface WorkerLogger {
  log: (message: string, data?: Record<string, unknown>) => void;
}

const defaultLogger: WorkerLogger = {
  log: (message: string, data?: Record<string, unknown>) => {
    const line = `[drive-worker] [${new Date().toISOString()}] ${message}${data ? " " + JSON.stringify(data) : ""}`;
    console.log(line);
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, context: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${context}`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Process a single pending Drive file end-to-end.
 * Returns `true` if a file was processed (success or failure), `false` if the queue is empty.
 */
export async function processOneDriveFile(logger: WorkerLogger = defaultLogger): Promise<boolean> {
  const item = await getNextPendingItem();
  if (!item) {
    return false;
  }

  logger.log(`Procesando archivo`, {
    id: item.id,
    driveFileId: item.driveFileId,
    name: item.name,
    mimeType: item.mimeType,
    status: item.status,
    retryCount: item.retryCount,
  });

  await updateQueueItem(item.id, { status: "analyzing" });

  try {
    const extracted = await withTimeout(
      extractDriveContent(item.driveFileId, item.mimeType),
      DEFAULT_FILE_TIMEOUT_MS,
      `extract ${item.driveFileId}`
    );

    logger.log("Contenido extraído", {
      textLength: extracted.text.length,
      bufferSize: extracted.buffer.length,
      isImage: extracted.isImage,
      isAudio: extracted.isAudio,
      duration: extracted.duration,
    });

    let analysis: DriveAIAnalysis;
    if (extracted.isImage) {
      analysis = await withTimeout(
        analyzeDriveImage(item.name, item.mimeType, extracted.buffer),
        DEFAULT_FILE_TIMEOUT_MS,
        `analyze image ${item.driveFileId}`
      );
    } else if (extracted.isAudio) {
      analysis = await withTimeout(
        analyzeDriveAudio(item.name, item.mimeType, extracted.text, extracted.duration),
        DEFAULT_FILE_TIMEOUT_MS,
        `analyze audio ${item.driveFileId}`
      );
    } else {
      analysis = await withTimeout(
        analyzeDriveContent(item.name, item.mimeType, extracted),
        DEFAULT_FILE_TIMEOUT_MS,
        `analyze content ${item.driveFileId}`
      );
    }

    await updateQueueItem(item.id, {
      status: "analyzed",
      extractedText: extracted.text.slice(0, 20_000),
      aiAnalysisJson: JSON.stringify(analysis),
    });

    logger.log("Análisis IA completado", {
      documentType: analysis.documentType,
      confidence: analysis.confidence,
      leads: analysis.leads.length,
      properties: analysis.properties.length,
      interactions: analysis.interactions.length,
      phones: analysis.phones.length,
    });

    await updateQueueItem(item.id, { status: "importing" });

    const result = await withTimeout(
      importAnalyzedDriveFile(item, analysis, {
        text: extracted.text,
        isAudio: extracted.isAudio,
        duration: extracted.duration,
      }),
      DEFAULT_FILE_TIMEOUT_MS,
      `import ${item.driveFileId}`
    );

    await markImported(item.id, result.entities, result.category);

    logger.log("Importación completada", {
      category: result.category,
      entitiesCreated: result.entities.length,
      errors: result.errors.length,
    });

    if (result.errors.length > 0) {
      logger.log("Errores parciales en importación", { errors: result.errors });
    }

    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.log(`Error procesando archivo`, { driveFileId: item.driveFileId, error: msg });
    await markError(item.id, msg);
    return true;
  }
}

export interface DriveWorkerOptions {
  processIntervalMs?: number;
  emptyIntervalMs?: number;
  emptyBackoffMaxMs?: number;
  fileTimeoutMs?: number;
  logger?: WorkerLogger;
}

/**
 * Run the worker loop indefinitely. Safe to call from the standalone script.
 */
export async function runDriveWorkerLoop(options: DriveWorkerOptions = {}): Promise<void> {
  const processIntervalMs = options.processIntervalMs ?? DEFAULT_PROCESS_INTERVAL_MS;
  const emptyIntervalMs = options.emptyIntervalMs ?? DEFAULT_EMPTY_INTERVAL_MS;
  const emptyBackoffMaxMs = options.emptyBackoffMaxMs ?? DEFAULT_EMPTY_BACKOFF_MAX_MS;
  const logger = options.logger ?? defaultLogger;

  logger.log("Iniciando bucle de procesamiento");
  let consecutiveEmpty = 0;

  while (true) {
    try {
      const processed = await processOneDriveFile();
      if (!processed) {
        consecutiveEmpty++;
        const waitMs = Math.min(emptyIntervalMs * consecutiveEmpty, emptyBackoffMaxMs);
        logger.log(`Cola vacía, esperando ${Math.round(waitMs / 1000)}s antes de reintentar`);
        await sleep(waitMs);
      } else {
        consecutiveEmpty = 0;
        await sleep(processIntervalMs);
      }

      if (Math.random() < 0.1) {
        const counts = await getQueueCounts();
        logger.log("Estadísticas de cola", counts as unknown as Record<string, unknown>);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.log(`Error crítico en el worker`, { error: msg });
      await sleep(emptyIntervalMs);
    }
  }
}

/**
 * Start the worker loop if enabled.
 * Called once from the web server boot sequence.
 *
 * Note: in the current Render free setup there is only one web instance, so a
 * simple in-process guard is enough. If the app is ever scaled horizontally,
 * replace this with a persistent lease table.
 */
export async function startDriveWorkerIfEnabled(): Promise<void> {
  if (workerStarted) {
    defaultLogger.log("Worker ya está iniciado en este proceso");
    return;
  }

  if (process.env.DRIVE_WORKER_ENABLED !== "true") {
    defaultLogger.log("Worker deshabilitado (DRIVE_WORKER_ENABLED no es 'true')");
    return;
  }

  workerStarted = true;
  defaultLogger.log("Worker de Drive habilitado");

  // Defer a few seconds so the server finishes booting before the worker
  // starts consuming DB cycles.
  const startDelayMs = process.env.DRIVE_WORKER_START_DELAY_MS
    ? parseInt(process.env.DRIVE_WORKER_START_DELAY_MS, 10)
    : 5_000;
  const intervalMs = process.env.DRIVE_WORKER_INTERVAL_MS
    ? parseInt(process.env.DRIVE_WORKER_INTERVAL_MS, 10)
    : undefined;

  setTimeout(() => {
    runDriveWorkerLoop({ emptyIntervalMs: intervalMs }).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      defaultLogger.log("El bucle del worker terminó inesperadamente", { error: msg });
    });
  }, startDelayMs);
}

/**
 * Run one page of Drive discovery and persist the state.
 * Returns true if there are more pages to scan.
 */
export async function runDiscoveryPage(logger: WorkerLogger = defaultLogger): Promise<boolean> {
  const state = await loadDiscoveryState();
  logger.log("Descubriendo página de Drive", {
    pageToken: state.pageToken ? "yes" : "no",
    totalScanned: state.totalScanned,
    totalEnqueued: state.totalEnqueued,
  });

  const result = await discoverDriveFiles(state.pageToken, 100);
  const newState: DiscoveryState = {
    pageToken: result.nextPageToken || undefined,
    totalScanned: state.totalScanned + result.scanned,
    totalEnqueued: state.totalEnqueued + result.enqueued,
  };

  await saveDiscoveryState(newState);

  logger.log("Página de Drive descubierta", {
    scanned: result.scanned,
    enqueued: result.enqueued,
    totalScanned: newState.totalScanned,
    totalEnqueued: newState.totalEnqueued,
    hasMore: !!result.nextPageToken,
  });

  return !!result.nextPageToken;
}

/**
 * Continuously discover Drive files in the background.
 * Scans one page at a time to respect Google API rate limits and keep the
 * processing queue fed with real files. Restarts from the beginning every
 * hour once the full Drive has been scanned.
 */
export async function runDriveDiscoveryLoop(
  logger: WorkerLogger = defaultLogger,
  options: { intervalMs?: number; restartIntervalMs?: number } = {}
): Promise<void> {
  const intervalMs = options.intervalMs ?? DEFAULT_DISCOVERY_INTERVAL_MS;
  const restartIntervalMs = options.restartIntervalMs ?? DEFAULT_DISCOVERY_RESTART_INTERVAL_MS;

  logger.log("Iniciando bucle de descubrimiento de Drive");

  while (true) {
    try {
      const hasMore = await runDiscoveryPage(logger);
      if (!hasMore) {
        logger.log("Descubrimiento de Drive completado; reiniciando en 1 hora para detectar novedades");
        await saveDiscoveryState({ totalScanned: 0, totalEnqueued: 0, completedAt: new Date() });
        await sleep(restartIntervalMs);
      } else {
        await sleep(intervalMs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.log("Error en descubrimiento de Drive", { error: msg });
      await sleep(intervalMs);
    }
  }
}

/**
 * Start the Drive discovery loop if enabled.
 * Called once from the web server boot sequence.
 */
export async function startDriveDiscoveryIfEnabled(): Promise<void> {
  if (discoveryStarted) {
    defaultLogger.log("Descubrimiento ya está iniciado en este proceso");
    return;
  }

  if (process.env.DRIVE_DISCOVERY_ENABLED !== "true") {
    defaultLogger.log("Descubrimiento deshabilitado (DRIVE_DISCOVERY_ENABLED no es 'true')");
    return;
  }

  discoveryStarted = true;
  defaultLogger.log("Descubrimiento de Drive habilitado");

  const startDelayMs = process.env.DRIVE_DISCOVERY_START_DELAY_MS
    ? parseInt(process.env.DRIVE_DISCOVERY_START_DELAY_MS, 10)
    : 10_000;
  const intervalMs = process.env.DRIVE_DISCOVERY_INTERVAL_MS
    ? parseInt(process.env.DRIVE_DISCOVERY_INTERVAL_MS, 10)
    : undefined;

  setTimeout(() => {
    runDriveDiscoveryLoop(defaultLogger, { intervalMs }).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      defaultLogger.log("El bucle de descubrimiento terminó inesperadamente", { error: msg });
    });
  }, startDelayMs);
}
