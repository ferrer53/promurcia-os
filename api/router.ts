import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import {
  transcriptionRouter,
  documentRouter,
  gmailRouter,
} from "./google";
import { openaiRouter } from "./openai-router";
import { driveRouter } from "./drive-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,

  // ── Google Integration ──
  transcription: transcriptionRouter,
  document: documentRouter,
  gmail: gmailRouter,

  // ── OpenAI Deep Analysis ──
  openai: openaiRouter,

  // ── Google Drive Auto Extraction ──
  drive: driveRouter,
});

export type AppRouter = typeof appRouter;
