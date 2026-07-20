// ============================================================
// Transcription Router — PromurciaOS
// ============================================================
// tRPC endpoints for managing audio transcriptions from Google
// Drive: list recordings, trigger transcription, view results,
// AI analysis, and sync new files.
// ============================================================

import { z } from "zod";
import { eq, desc, and, sql, like, isNull, gte } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import {
  transcriptions,
  transcriptionAnalysis,
  driveSyncLog,
} from "../../db/schema";
import {
  driveService,
  speechService,
  type DriveFile,
} from "./index";
import { GOOGLE_CONFIG, googleLog, isDriveConfigured, isSpeechConfigured } from "./config";

// ── Input schemas — reused across endpoints ──
const listInput = z
  .object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    status: z
      .enum([
        "pending",
        "downloading",
        "transcribing",
        "analyzing",
        "completed",
        "error",
      ])
      .optional(),
    leadId: z.number().optional(),
    propertyId: z.number().optional(),
    search: z.string().optional(),
    folderId: z.string().optional(),
  })
  .optional();

const folderListInput = z
  .object({
    parentId: z.string().default("root"),
  })
  .optional();

const startTranscriptionInput = z.object({
  driveFileId: z.string().min(1, "El ID del archivo es obligatorio"),
  driveFileName: z.string().optional(),
  mimeType: z.string().default("audio/mpeg"),
  folderId: z.string().optional(),
  leadId: z.number().optional(),
  propertyId: z.number().optional(),
});

const analyzeInput = z.object({
  transcriptionId: z.number(),
});

const syncDriveInput = z
  .object({
    folderId: z.string().optional(),
    sinceHours: z.number().min(1).max(720).default(24),
  })
  .optional();

export const transcriptionRouter = createTRPCRouter({
  // ── 1. List Drive folders ──
  listFolders: comercialProcedure
    .input(folderListInput)
    .query(async ({ input }) => {
      if (!isDriveConfigured()) {
        return { folders: [], configured: false };
      }
      const parentId = input?.parentId || "root";
      const folders = await driveService.listFolders(parentId);
      return { folders, configured: true };
    }),

  // ── 2. List audio files (recordings) in a folder ──
  listRecordings: comercialProcedure
    .input(
      z
        .object({
          folderId: z.string().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(200).default(50),
        })
        .optional()
    )
    .query(async ({ input }) => {
      if (!isDriveConfigured()) {
        return { files: [], total: 0, configured: false };
      }

      const folderId =
        input?.folderId || GOOGLE_CONFIG.driveFolders.recordings || "root";
      const files = await driveService.listAudioFiles(folderId);

      // Get already-transcribed file IDs to mark them
      const existing = await db
        .select({
          driveFileId: sql<string>`${transcriptions.driveFileId}`,
        })
        .from(transcriptions)
        .where(sql`${transcriptions.driveFileId} IS NOT NULL`);
      const transcribedIds = new Set(
        existing.map((e) => e.driveFileId).filter(Boolean)
      );

      const enriched = files.map((f: DriveFile) => ({
        ...f,
        alreadyTranscribed: transcribedIds.has(f.id),
      }));

      return {
        files: enriched,
        total: enriched.length,
        configured: true,
      };
    }),

  // ── 3. Start transcribing a file from Drive ──
  startTranscription: comercialProcedure
    .input(startTranscriptionInput)
    .mutation(async ({ input, ctx }) => {
      if (!isDriveConfigured() || !isSpeechConfigured()) {
        throw new Error(
          "Google Drive o Speech-to-Text no estan configurados. " +
            "Contacte al administrador."
        );
      }

      const {
        driveFileId,
        driveFileName,
        mimeType,
        folderId,
        leadId,
        propertyId,
      } = input;

      // Check if already transcribed
      const existing = await db.query.transcriptions.findFirst({
        where: eq(transcriptions.driveFileId, driveFileId),
      });
      if (existing) {
        throw new Error("Este archivo ya fue transcrito anteriormente.");
      }

      // Insert pending record
      const [record] = await db
        .insert(transcriptions)
        .values({
          fileName: driveFileName || driveFileId,
          driveFileId,
          driveFolderId: folderId || GOOGLE_CONFIG.driveFolders.recordings,
          mimeType,
          leadId: leadId || null,
          propertyId: propertyId || null,
          processingStatus: "pending",
          processedBy: ctx.user?.id,
        })
        .returning();

      // Process asynchronously (fire and forget, but catch errors)
      processTranscription(record.id, driveFileId, mimeType).catch((err) => {
        googleLog("speech", `Error en transcripcion async #${record.id}: ${err}`);
      });

      return {
        success: true,
        transcriptionId: record.id,
        message: "Transcripcion iniciada. Se procesara en segundo plano.",
      };
    }),

  // ── 4. Get transcription by ID ──
  getTranscription: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const transcription = await db.query.transcriptions.findFirst({
        where: eq(transcriptions.id, input.id),
      });
      if (!transcription) {
        throw new Error("Transcripcion no encontrada");
      }
      const analysis = await db.query.transcriptionAnalysis.findFirst({
        where: eq(transcriptionAnalysis.transcriptionId, input.id),
      });
      return { transcription, analysis };
    }),

  // ── 5. List transcriptions with filters ──
  listTranscriptions: readOnlyProcedure
    .input(listInput)
    .query(async ({ input }) => {
      const {
        page = 1,
        limit = 20,
        status,
        leadId,
        propertyId,
        search,
        folderId,
      } = input || {};
      const offset = (page - 1) * limit;

      const conditions = [];
      if (status) conditions.push(eq(transcriptions.processingStatus, status));
      if (leadId) conditions.push(eq(transcriptions.leadId, leadId));
      if (propertyId)
        conditions.push(eq(transcriptions.propertyId, propertyId));
      if (folderId)
        conditions.push(eq(transcriptions.driveFolderId, folderId));
      if (search)
        conditions.push(
          orLike(transcriptions.fileName, search)
        );

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        db.query.transcriptions.findMany({
          where,
          limit,
          offset,
          orderBy: desc(transcriptions.createdAt),
        }),
        db
          .select({ count: sql<number>`count(*)` })
          .from(transcriptions)
          .where(where),
      ]);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        page,
        limit,
      };
    }),

  // ── 6. Get transcriptions for a lead ──
  getByLead: readOnlyProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.transcriptions.findMany({
        where: eq(transcriptions.leadId, input.leadId),
        orderBy: desc(transcriptions.createdAt),
      });
      return items;
    }),

  // ── 7. Analyze transcription with AI (sentiment, tasks, summary) ──
  analyze: comercialProcedure
    .input(analyzeInput)
    .mutation(async ({ input }) => {
      const transcription = await db.query.transcriptions.findFirst({
        where: eq(transcriptions.id, input.transcriptionId),
      });
      if (!transcription) {
        throw new Error("Transcripcion no encontrada");
      }
      if (transcription.processingStatus !== "completed") {
        throw new Error(
          "La transcripcion aun no esta completa. Espere a que termine el procesamiento."
        );
      }
      if (!transcription.transcript) {
        throw new Error("La transcripcion no tiene contenido para analizar.");
      }

      // Check if analysis already exists
      const existing = await db.query.transcriptionAnalysis.findFirst({
        where: eq(transcriptionAnalysis.transcriptionId, input.transcriptionId),
      });
      if (existing) {
        return {
          success: true,
          analysisId: existing.id,
          message: "El analisis ya existe. Se devuelve el existente.",
          analysis: existing,
        };
      }

      // Perform analysis
      const analysisResult = performAnalysis(transcription.transcript);

      const [record] = await db
        .insert(transcriptionAnalysis)
        .values({
          transcriptionId: input.transcriptionId,
          sentiment: analysisResult.sentiment,
          sentimentScore: analysisResult.sentimentScore.toFixed(4),
          emotionsJson: JSON.stringify(analysisResult.emotions),
          topicsJson: JSON.stringify(analysisResult.topics),
          actionItemsJson: JSON.stringify(analysisResult.actionItems),
          summary: analysisResult.summary,
          keyPointsJson: JSON.stringify(analysisResult.keyPoints),
          recommendationsJson: JSON.stringify(analysisResult.recommendations),
          speakerRatioJson: JSON.stringify(analysisResult.speakerRatio),
          talkTimeSeconds: String(analysisResult.talkTimeSeconds),
        })
        .returning();

      return {
        success: true,
        analysisId: record.id,
        message: "Analisis completado exitosamente.",
        analysis: record,
      };
    }),

  // ── 8. Sync new recordings from Drive ──
  syncDrive: comercialProcedure
    .input(syncDriveInput)
    .mutation(async ({ input, ctx }) => {
      if (!isDriveConfigured()) {
        throw new Error("Google Drive no esta configurado.");
      }

      const folderId =
        input?.folderId || GOOGLE_CONFIG.driveFolders.recordings;
      if (!folderId) {
        throw new Error(
          "No esta configurada la carpeta de grabaciones (DRIVE_FOLDER_RECORDINGS)"
        );
      }

      const sinceHours = input?.sinceHours || 24;
      const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

      googleLog("drive", `Sincronizando grabaciones desde ${since.toISOString()}`);

      // Get already-transcribed file IDs
      const existingRows = await db
        .select({
          driveFileId: sql<string>`${transcriptions.driveFileId}`,
        })
        .from(transcriptions);
      const existingIds = new Set(
        existingRows.map((r) => r.driveFileId).filter(Boolean) as string[]
      );

      // List recent audio files
      const files = await driveService.listRecentFiles(folderId, since);
      const newFiles = files.filter((f) => !existingIds.has(f.id));

      let transcribed = 0;
      let skipped = 0;
      let errors = 0;

      for (const file of newFiles) {
        try {
          // Insert transcription record
          const [record] = await db
            .insert(transcriptions)
            .values({
              fileName: file.name,
              fileSize: file.size,
              driveFileId: file.id,
              driveFileUrl: file.webViewLink,
              driveFolderId: folderId,
              mimeType: file.mimeType,
              processingStatus: "pending",
              processedBy: ctx.user?.id,
            })
            .returning();

          // Start async transcription
          processTranscription(record.id, file.id, file.mimeType).catch(
            (err) => {
              googleLog(
                "speech",
                `Error transcripcion async #${record.id}: ${err}`
              );
            }
          );

          transcribed++;

          // Log sync action
          await db.insert(driveSyncLog).values({
            folderId,
            fileId: file.id,
            fileName: file.name,
            action: "transcribed",
            mimeType: file.mimeType,
            fileSize: file.size,
          });
        } catch (err: any) {
          errors++;
          googleLog("drive", `Error procesando ${file.name}: ${err}`);
          await db.insert(driveSyncLog).values({
            folderId,
            fileId: file.id,
            fileName: file.name,
            action: "error",
            details: err?.message || "Error desconocido",
          });
        }
      }

      skipped = newFiles.length - transcribed - errors;

      return {
        success: true,
        scanned: files.length,
        newFiles: newFiles.length,
        transcribed,
        skipped,
        errors,
        message: `Sincronizacion completada. ${transcribed} nuevas transcripciones iniciadas.`,
      };
    }),

  // ── 9. Get processing progress for a transcription ──
  getProgress: readOnlyProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const record = await db.query.transcriptions.findFirst({
        where: eq(transcriptions.id, input.id),
      });
      if (!record) {
        throw new Error("Transcripcion no encontrada");
      }
      return {
        id: record.id,
        status: record.processingStatus,
        fileName: record.fileName,
        transcriptLength: record.transcript
          ? record.transcript.length
          : 0,
        wordCount: record.wordCount,
        duration: record.duration,
        errorMessage: record.errorMessage,
        createdAt: record.createdAt,
        processedAt: record.processedAt,
      };
    }),

  // ── 10. Retry a failed transcription ──
  retry: comercialProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const record = await db.query.transcriptions.findFirst({
        where: eq(transcriptions.id, input.id),
      });
      if (!record) throw new Error("Transcripcion no encontrada");
      if (record.processingStatus !== "error") {
        throw new Error("Solo se pueden reintentar transcripciones con error.");
      }
      if (!record.driveFileId) {
        throw new Error("No hay archivo Drive asociado para reintentar.");
      }

      await db
        .update(transcriptions)
        .set({
          processingStatus: "pending",
          errorMessage: null,
          processedBy: ctx.user?.id,
          updatedAt: new Date(),
        })
        .where(eq(transcriptions.id, input.id));

      processTranscription(input.id, record.driveFileId, record.mimeType || "audio/mpeg").catch(
        (err) => {
          googleLog("speech", `Error en reintento #${input.id}: ${err}`);
        }
      );

      return { success: true, message: "Reintento iniciado." };
    }),
});

// ── Internal helpers ──

/**
 * Process a transcription in the background: download file, transcribe, update DB.
 */
async function processTranscription(
  transcriptionId: number,
  driveFileId: string,
  mimeType: string
) {
  try {
    // Update status: downloading
    await db
      .update(transcriptions)
      .set({ processingStatus: "downloading" })
      .where(eq(transcriptions.id, transcriptionId));

    // Download from Drive
    const buffer = await driveService.downloadFile(driveFileId);

    // Update status: transcribing
    await db
      .update(transcriptions)
      .set({ processingStatus: "transcribing" })
      .where(eq(transcriptions.id, transcriptionId));

    // Transcribe
    const result = await speechService.transcribeSmart(buffer, mimeType);

    // Update status: analyzing (with results)
    await db
      .update(transcriptions)
      .set({
        processingStatus: "completed",
        transcript: result.transcript,
        confidence: String(result.confidence),
        duration: String(result.duration),
        wordCount: result.words.length,
        wordsJson: JSON.stringify(result.words),
        speakersJson: JSON.stringify(result.speakerLabels),
        languageCode: result.languageCode,
        speakerCount: result.speakerLabels.length,
        processedAt: new Date(),
      })
      .where(eq(transcriptions.id, transcriptionId));

    googleLog("speech", `Transcripcion #${transcriptionId} completada. ` +
      `${result.words.length} palabras, ${result.duration.toFixed(1)}s`);
  } catch (err: any) {
    const errorMsg = err?.message || "Error desconocido en transcripcion";
    googleLog("speech", `Transcripcion #${transcriptionId} fallo: ${errorMsg}`);
    await db
      .update(transcriptions)
      .set({
        processingStatus: "error",
        errorMessage: errorMsg,
      })
      .where(eq(transcriptions.id, transcriptionId));
  }
}

/**
 * Simple heuristic-based analysis of a transcript.
 * In production, this would call an AI service (OpenAI, etc.)
 */
function performAnalysis(transcript: string) {
  const lower = transcript.toLowerCase();
  const wordCount = transcript.split(/\s+/).length;

  // Sentiment heuristics
  const positiveWords = [
    "bien", "excelente", "perfecto", "genial", "encanta", "interesado",
    "me gusta", "bonito", "ideal", "maravilloso", "fantastico",
  ];
  const negativeWords = [
    "mal", "problema", "caro", "feo", "pequeno", "ruido", "lejos",
    "no me gusta", "malo", "defecto", "averia",
  ];

  let posScore = 0;
  let negScore = 0;
  for (const w of positiveWords) if (lower.includes(w)) posScore++;
  for (const w of negativeWords) if (lower.includes(w)) negScore++;

  let sentiment: string;
  let sentimentScore: number;
  if (posScore > negScore) {
    sentiment = "positive";
    sentimentScore = 0.5 + Math.min(posScore * 0.1, 0.5);
  } else if (negScore > posScore) {
    sentiment = "negative";
    sentimentScore = 0.5 - Math.min(negScore * 0.1, 0.5);
  } else {
    sentiment = "neutral";
    sentimentScore = 0.5;
  }

  // Topic extraction (simple keyword matching)
  const topics: string[] = [];
  if (lower.includes("precio") || lower.includes("euro")) topics.push("precio");
  if (lower.includes("habitacion") || lower.includes("dormitorio"))
    topics.push("habitaciones");
  if (lower.includes("terraza") || lower.includes("jardin"))
    topics.push("exterior");
  if (lower.includes("parking") || lower.includes("garaje"))
    topics.push("parking");
  if (lower.includes("visita")) topics.push("visita");
  if (lower.includes("hipoteca") || lower.includes("financiacion"))
    topics.push("financiacion");
  if (lower.includes("zona") || lower.includes("barrio")) topics.push("zona");
  if (lower.includes("obra") || lower.includes("reforma"))
    topics.push("reforma");
  if (topics.length === 0) topics.push("general");

  // Action items (keyword-based)
  const actionItems: Array<{ task: string; assignee: string; dueDate: string }> = [];
  if (lower.includes("visita"))
    actionItems.push({
      task: "Programar visita a la propiedad",
      assignee: "agente",
      dueDate: "+2d",
    });
  if (lower.includes("documento") || lower.includes("documentacion"))
    actionItems.push({
      task: "Enviar documentacion solicitada",
      assignee: "agente",
      dueDate: "+1d",
    });
  if (lower.includes("hipoteca") || lower.includes("precio"))
    actionItems.push({
      task: "Preparar opciones de financiacion",
      assignee: "admin",
      dueDate: "+3d",
    });

  // Summary (first sentence or first 200 chars)
  const summary =
    transcript.length > 200
      ? transcript.slice(0, 200) + "..."
      : transcript;

  // Key points
  const keyPoints: string[] = [
    `Conversacion de ${wordCount} palabras`,
    `Sentimiento predominante: ${sentiment}`,
    `Temas tratados: ${topics.join(", ")}`,
  ];
  if (lower.includes("precio"))
    keyPoints.push("El cliente menciono el precio");
  if (lower.includes("visita"))
    keyPoints.push("Se discutio una posible visita");

  // Recommendations
  const recommendations: string[] = [];
  if (sentiment === "positive")
    recommendations.push("El cliente muestra interes. Seguimiento prioritario.");
  if (sentiment === "negative")
    recommendations.push("Abordar objeciones del cliente en siguiente contacto.");
  if (topics.includes("precio"))
    recommendations.push("Preparar comparativa de precios de la zona.");
  if (topics.includes("financiacion"))
    recommendations.push("Contactar con entidad bancaria colaboradora.");

  return {
    sentiment,
    sentimentScore,
    emotions: {
      joy: posScore * 0.1,
      anger: negScore * 0.1,
      sadness: 0,
      confidence: sentimentScore,
    },
    topics,
    actionItems,
    summary,
    keyPoints,
    recommendations,
    speakerRatio: { agent: 50, client: 50 },
    talkTimeSeconds: Math.ceil(wordCount * 0.5),
  };
}

// ─— orLike helper for search across nullable string columns —─
function orLike(column: any, search: string) {
  return sql`${column} LIKE ${"%" + search + "%"}`;
}
