// ============================================================
// Google Integration Module — PromurciaOS
// ============================================================
// Central export point for all Google API services, routers,
// configuration and utilities.
//
// Usage:
//   import { driveService, speechService, gmailService } from './google';
//   import { transcriptionRouter, documentRouter, gmailRouter } from './google';
//
// Environment variables required:
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (OAuth 2.0)
//   GOOGLE_SERVICE_ACCOUNT_KEY (base64 JSON, alternative)
//   GOOGLE_PROJECT_ID, GOOGLE_LOCATION (Speech-to-Text)
//   DRIVE_FOLDER_RECORDINGS, DRIVE_FOLDER_DOCUMENTS (Drive folders)
//   GCS_TEMP_BUCKET (for large audio files)
//   GMAIL_USER_ID (usually "me")
// ============================================================

// ── Configuration & utilities ──
export {
  GOOGLE_CONFIG,
  isGoogleConfigured,
  isDriveConfigured,
  isSpeechConfigured,
  isGmailConfigured,
  getGoogleStatus,
  getGoogleAuth,
  generateAuthUrl,
  withGoogleRetry,
  googleLog,
} from "./config";

// ── Google Drive Service ──
export {
  driveService,
  DriveService,
  AUDIO_MIME_TYPES,
  DOCUMENT_MIME_TYPES,
} from "./drive-service";
export type { DriveFile, DriveFolder, DriveFileListOptions } from "./drive-service";

// ── Google Speech-to-Text Service ──
export {
  speechService,
  SpeechService,
} from "./speech-service";
export type {
  TranscriptionResult,
  TranscriptionWord,
  TranscriptionSpeaker,
  TranscriptionOptions,
} from "./speech-service";

// ── Gmail Service ──
export {
  gmailService,
  GmailService,
} from "./gmail-service";
export type { ParsedEmail, ParsedLead } from "./gmail-service";

// ── tRPC Routers ──
export { transcriptionRouter } from "./transcription-router";
export { documentRouter } from "./document-router";
export { gmailRouter } from "./gmail-router";
