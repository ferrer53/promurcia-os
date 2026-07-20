// ============================================================
// Gmail Lead Capture Service — PromurciaOS
// ============================================================
// Reads unread emails from real-estate portals, parses lead
// data (name, phone, email, message) and marks processed
// messages as read.  Supports major Spanish portals.
// ============================================================

import { getGoogleAuth, GOOGLE_CONFIG, withGoogleRetry, googleLog } from "./config";

export interface ParsedEmail {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  body: string;
  bodyHtml?: string;
  attachments: Array<{
    attachmentId: string;
    filename: string;
    mimeType: string;
    size: number;
  }>;
  labels: string[];
}

export interface ParsedLead {
  portal: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  propertyRef: string;
  propertyUrl: string;
  rawBody: string;
}

// —— Portal detection patterns ——
interface PortalPattern {
  domain: string;
  name: string;
  displayName: string;
}

const PORTAL_PATTERNS: PortalPattern[] = [
  { domain: "idealista.com", name: "idealista", displayName: "Idealista" },
  { domain: "fotocasa.es", name: "fotocasa", displayName: "Fotocasa" },
  { domain: "pisos.com", name: "pisos", displayName: "Pisos.com" },
  { domain: "habitaclia.com", name: "habitaclia", displayName: "Habitaclia" },
  { domain: "mil-anuncios.com", name: "milanuncios", displayName: "Milanuncios" },
  { domain: "yaencontre.com", name: "yaencontre", displayName: "YaEncontre" },
  { domain: "idealista.es", name: "idealista", displayName: "Idealista" },
  { domain: "fotocasa.com", name: "fotocasa", displayName: "Fotocasa" },
];

// —— Regex patterns per portal for lead extraction ——
const LEAD_PATTERNS: Record<
  string,
  {
    name: RegExp[];
    phone: RegExp[];
    email: RegExp[];
    message: RegExp[];
    propertyRef: RegExp[];
    propertyUrl: RegExp[];
  }
> = {
  idealista: {
    name: [
      /Nombre[\s:]*([\w\s]+?)(?:\r?\n|$)/i,
      /De[\s:]*([A-Z][\w\s]+?)(?:\r?\n|$)/i,
    ],
    phone: [
      /Tel[eé]fono[\s:]*([+\d\s\-()]{7,20})/i,
      /Tel[eé]fono[\s:]*([\d\s\-()]{7,20})/i,
    ],
    email: [
      /Email[\s:]*([\w.\-]+@[\w.\-]+\.\w+)/i,
      /Correo[\s:]*([\w.\-]+@[\w.\-]+\.\w+)/i,
    ],
    message: [
      /Mensaje[\s:]*([\s\S]+?)(?:---|Tel[eé]fono|Nombre|Referencia|$)/i,
    ],
    propertyRef: [
      /Referencia[\s:]*([A-Z0-9\-]+)/i,
      /Ref[.:]*\s*([A-Z0-9\-]+)/i,
    ],
    propertyUrl: [
      /(https:\/\/www\.idealista\.com\/[^\s]+)/i,
    ],
  },
  fotocasa: {
    name: [
      /Nombre[\s:]*([\w\s]+?)(?:\r?\n|$)/i,
      /Interesado[\s:]*([A-Z][\w\s]+?)(?:\r?\n|$)/i,
    ],
    phone: [
      /Tel[eé]fono[\s:]*([+\d\s\-()]{7,20})/i,
      /M[oó]vil[\s:]*([+\d\s\-()]{7,20})/i,
    ],
    email: [
      /Email[\s:]*([\w.\-]+@[\w.\-]+\.\w+)/i,
      /e-mail[\s:]*([\w.\-]+@[\w.\-]+\.\w+)/i,
    ],
    message: [
      /Mensaje[\s:]*([\s\S]+?)(?:---|Tel[eé]fono|Nombre|Referencia|$)/i,
    ],
    propertyRef: [
      /Referencia[\s:]*([A-Z0-9\-]+)/i,
    ],
    propertyUrl: [
      /(https:\/\/www\.fotocasa\.es\/[^\s]+)/i,
    ],
  },
  pisos: {
    name: [
      /Nombre[\s:]*([\w\s]+?)(?:\r?\n|$)/i,
    ],
    phone: [
      /Tel[eé]fono[\s:]*([+\d\s\-()]{7,20})/i,
    ],
    email: [
      /Email[\s:]*([\w.\-]+@[\w.\-]+\.\w+)/i,
    ],
    message: [
      /Mensaje[\s:]*([\s\S]+?)(?:---|Tel[eé]fono|Nombre|Referencia|$)/i,
    ],
    propertyRef: [
      /Referencia[\s:]*([A-Z0-9\-]+)/i,
    ],
    propertyUrl: [
      /(https:\/\/www\.pisos\.com\/[^\s]+)/i,
    ],
  },
  habitaclia: {
    name: [
      /Nombre[\s:]*([\w\s]+?)(?:\r?\n|$)/i,
    ],
    phone: [
      /Tel[eé]fono[\s:]*([+\d\s\-()]{7,20})/i,
    ],
    email: [
      /Email[\s:]*([\w.\-]+@[\w.\-]+\.\w+)/i,
    ],
    message: [
      /Mensaje[\s:]*([\s\S]+?)(?:---|Tel[eé]fono|Nombre|Referencia|$)/i,
    ],
    propertyRef: [
      /Referencia[\s:]*([A-Z0-9\-]+)/i,
    ],
    propertyUrl: [
      /(https:\/\/www\.habitaclia\.com\/[^\s]+)/i,
    ],
  },
  milanuncios: {
    name: [
      /Nombre[\s:]*([\w\s]+?)(?:\r?\n|$)/i,
      /Contacto[\s:]*([A-Z][\w\s]+?)(?:\r?\n|$)/i,
    ],
    phone: [
      /Tel[eé]fono[\s:]*([+\d\s\-()]{7,20})/i,
    ],
    email: [
      /Email[\s:]*([\w.\-]+@[\w.\-]+\.\w+)/i,
    ],
    message: [
      /Mensaje[\s:]*([\s\S]+?)(?:---|Tel[eé]fono|Nombre|Referencia|$)/i,
    ],
    propertyRef: [
      /Referencia[\s:]*([A-Z0-9\-]+)/i,
    ],
    propertyUrl: [
      /(https:\/\/www\.mil-anuncios\.com\/[^\s]+)/i,
    ],
  },
  yaencontre: {
    name: [
      /Nombre[\s:]*([\w\s]+?)(?:\r?\n|$)/i,
    ],
    phone: [
      /Tel[eé]fono[\s:]*([+\d\s\-()]{7,20})/i,
    ],
    email: [
      /Email[\s:]*([\w.\-]+@[\w.\-]+\.\w+)/i,
    ],
    message: [
      /Mensaje[\s:]*([\s\S]+?)(?:---|Tel[eé]fono|Nombre|Referencia|$)/i,
    ],
    propertyRef: [
      /Referencia[\s:]*([A-Z0-9\-]+)/i,
    ],
    propertyUrl: [
      /(https:\/\/www\.yaencontre\.com\/[^\s]+)/i,
    ],
  },
};

export class GmailService {
  /**
   * Get unread emails from the configured Gmail account within the last N hours.
   */
  async getUnreadEmails(hours: number = 24): Promise<ParsedEmail[]> {
    const { google } = await import("googleapis");
    const auth = await getGoogleAuth([
      ...GOOGLE_CONFIG.scopes.gmail,
      ...GOOGLE_CONFIG.scopes.gmailModify,
    ]);

    const gmail = google.gmail({ version: "v1", auth });

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const sinceEpoch = Math.floor(since.getTime() / 1000);
    const q = `is:unread after:${sinceEpoch}`;

    googleLog("gmail", `Buscando emails no leidos desde ${since.toISOString()}`);

    return withGoogleRetry(async () => {
      const res = await gmail.users.messages.list({
        userId: GOOGLE_CONFIG.gmail.userId,
        q,
        maxResults: 100,
      });

      const messages = res.data.messages || [];
      googleLog("gmail", `${messages.length} mensajes encontrados`);

      const emails: ParsedEmail[] = [];
      for (const msg of messages) {
        if (!msg.id) continue;
        try {
          const email = await this.getEmailDetails(gmail, msg.id);
          emails.push(email);
        } catch (err) {
          googleLog("gmail", `Error obteniendo mensaje ${msg.id}: ${err}`);
        }
      }

      return emails;
    });
  }

  /**
   * Get full details of a single email message.
   */
  async getEmailDetails(
    gmail: any,
    messageId: string
  ): Promise<ParsedEmail> {
    return withGoogleRetry(async () => {
      const res = await gmail.users.messages.get({
        userId: GOOGLE_CONFIG.gmail.userId,
        id: messageId,
        format: "full",
      });

      const payload = res.data.payload;
      const headers = payload?.headers || [];

      const subject = headers.find((h: any) => h.name === "Subject")?.value || "";
      const from = headers.find((h: any) => h.name === "From")?.value || "";
      const to = headers.find((h: any) => h.name === "To")?.value || "";
      const dateStr = headers.find((h: any) => h.name === "Date")?.value || "";
      const date = new Date(dateStr);

      const { body, bodyHtml, attachments } = this.parsePayload(payload);

      return {
        id: messageId,
        threadId: res.data.threadId || "",
        subject,
        from,
        to,
        date,
        body,
        bodyHtml,
        attachments,
        labels: res.data.labelIds || [],
      };
    });
  }

  /**
   * Recursively parse the message payload to extract text body, HTML body, and attachments.
   */
  private parsePayload(payload: any): {
    body: string;
    bodyHtml: string;
    attachments: ParsedEmail["attachments"];
  } {
    let body = "";
    let bodyHtml = "";
    const attachments: ParsedEmail["attachments"] = [];

    const mimeType = payload?.mimeType || "";

    if (payload?.body?.data) {
      const decoded = Buffer.from(payload.body.data, "base64").toString("utf-8");
      if (mimeType === "text/html") {
        bodyHtml = decoded;
      } else if (mimeType === "text/plain") {
        body = decoded;
      }
    }

    if (payload?.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            attachmentId: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType || "application/octet-stream",
            size: parseInt(part.body.size || "0", 10),
          });
        } else if (part.mimeType === "text/plain" && part.body?.data) {
          body = Buffer.from(part.body.data, "base64").toString("utf-8");
        } else if (part.mimeType === "text/html" && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data, "base64").toString("utf-8");
        } else if (part.parts) {
          // Handle nested multipart
          const nested = this.parsePayload(part);
          if (nested.body) body = nested.body;
          if (nested.bodyHtml) bodyHtml = nested.bodyHtml;
          attachments.push(...nested.attachments);
        }
      }
    }

    return { body, bodyHtml, attachments };
  }

  /**
   * Detect if an email is from a known real-estate portal.
   * Returns the portal name (lowercase) or null.
   */
  detectPortal(email: ParsedEmail): string | null {
    const fromLower = email.from.toLowerCase();
    for (const portal of PORTAL_PATTERNS) {
      if (fromLower.includes(portal.domain)) {
        return portal.name;
      }
    }
    // Also check body for portal signatures
    const bodyLower = (email.body || email.bodyHtml || "").toLowerCase();
    for (const portal of PORTAL_PATTERNS) {
      if (bodyLower.includes(portal.domain)) {
        return portal.name;
      }
    }
    return null;
  }

  /**
   * Get portal display name.
   */
  getPortalDisplayName(portalName: string): string {
    const portal = PORTAL_PATTERNS.find((p) => p.name === portalName);
    return portal?.displayName || portalName;
  }

  /**
   * Parse lead data from a portal email using regex patterns.
   */
  parseLeadFromEmail(email: ParsedEmail, portal: string): ParsedLead | null {
    const patterns = LEAD_PATTERNS[portal];
    if (!patterns) {
      googleLog("gmail", `No hay patrones para el portal: ${portal}`);
      return null;
    }

    const text = email.body || this.htmlToText(email.bodyHtml || "");

    const extract = (regexps: RegExp[]): string => {
      for (const re of regexps) {
        const m = text.match(re);
        if (m && m[1]) {
          return m[1].trim();
        }
      }
      return "";
    };

    const name = extract(patterns.name);
    const phone = this.normalizePhone(extract(patterns.phone));
    const emailAddr = extract(patterns.email);
    const message = extract(patterns.message);
    const propertyRef = extract(patterns.propertyRef);
    const propertyUrl = extract(patterns.propertyUrl);

    // If we couldn't extract at least name or phone, it's likely not a lead email
    if (!name && !phone && !emailAddr) {
      googleLog("gmail", `No se pudo extraer informacion de lead de email=${email.id} portal=${portal}`);
      return null;
    }

    return {
      portal,
      name: name || "Desconocido",
      phone: phone || "",
      email: emailAddr || "",
      message: message || "",
      propertyRef: propertyRef || "",
      propertyUrl: propertyUrl || "",
      rawBody: text.slice(0, 5000), // Keep a snippet for debugging
    };
  }

  /**
   * Fetch and process unread portal emails, returning parsed leads.
   */
  async processPortalEmails(hours: number = 24): Promise<{
    emails: ParsedEmail[];
    leads: Array<{ email: ParsedEmail; lead: ParsedLead }>;
    skipped: ParsedEmail[];
  }> {
    const emails = await this.getUnreadEmails(hours);
    const leads: Array<{ email: ParsedEmail; lead: ParsedLead }> = [];
    const skipped: ParsedEmail[] = [];

    for (const email of emails) {
      const portal = this.detectPortal(email);
      if (!portal) {
        skipped.push(email);
        continue;
      }

      const lead = this.parseLeadFromEmail(email, portal);
      if (lead) {
        leads.push({ email, lead });
      } else {
        skipped.push(email);
      }
    }

    googleLog(
      "gmail",
      `Procesados: ${emails.length} emails, ${leads.length} leads, ${skipped.length} omitidos`
    );

    return { emails, leads, skipped };
  }

  /**
   * Mark a Gmail message as read (remove UNREAD label).
   */
  async markAsRead(messageId: string): Promise<void> {
    const { google } = await import("googleapis");
    const auth = await getGoogleAuth([
      ...GOOGLE_CONFIG.scopes.gmail,
      ...GOOGLE_CONFIG.scopes.gmailModify,
    ]);
    const gmail = google.gmail({ version: "v1", auth });

    googleLog("gmail", `Marcando como leido: ${messageId}`);

    return withGoogleRetry(async () => {
      await gmail.users.messages.modify({
        userId: GOOGLE_CONFIG.gmail.userId,
        id: messageId,
        requestBody: {
          removeLabelIds: ["UNREAD"],
        },
      });
    });
  }

  /**
   * Mark multiple messages as read in batch.
   */
  async markManyAsRead(messageIds: string[]): Promise<void> {
    const { google } = await import("googleapis");
    const auth = await getGoogleAuth([
      ...GOOGLE_CONFIG.scopes.gmail,
      ...GOOGLE_CONFIG.scopes.gmailModify,
    ]);
    const gmail = google.gmail({ version: "v1", auth });

    googleLog("gmail", `Marcando ${messageIds.length} mensajes como leidos`);

    await withGoogleRetry(async () => {
      await gmail.users.messages.batchModify({
        userId: GOOGLE_CONFIG.gmail.userId,
        requestBody: {
          ids: messageIds,
          removeLabelIds: ["UNREAD"],
        },
      });
    });
  }

  /**
   * Download an attachment as a Buffer.
   */
  async downloadAttachment(
    messageId: string,
    attachmentId: string
  ): Promise<Buffer> {
    const { google } = await import("googleapis");
    const auth = await getGoogleAuth([
      ...GOOGLE_CONFIG.scopes.gmail,
    ]);
    const gmail = google.gmail({ version: "v1", auth });

    googleLog("gmail", `Descargando adjunto messageId=${messageId} attachmentId=${attachmentId}`);

    return withGoogleRetry(async () => {
      const res = await gmail.users.messages.attachments.get({
        userId: GOOGLE_CONFIG.gmail.userId,
        messageId,
        id: attachmentId,
      });

      const data = res.data.data;
      if (!data) return Buffer.alloc(0);
      // Gmail attachment data is URL-safe base64
      const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
      return Buffer.from(normalized, "base64");
    });
  }

  /**
   * Get all attachments from an email as buffers.
   */
  async getAttachments(
    messageId: string,
    email?: ParsedEmail
  ): Promise<Array<{ filename: string; data: Buffer; mimeType: string }>> {
    const gmailEmail =
      email || (await this.getEmailDetails((await this.getGmailClient()), messageId));

    const results: Array<{ filename: string; data: Buffer; mimeType: string }> = [];

    for (const att of gmailEmail.attachments) {
      try {
        const data = await this.downloadAttachment(messageId, att.attachmentId);
        results.push({
          filename: att.filename,
          data,
          mimeType: att.mimeType,
        });
      } catch (err) {
        googleLog("gmail", `Error descargando adjunto ${att.filename}: ${err}`);
      }
    }

    return results;
  }

  /**
   * Test the Gmail API connection.
   */
  async testConnection(): Promise<{
    connected: boolean;
    email?: string;
    error?: string;
  }> {
    try {
      const gmail = await this.getGmailClient();
      const profile = await gmail.users.getProfile({
        userId: GOOGLE_CONFIG.gmail.userId,
      });
      return {
        connected: true,
        email: profile.data.emailAddress || undefined,
      };
    } catch (err: any) {
      return {
        connected: false,
        error: err?.message || "Error desconocido",
      };
    }
  }

  // —— Internal helpers ——

  private async getGmailClient(): Promise<any> {
    const { google } = await import("googleapis");
    const auth = await getGoogleAuth([
      ...GOOGLE_CONFIG.scopes.gmail,
      ...GOOGLE_CONFIG.scopes.gmailModify,
    ]);
    return google.gmail({ version: "v1", auth });
  }

  /**
   * Quick-and-dirty HTML to plain text.
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Normalize a phone number — strip spaces and add Spanish prefix if missing.
   */
  private normalizePhone(raw: string): string {
    if (!raw) return "";
    let cleaned = raw.replace(/[\s\-.()]/g, "");
    // If it starts with 6 or 7 and has 9 digits, add +34 prefix
    if (/^[67]\d{8}$/.test(cleaned)) {
      cleaned = "+34" + cleaned;
    }
    return cleaned;
  }
}

export const gmailService = new GmailService();
