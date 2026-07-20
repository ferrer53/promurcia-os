// ============================================================
// Google Drive Service — PromurciaOS
// ============================================================
// Provides read-only access to Drive folders containing call
// recordings, documents, contracts and property photos.
// ============================================================

import { getGoogleAuth, GOOGLE_CONFIG, withGoogleRetry, googleLog } from "./config";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink: string;
  parents: string[];
  thumbnailLink?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  fileCount: number;
  modifiedTime: string;
}

export interface DriveFileListOptions {
  folderId: string;
  pageSize?: number;
  mimeTypes?: string[];
  modifiedAfter?: Date;
  searchQuery?: string;
  orderBy?: string;
}

// MIME types considered audio recordings
export const AUDIO_MIME_TYPES = [
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

// MIME types for documents
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
];

export class DriveService {
  /**
   * List files in a folder with optional filtering.
   */
  async listFiles(options: DriveFileListOptions): Promise<DriveFile[]> {
    const {
      folderId,
      pageSize = 100,
      mimeTypes,
      modifiedAfter,
      searchQuery,
      orderBy = "modifiedTime desc",
    } = options;

    const { google } = await import("googleapis");
    const auth = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });

    // Build Drive search query
    const conditions: string[] = [`'${folderId}' in parents`, "trashed = false"];

    if (mimeTypes && mimeTypes.length > 0) {
      const mimeQuery = mimeTypes.map((m) => `mimeType='${m}'`).join(" or ");
      conditions.push(`(${mimeQuery})`);
    }

    if (modifiedAfter) {
      const iso = modifiedAfter.toISOString();
      conditions.push(`modifiedTime > '${iso}'`);
    }

    if (searchQuery) {
      conditions.push(`name contains '${searchQuery.replace(/'/g, "\\'")}'`);
    }

    const q = conditions.join(" and ");
    googleLog("drive", `Listando archivos carpeta=${folderId}`, { q, pageSize });

    return withGoogleRetry(async () => {
      const res = await drive.files.list({
        q,
        pageSize,
        orderBy,
        fields:
          "files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,parents,thumbnailLink)",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      return (res.data.files || []).map((f) => ({
        id: f.id || "",
        name: f.name || "",
        mimeType: f.mimeType || "",
        size: f.size || "0",
        modifiedTime: f.modifiedTime || "",
        createdTime: f.createdTime || "",
        webViewLink: f.webViewLink || "",
        parents: f.parents || [],
        thumbnailLink: f.thumbnailLink || undefined,
      }));
    });
  }

  /**
   * List subfolders inside a parent folder.
   */
  async listFolders(parentId: string = "root"): Promise<DriveFolder[]> {
    const { google } = await import("googleapis");
    const auth = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });

    const q = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    googleLog("drive", `Listando subcarpetas parent=${parentId}`);

    return withGoogleRetry(async () => {
      const res = await drive.files.list({
        q,
        pageSize: 100,
        fields: "files(id,name,modifiedTime)",
        orderBy: "name",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      const folders = res.data.files || [];
      const result: DriveFolder[] = [];

      for (const folder of folders) {
        if (!folder.id) continue;
        const countRes = await drive.files.list({
          q: `'${folder.id}' in parents and trashed = false`,
          pageSize: 1,
          fields: "files(id)",
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
        });
        result.push({
          id: folder.id,
          name: folder.name || "Sin nombre",
          fileCount: (countRes.data.files || []).length,
          modifiedTime: folder.modifiedTime || "",
        });
      }

      return result;
    });
  }

  /**
   * Download a file's binary content as a Buffer.
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    const { google } = await import("googleapis");
    const auth = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });

    googleLog("drive", `Descargando archivo fileId=${fileId}`);

    return withGoogleRetry(async () => {
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
      );
      return Buffer.from(res.data as ArrayBuffer);
    });
  }

  /**
   * Export a Google Workspace file (Docs, Sheets) to a specific MIME type.
   */
  async exportFile(fileId: string, mimeType: string): Promise<Buffer> {
    const { google } = await import("googleapis");
    const auth = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });

    googleLog("drive", `Exportando archivo fileId=${fileId} mimeType=${mimeType}`);

    return withGoogleRetry(async () => {
      const res = await drive.files.export(
        { fileId, mimeType },
        { responseType: "arraybuffer" }
      );
      return Buffer.from(res.data as ArrayBuffer);
    });
  }

  /**
   * Get metadata for a single file.
   */
  async getFileMetadata(fileId: string): Promise<DriveFile> {
    const { google } = await import("googleapis");
    const auth = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });

    googleLog("drive", `Obteniendo metadata fileId=${fileId}`);

    return withGoogleRetry(async () => {
      const res = await drive.files.get({
        fileId,
        fields:
          "id,name,mimeType,size,modifiedTime,createdTime,webViewLink,parents,thumbnailLink",
      });

      const f = res.data;
      return {
        id: f.id || "",
        name: f.name || "",
        mimeType: f.mimeType || "",
        size: f.size || "0",
        modifiedTime: f.modifiedTime || "",
        createdTime: f.createdTime || "",
        webViewLink: f.webViewLink || "",
        parents: f.parents || [],
        thumbnailLink: f.thumbnailLink || undefined,
      };
    });
  }

  /**
   * Search files by name across all accessible Drive.
   */
  async searchFiles(query: string, maxResults: number = 50): Promise<DriveFile[]> {
    const { google } = await import("googleapis");
    const auth = await getGoogleAuth();
    const drive = google.drive({ version: "v3", auth });

    const safeQuery = query.replace(/'/g, "\\'");
    const q = `name contains '${safeQuery}' and trashed = false`;

    googleLog("drive", `Buscando archivos query=${query}`);

    return withGoogleRetry(async () => {
      const res = await drive.files.list({
        q,
        pageSize: maxResults,
        fields:
          "files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,parents,thumbnailLink)",
        orderBy: "name",
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      return (res.data.files || []).map((f) => ({
        id: f.id || "",
        name: f.name || "",
        mimeType: f.mimeType || "",
        size: f.size || "0",
        modifiedTime: f.modifiedTime || "",
        createdTime: f.createdTime || "",
        webViewLink: f.webViewLink || "",
        parents: f.parents || [],
        thumbnailLink: f.thumbnailLink || undefined,
      }));
    });
  }

  /**
   * List files modified after a certain date — useful for syncing recent recordings.
   */
  async listRecentFiles(
    folderId: string,
    since: Date,
    mimeTypes?: string[]
  ): Promise<DriveFile[]> {
    googleLog("drive", `Archivos recientes carpeta=${folderId} desde=${since.toISOString()}`);
    return this.listFiles({ folderId, modifiedAfter: since, mimeTypes });
  }

  /**
   * List audio files (recordings) sorted newest first.
   */
  async listAudioFiles(folderId: string): Promise<DriveFile[]> {
    googleLog("drive", `Listando grabaciones de audio carpeta=${folderId}`);
    return this.listFiles({
      folderId,
      mimeTypes: AUDIO_MIME_TYPES,
      orderBy: "modifiedTime desc",
    });
  }

  /**
   * List document files (PDF, Excel, CSV, Word) in a folder.
   */
  async listDocumentFiles(folderId: string): Promise<DriveFile[]> {
    googleLog("drive", `Listando documentos carpeta=${folderId}`);
    return this.listFiles({
      folderId,
      mimeTypes: DOCUMENT_MIME_TYPES,
      orderBy: "modifiedTime desc",
    });
  }

  /**
   * Get the configured recordings folder contents.
   */
  async getRecordingsFolder(): Promise<{ folderId: string; files: DriveFile[] }> {
    const folderId = GOOGLE_CONFIG.driveFolders.recordings;
    if (!folderId) {
      throw new Error("No esta configurada la carpeta de grabaciones (DRIVE_FOLDER_RECORDINGS)");
    }
    const files = await this.listAudioFiles(folderId);
    return { folderId, files };
  }

  /**
   * Get the configured documents folder contents.
   */
  async getDocumentsFolder(): Promise<{ folderId: string; files: DriveFile[] }> {
    const folderId = GOOGLE_CONFIG.driveFolders.documents;
    if (!folderId) {
      throw new Error("No esta configurada la carpeta de documentos (DRIVE_FOLDER_DOCUMENTS)");
    }
    const files = await this.listDocumentFiles(folderId);
    return { folderId, files };
  }
}

export const driveService = new DriveService();
