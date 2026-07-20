// ============================================================
// Gmail Router — PromurciaOS
// ============================================================
// tRPC endpoints for Gmail integration: check connection status,
// read unread emails, parse portal leads, mark as read.
// ============================================================

import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { createTRPCRouter, readOnlyProcedure, comercialProcedure, adminProcedure } from "../lib/trpc";
import { db } from "../../db/connection";
import { leads } from "../../db/schema";
import { gmailService } from "./index";
import { isGmailConfigured, googleLog } from "./config";

// ── Input schemas ──
const getUnreadInput = z
  .object({
    hours: z.number().min(1).max(720).default(24),
    onlyPortals: z.boolean().default(true),
  })
  .optional();

const parseLeadInput = z.object({
  emailId: z.string().min(1, "El ID del email es obligatorio"),
  portal: z.string().min(1, "El portal es obligatorio"),
  markAsRead: z.boolean().default(true),
  autoCreateLead: z.boolean().default(false),
});

const markAsReadInput = z.object({
  messageId: z.string().min(1, "El ID del mensaje es obligatorio"),
});

const batchMarkReadInput = z.object({
  messageIds: z.array(z.string()).min(1),
});

export const gmailRouter = createTRPCRouter({
  // ── 1. Check if Gmail is connected and API is reachable ──
  getStatus: readOnlyProcedure.query(async () => {
    if (!isGmailConfigured()) {
      return {
        configured: false,
        connected: false,
        email: null,
        error: "Gmail no esta configurado. Faltan credenciales de Google.",
      };
    }

    const result = await gmailService.testConnection();
    return {
      configured: true,
      connected: result.connected,
      email: result.email || null,
      error: result.error || null,
    };
  }),

  // ── 2. Get unread emails (optionally filtered to portal leads) ──
  getUnreadEmails: comercialProcedure
    .input(getUnreadInput)
    .query(async ({ input }) => {
      if (!isGmailConfigured()) {
        return {
          emails: [],
          leads: [],
          skipped: [],
          total: 0,
          configured: false,
        };
      }

      const hours = input?.hours || 24;
      const onlyPortals = input?.onlyPortals ?? true;

      try {
        const result = await gmailService.processPortalEmails(hours);

        if (!onlyPortals) {
          // Return all unread emails, not just portal leads
          return {
            emails: result.emails.map((e) => ({
              id: e.id,
              subject: e.subject,
              from: e.from,
              date: e.date,
              bodyPreview: e.body.slice(0, 300),
              portal: gmailService.detectPortal(e),
              hasLead: false,
            })),
            leads: [],
            skipped: [],
            total: result.emails.length,
            configured: true,
          };
        }

        return {
          emails: result.leads.map((l) => ({
            id: l.email.id,
            subject: l.email.subject,
            from: l.email.from,
            date: l.email.date,
            bodyPreview: l.email.body.slice(0, 300),
            portal: l.lead.portal,
            lead: {
              name: l.lead.name,
              phone: l.lead.phone,
              email: l.lead.email,
              message: l.lead.message.slice(0, 200),
              propertyRef: l.lead.propertyRef,
              propertyUrl: l.lead.propertyUrl,
            },
          })),
          leads: result.leads.map((l) => ({
            emailId: l.email.id,
            ...l.lead,
          })),
          skipped: result.skipped.map((e) => ({
            id: e.id,
            subject: e.subject,
            from: e.from,
            reason: "No es email de portal o no se pudo extraer lead",
          })),
          total: result.leads.length,
          configured: true,
        };
      } catch (err: any) {
        const msg = err?.message || "Error obteniendo emails";
        googleLog("gmail", `Error en getUnreadEmails: ${msg}`);
        return {
          emails: [],
          leads: [],
          skipped: [],
          total: 0,
          configured: true,
          error: msg,
        };
      }
    }),

  // ── 3. Parse email and create lead ──
  parseLead: comercialProcedure
    .input(parseLeadInput)
    .mutation(async ({ input, ctx }) => {
      const { emailId, portal, markAsRead: markRead, autoCreateLead } = input;

      // Get full email details
      const { google } = await import("googleapis");
      const { getGoogleAuth } = await import("./config");
      const { GOOGLE_CONFIG } = await import("./config");
      const auth = await getGoogleAuth();
      const gmailClient = (await import("googleapis")).google.gmail({
        version: "v1",
        auth,
      });

      // Fetch email (re-use internal method via fresh fetch)
      const email = await gmailService.getUnreadEmails(168); // last 7 days
      const targetEmail = email.find((e) => e.id === emailId);
      if (!targetEmail) {
        throw new Error("Email no encontrado o ya fue procesado.");
      }

      // Parse lead
      const lead = gmailService.parseLeadFromEmail(targetEmail, portal);
      if (!lead) {
        throw new Error(
          "No se pudo extraer informacion de lead de este email."
        );
      }

      // Auto-create lead in CRM
      let createdLeadId: number | null = null;
      if (autoCreateLead) {
        try {
          // Check for duplicate by email
          if (lead.email) {
            const existing = await db
              .select({ count: sql<number>`count(*)` })
              .from(leads)
              .where(sql`${leads.email} = ${lead.email}`);
            if ((existing[0]?.count ?? 0) > 0) {
              return {
                success: false,
                duplicate: true,
                lead,
                message: `Ya existe un lead con el email ${lead.email}. No se creo duplicado.`,
              };
            }
          }

          const [newLead] = await db
            .insert(leads)
            .values({
              name: lead.name,
              email: lead.email || null,
              phone: lead.phone || null,
              source: portal as any,
              status: "nuevo",
              notes: lead.message || null,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();

          createdLeadId = newLead.id;
        } catch (err: any) {
          googleLog("gmail", `Error creando lead: ${err?.message}`);
        }
      }

      // Mark as read if requested
      if (markRead) {
        try {
          await gmailService.markAsRead(emailId);
        } catch (err: any) {
          googleLog("gmail", `Error marcando como leido: ${err?.message}`);
        }
      }

      return {
        success: true,
        lead,
        createdLeadId,
        markedAsRead: markRead,
        message: autoCreateLead
          ? `Lead creado exitosamente (ID: ${createdLeadId}).`
          : "Lead extraido. Revise los datos antes de crear.",
      };
    }),

  // ── 4. Mark a single email as read ──
  markAsRead: comercialProcedure
    .input(markAsReadInput)
    .mutation(async ({ input }) => {
      await gmailService.markAsRead(input.messageId);
      return { success: true, message: "Email marcado como leido." };
    }),

  // ── 5. Mark multiple emails as read (batch) ──
  batchMarkAsRead: comercialProcedure
    .input(batchMarkReadInput)
    .mutation(async ({ input }) => {
      await gmailService.markManyAsRead(input.messageIds);
      return {
        success: true,
        count: input.messageIds.length,
        message: `${input.messageIds.length} emails marcados como leidos.`,
      };
    }),

  // ── 6. Test Gmail API connection ──
  testConnection: adminProcedure.query(async () => {
    if (!isGmailConfigured()) {
      return {
        configured: false,
        connected: false,
        email: null,
        details: "Faltan variables de entorno para Gmail.",
      };
    }

    const result = await gmailService.testConnection();
    return {
      configured: true,
      connected: result.connected,
      email: result.email || null,
      details: result.connected
        ? `Conectado como ${result.email}`
        : result.error || "Error de conexion",
    };
  }),

  // ── 7. Get supported portals list ──
  getPortals: readOnlyProcedure.query(() => {
    return [
      { id: "idealista", name: "Idealista", domain: "idealista.com" },
      { id: "fotocasa", name: "Fotocasa", domain: "fotocasa.es" },
      { id: "pisos", name: "Pisos.com", domain: "pisos.com" },
      { id: "habitaclia", name: "Habitaclia", domain: "habitaclia.com" },
      { id: "milanuncios", name: "Milanuncios", domain: "mil-anuncios.com" },
      { id: "yaencontre", name: "YaEncontre", domain: "yaencontre.com" },
    ];
  }),

  // ── 8. Preview lead from email without creating it ──
  previewLead: comercialProcedure
    .input(
      z.object({
        emailId: z.string().min(1),
        portal: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      // Fetch from recent emails
      const emails = await gmailService.getUnreadEmails(168);
      const targetEmail = emails.find((e) => e.id === input.emailId);
      if (!targetEmail) {
        throw new Error("Email no encontrado.");
      }

      const lead = gmailService.parseLeadFromEmail(
        targetEmail,
        input.portal
      );
      if (!lead) {
        throw new Error("No se pudo extraer lead del email.");
      }

      // Check for duplicate
      let isDuplicate = false;
      if (lead.email) {
        const existing = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(sql`${leads.email} = ${lead.email}`);
        isDuplicate = (existing[0]?.count ?? 0) > 0;
      }

      return { lead, isDuplicate };
    }),
});
