// ============================================================
// Google API Configuration — PromurciaOS
// ============================================================
// Reads credentials from environment variables.
// Supports both OAuth 2.0 (user-consent) and Service Account
// (server-to-server) authentication flows.
// ============================================================

export const GOOGLE_CONFIG = {
  // OAuth 2.0 credentials (from Google Cloud Console)
  clientId: process.env.GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  redirectUri:
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback",

  // Service account (alternative to OAuth — base64-encoded JSON key)
  serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "",

  // API Key for services that accept it (e.g. Speech-to-Text)
  apiKey: process.env.GOOGLE_API_KEY || "",

  // Project settings
  projectId: process.env.GOOGLE_PROJECT_ID || "",
  location: process.env.GOOGLE_LOCATION || "europe-west1",

  // Scopes required for each service
  scopes: {
    drive: ["https://www.googleapis.com/auth/drive.readonly"],
    gmail: ["https://www.googleapis.com/auth/gmail.readonly"],
    gmailModify: ["https://www.googleapis.com/auth/gmail.modify"],
    speech: ["https://www.googleapis.com/auth/cloud-platform"],
    storage: ["https://www.googleapis.com/auth/devstorage.read_write"],
  },

  // Drive folder IDs used by the CRM
  driveFolders: {
    recordings:
      process.env.DRIVE_FOLDER_RECORDINGS || "", // Call recordings folder
    documents:
      process.env.DRIVE_FOLDER_DOCUMENTS || "", // General documents folder
    contracts:
      process.env.DRIVE_FOLDER_CONTRACTS || "", // Contracts folder
    photos:
      process.env.DRIVE_FOLDER_PHOTOS || "", // Property photos folder
  },

  // GCS bucket for large audio file staging (Speech-to-Text long audio)
  gcsBucket: process.env.GCS_TEMP_BUCKET || "",

  // Gmail settings
  gmail: {
    userId: process.env.GMAIL_USER_ID || "me",
    labelFilter: process.env.GMAIL_LABEL_FILTER || "",
  },

  // Promurcia branding
  branding: {
    primaryColor: "#0a1628",
    accentColor: "#d4a853",
  },
};

/**
 * Returns true when at least one authentication method is fully configured.
 */
export function isGoogleConfigured(): boolean {
  const hasOAuth = !!(
    GOOGLE_CONFIG.clientId && GOOGLE_CONFIG.clientSecret
  );
  const hasServiceAccount = !!GOOGLE_CONFIG.serviceAccountKey;
  return hasOAuth || hasServiceAccount;
}

/**
 * Returns true when the Drive API can be used.
 */
export function isDriveConfigured(): boolean {
  return isGoogleConfigured();
}

/**
 * Returns true when the Speech-to-Text API can be used.
 */
export function isSpeechConfigured(): boolean {
  return isGoogleConfigured() && !!GOOGLE_CONFIG.projectId;
}

/**
 * Returns true when the Gmail API can be used.
 */
export function isGmailConfigured(): boolean {
  return isGoogleConfigured();
}

/**
 * Returns a descriptive status object for the dashboard / health checks.
 */
export function getGoogleStatus() {
  return {
    configured: isGoogleConfigured(),
    drive: isDriveConfigured(),
    speech: isSpeechConfigured(),
    gmail: isGmailConfigured(),
    projectId: GOOGLE_CONFIG.projectId || null,
    folders: {
      recordings: !!GOOGLE_CONFIG.driveFolders.recordings,
      documents: !!GOOGLE_CONFIG.driveFolders.documents,
      contracts: !!GOOGLE_CONFIG.driveFolders.contracts,
      photos: !!GOOGLE_CONFIG.driveFolders.photos,
    },
  };
}

/**
 * Build an authenticated Google API client.
 * Prefers Service Account if available, falls back to OAuth 2.0.
 */
export async function getGoogleAuth(scopes?: string[]) {
  const { google } = await import("googleapis");

  const allScopes = scopes || [
    ...GOOGLE_CONFIG.scopes.drive,
    ...GOOGLE_CONFIG.scopes.gmail,
    ...GOOGLE_CONFIG.scopes.speech,
  ];

  if (GOOGLE_CONFIG.serviceAccountKey) {
    const credentials = JSON.parse(
      Buffer.from(GOOGLE_CONFIG.serviceAccountKey, "base64").toString()
    );
    return new google.auth.GoogleAuth({
      credentials,
      scopes: allScopes,
    });
  }

  // OAuth 2.0 (requires user consent flow)
  return new google.auth.OAuth2(
    GOOGLE_CONFIG.clientId,
    GOOGLE_CONFIG.clientSecret,
    GOOGLE_CONFIG.redirectUri
  );
}

/**
 * Generate an OAuth 2.0 consent URL for the user to authorize the app.
 */
export async function generateAuthUrl(scopes?: string[]) {
  const oauth2Client = await getGoogleAuth(scopes);

  if (!(oauth2Client instanceof (await import("googleapis")).google.auth.OAuth2)) {
    throw new Error(
      "No se puede generar URL de consentimiento con cuenta de servicio. " +
        "Configure GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET para OAuth 2.0."
    );
  }

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes || [
      ...GOOGLE_CONFIG.scopes.drive,
      ...GOOGLE_CONFIG.scopes.gmail,
      ...GOOGLE_CONFIG.scopes.speech,
    ],
    prompt: "consent",
  });
}

/**
 * Retry helper with exponential backoff for Google API quota / rate limits.
 */
export async function withGoogleRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // 429 = Too Many Requests, 403 = Quota exceeded
      const status = error?.status || error?.code;
      const isRateLimit = status === 429 || status === 403;
      const isTransient = status === 500 || status === 502 || status === 503;

      if (!isRateLimit && !isTransient) {
        throw error;
      }

      const delayMs = Math.min(1000 * 2 ** attempt, 30000);
      console.warn(
        `[Google API] Reintento ${attempt + 1}/${maxRetries} tras ${delayMs}ms ` +
          `(status=${status})`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw lastError || new Error("Error desconocido en API de Google tras reintentos");
}

/**
 * Logging helper — all logs include a consistent prefix for filtering.
 */
export function googleLog(
  service: "drive" | "speech" | "gmail" | "config",
  message: string,
  data?: Record<string, unknown>
) {
  const prefix = `[Google:${service}]`;
  if (data) {
    console.log(prefix, message, JSON.stringify(data));
  } else {
    console.log(prefix, message);
  }
}
