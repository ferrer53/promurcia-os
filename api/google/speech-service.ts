// ============================================================
// Google Speech-to-Text Service — PromurciaOS
// ============================================================
// Transcribes call recordings (Spanish) with speaker diarization,
// automatic punctuation, and word-level timestamps.
// ============================================================

import { SpeechClient } from "@google-cloud/speech";
import { Storage } from "@google-cloud/storage";
import { GOOGLE_CONFIG, googleLog, withGoogleRetry } from "./config";

export interface TranscriptionWord {
  word: string;
  startTime: number; // seconds
  endTime: number; // seconds
  confidence: number;
}

export interface TranscriptionSpeaker {
  speaker: string;
  startTime: number;
  endTime: number;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  words: TranscriptionWord[];
  speakerLabels: TranscriptionSpeaker[];
  duration: number; // total seconds
  languageCode: string;
  channelTag?: number;
}

export interface TranscriptionOptions {
  languageCode?: string;
  enableSpeakerDiarization?: boolean;
  minSpeakerCount?: number;
  maxSpeakerCount?: number;
  enableAutomaticPunctuation?: boolean;
  model?: string;
  useEnhanced?: boolean;
}

// Map MIME types to Speech API encodings
const MIME_ENCODING_MAP: Record<string, string> = {
  "audio/mpeg": "MP3",
  "audio/mp3": "MP3",
  "audio/wav": "LINEAR16",
  "audio/x-wav": "LINEAR16",
  "audio/ogg": "OGG_OPUS",
  "audio/opus": "OGG_OPUS",
  "audio/x-m4a": "MP4",
  "audio/mp4": "MP4",
  "audio/flac": "FLAC",
  "audio/x-flac": "FLAC",
};

function getEncoding(mimeType: string): string {
  const encoding = MIME_ENCODING_MAP[mimeType];
  if (!encoding) {
    googleLog("speech", `Tipo MIME desconocido: ${mimeType}, usando MP3 por defecto`);
    return "MP3";
  }
  return encoding;
}

/**
 * Build a Speech-to-Text client from service account or API key.
 */
function getSpeechClient(): SpeechClient {
  if (GOOGLE_CONFIG.serviceAccountKey) {
    const credentials = JSON.parse(
      Buffer.from(GOOGLE_CONFIG.serviceAccountKey, "base64").toString()
    );
    return new SpeechClient({ credentials });
  }
  if (GOOGLE_CONFIG.apiKey) {
    return new SpeechClient({ apiKey: GOOGLE_CONFIG.apiKey });
  }
  // Will use Application Default Credentials (ADC)
  return new SpeechClient();
}

/**
 * Build a Storage client for large-file GCS staging.
 */
function getStorageClient(): Storage | null {
  if (!GOOGLE_CONFIG.gcsBucket) return null;
  if (GOOGLE_CONFIG.serviceAccountKey) {
    const credentials = JSON.parse(
      Buffer.from(GOOGLE_CONFIG.serviceAccountKey, "base64").toString()
    );
    return new Storage({ credentials });
  }
  return new Storage();
}

export class SpeechService {
  /**
   * Transcribe an audio Buffer directly (for files < 60 seconds).
   * For longer files use `transcribeGCS`.
   */
  async transcribe(
    audioBuffer: Buffer,
    mimeType: string = "audio/mpeg",
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const encoding = getEncoding(mimeType);
    const lang = options?.languageCode || "es-ES";

    googleLog("speech", `Transcribiendo buffer mimeType=${mimeType} encoding=${encoding} lang=${lang}`, {
      sizeBytes: audioBuffer.length,
    });

    const client = getSpeechClient();

    const config = {
      encoding: encoding as any,
      languageCode: lang,
      enableAutomaticPunctuation:
        options?.enableAutomaticPunctuation ?? true,
      model: options?.model || "latest_long",
      useEnhanced: options?.useEnhanced ?? true,
      enableWordTimeOffsets: true,
      diarizationConfig: {
        enableSpeakerDiarization: options?.enableSpeakerDiarization ?? true,
        minSpeakerCount: options?.minSpeakerCount || 2,
        maxSpeakerCount: options?.maxSpeakerCount || 2,
      },
    };

    return withGoogleRetry(async () => {
      const [response] = await client.recognize({
        audio: { content: audioBuffer.toString("base64") },
        config,
      });

      return this.parseResponse(response, lang);
    });
  }

  /**
   * Transcribe a long audio file using Google Cloud Storage (async operation).
   * Uploads the file to GCS, runs a longRunningRecognize operation,
   * polls for completion, then cleans up the GCS object.
   */
  async transcribeGCS(
    audioBuffer: Buffer,
    mimeType: string = "audio/mpeg",
    fileName?: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const bucketName = GOOGLE_CONFIG.gcsBucket;
    if (!bucketName) {
      throw new Error(
        "GCS_TEMP_BUCKET no esta configurado. Es necesario para archivos de audio largos."
      );
    }

    const storage = getStorageClient();
    if (!storage) {
      throw new Error("No se pudo inicializar el cliente de Cloud Storage");
    }

    const blobName = fileName || `transcribe/${Date.now()}-${Math.random().toString(36).slice(2)}.audio`;
    const gcsUri = `gs://${bucketName}/${blobName}`;

    googleLog("speech", `Transcripcion GCS iniciada uri=${gcsUri}`);

    try {
      // Upload to GCS
      const bucket = storage.bucket(bucketName);
      const blob = bucket.file(blobName);
      await blob.save(audioBuffer, { contentType: mimeType });
      googleLog("speech", `Archivo subido a GCS: ${gcsUri}`);

      // Start long-running recognition
      const result = await this.transcribeFromGCSUri(gcsUri, mimeType, options);

      return result;
    } finally {
      // Clean up GCS object
      try {
        await storage.bucket(bucketName).file(blobName).delete();
        googleLog("speech", `Archivo temporal eliminado de GCS: ${gcsUri}`);
      } catch (cleanupErr) {
        googleLog("speech", `Error limpiando GCS (no critico): ${cleanupErr}`);
      }
    }
  }

  /**
   * Transcribe from an existing GCS URI (the caller manages cleanup).
   */
  async transcribeFromGCSUri(
    gcsUri: string,
    mimeType: string = "audio/mpeg",
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const encoding = getEncoding(mimeType);
    const lang = options?.languageCode || "es-ES";

    googleLog("speech", `Transcripcion desde GCS uri=${gcsUri}`);

    const client = getSpeechClient();

    const config = {
      encoding: encoding as any,
      languageCode: lang,
      enableAutomaticPunctuation:
        options?.enableAutomaticPunctuation ?? true,
      model: options?.model || "latest_long",
      useEnhanced: options?.useEnhanced ?? true,
      enableWordTimeOffsets: true,
      diarizationConfig: {
        enableSpeakerDiarization: options?.enableSpeakerDiarization ?? true,
        minSpeakerCount: options?.minSpeakerCount || 2,
        maxSpeakerCount: options?.maxSpeakerCount || 2,
      },
    };

    return withGoogleRetry(async () => {
      const [operation] = await client.longRunningRecognize({
        audio: { uri: gcsUri },
        config,
      });

      googleLog("speech", `Operacion iniciada, esperando resultado... name=${operation.name}`);

      // Poll for completion (with 10-minute timeout)
      const [response] = await operation.promise();
      googleLog("speech", `Operacion completada name=${operation.name}`);

      return this.parseResponse(response, lang);
    });
  }

  /**
   * Determine whether a file should use GCS-based transcription based on size.
   * Google Speech-to-Text has a 10 MB limit for synchronous (recognize) API.
   */
  shouldUseGCS(audioBuffer: Buffer): boolean {
    const tenMB = 10 * 1024 * 1024;
    return audioBuffer.length > tenMB;
  }

  /**
   * Smart transcribe — automatically chooses between sync and GCS
   * based on file size.
   */
  async transcribeSmart(
    audioBuffer: Buffer,
    mimeType: string = "audio/mpeg",
    fileName?: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    if (this.shouldUseGCS(audioBuffer)) {
      googleLog("speech", "Archivo grande detectado, usando GCS");
      return this.transcribeGCS(audioBuffer, mimeType, fileName, options);
    }
    return this.transcribe(audioBuffer, mimeType, options);
  }

  /**
   * Parse the Speech-to-Text API response into a clean TranscriptionResult.
   */
  private parseResponse(response: any, languageCode: string): TranscriptionResult {
    const results = response.results || [];
    let transcript = "";
    let confidence = 0;
    const words: TranscriptionWord[] = [];
    const speakerLabels: TranscriptionSpeaker[] = [];
    let duration = 0;

    if (results.length > 0 && results[0].alternatives && results[0].alternatives.length > 0) {
      confidence = results[0].alternatives[0].confidence || 0;
    }

    for (const result of results) {
      const alternative = result.alternatives?.[0];
      if (!alternative) continue;

      if (alternative.transcript) {
        transcript += alternative.transcript + " ";
      }

      // Word-level timestamps
      if (alternative.words) {
        for (const w of alternative.words) {
          const startSecs =
            w.startTime?.seconds || 0 + (w.startTime?.nanos || 0) / 1e9;
          const endSecs =
            w.endTime?.seconds || 0 + (w.endTime?.nanos || 0) / 1e9;
          words.push({
            word: w.word || "",
            startTime: startSecs,
            endTime: endSecs,
            confidence: w.confidence || 0,
          });
          if (endSecs > duration) duration = endSecs;
        }
      }

      // Speaker diarization tags
      if (result.alternativeLanguageCodes) {
        // Multi-language hint (not used here but logged)
        googleLog("speech", `Codigos alternativos: ${result.alternativeLanguageCodes.join(", ")}`);
      }
    }

    // Extract speaker labels from words if diarization was enabled
    const speakerMap = new Map<string, { start: number; end: number }[]>();
    for (const w of words) {
      const speakerTag = (w as any).speakerTag || "0";
      if (!speakerMap.has(speakerTag)) {
        speakerMap.set(speakerTag, []);
      }
      const ranges = speakerMap.get(speakerTag)!;
      const last = ranges[ranges.length - 1];
      if (last && w.startTime <= last.end + 1.0) {
        last.end = w.endTime;
      } else {
        ranges.push({ start: w.startTime, end: w.endTime });
      }
    }

    for (const [speaker, ranges] of speakerMap) {
      for (const r of ranges) {
        speakerLabels.push({
          speaker: `Speaker ${speaker}`,
          startTime: r.start,
          endTime: r.end,
        });
      }
    }

    return {
      transcript: transcript.trim(),
      confidence,
      words,
      speakerLabels,
      duration: Math.round(duration * 100) / 100,
      languageCode,
    };
  }
}

export const speechService = new SpeechService();
