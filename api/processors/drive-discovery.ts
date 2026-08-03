/**
 * Drive Discovery — scan all accessible Google Drive files and enqueue them.
 */

import { google } from "googleapis";
import { GOOGLE_CONFIG, withGoogleRetry } from "../google/config";
import { upsertQueueItem, type DriveQueueItemInput } from "./drive-queue";

// MIME types we care about
export const SUPPORTED_MIME_TYPES = [
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/pdf",
  "application/json",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/opus",
  "audio/mp4",
  "audio/x-m4a",
  "audio/flac",
  "audio/x-flac",
];

function buildMimeQuery(): string {
  return SUPPORTED_MIME_TYPES.map((m) => `mimeType='${m}'`).join(" or ");
}

function parseServiceAccountKey(keyJson: string): any {
  const trimmed = keyJson.trim();
  // Direct JSON
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }
  // Base64-encoded JSON
  return JSON.parse(Buffer.from(trimmed, "base64").toString("utf8"));
}

async function getDriveClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY no configurado");

  const credentials = parseServiceAccountKey(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return google.drive({ version: "v3", auth });
}

export interface DiscoveryResult {
  scanned: number;
  enqueued: number;
  updated: number;
  nextPageToken: string | null;
}

/**
 * Scan Drive and enqueue all supported files.
 * Respects pageToken for resumable scanning.
 */
export async function discoverDriveFiles(
  pageToken?: string,
  pageSize: number = 100
): Promise<DiscoveryResult> {
  const drive = await getDriveClient();
  const mimeQuery = buildMimeQuery();

  const listRes = await withGoogleRetry(() =>
    drive.files.list({
      q: `trashed=false and (${mimeQuery})`,
      pageSize,
      pageToken: pageToken || undefined,
      fields:
        "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, parents, webViewLink, thumbnailLink)",
      orderBy: "modifiedTime desc",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    })
  );

  const files = listRes.data.files || [];
  let enqueued = 0;
  let updated = 0;

  for (const file of files) {
    if (!file.id) continue;

    const input: DriveQueueItemInput = {
      driveFileId: file.id,
      name: file.name || "unknown",
      mimeType: file.mimeType || "application/octet-stream",
      size: file.size || "0",
      folderId: file.parents?.[0],
      webViewLink: file.webViewLink || undefined,
      driveModifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
    };

    await upsertQueueItem(input);
    enqueued++;
  }

  return {
    scanned: files.length,
    enqueued,
    updated,
    nextPageToken: listRes.data.nextPageToken || null,
  };
}
