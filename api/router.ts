import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import {
  transcriptionRouter,
  documentRouter,
  gmailRouter,
} from "./google";
import { openaiRouter } from "./openai-router";
import { driveRouter } from "./drive-router";
import * as crm from "./crm";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,

  // ── CRM ──
  crm: createRouter({
    alerts: crm.alertsRouter,
    cerebro: crm.cerebroRouter,
    dashboard: crm.dashboardRouter,
    documents: crm.documentsRouter,
    import: crm.importRouter,
    interactions: crm.interactionsRouter,
    knowledge: crm.knowledgeRouter,
    leads: crm.leadsRouter,
    offers: crm.offersRouter,
    operations: crm.operationsRouter,
    phone: crm.phoneRouter,
    prequalifications: crm.prequalificationsRouter,
    properties: crm.propertiesRouter,
    reports: crm.reportsRouter,
    reservations: crm.reservationsRouter,
    settings: crm.settingsRouter,
    tasks: crm.tasksRouter,
    users: crm.usersRouter,
    visits: crm.visitsRouter,
  }),

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
