import type { NowPlaying } from "./types";

type JsonObject = Record<string, unknown>;

export type IngestPayload = {
  ingestKey: string;
  nowPlaying: NowPlaying | null;
};

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function cleanString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanUrl(value: unknown): string | undefined {
  const raw = cleanString(value, 2_048);
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function cleanDuration(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(Math.max(Math.round(number), 0), 24 * 60 * 60 * 1_000);
}

export function parseIngestPayload(value: unknown): IngestPayload | null {
  const body = asObject(value);
  if (!body) return null;

  const ingestKey = cleanString(body.ingestKey, 256);
  if (ingestKey.length < 16) return null;

  const title = cleanString(body.title, 200);
  if (!title) return { ingestKey, nowPlaying: null };

  const durationMs = cleanDuration(body.durationMs ?? body.duration);
  const progressMs = Math.min(
    cleanDuration(body.progressMs ?? body.progress),
    durationMs || Number.MAX_SAFE_INTEGER,
  );

  return {
    ingestKey,
    nowPlaying: {
      isPlaying: body.isPlaying !== false,
      title,
      artist: cleanString(body.artist, 300),
      album: cleanString(body.album, 300) || undefined,
      albumArt: cleanUrl(body.albumArt),
      durationMs,
      progressMs,
      trackId: cleanString(body.trackId, 200) || undefined,
      source: "ytmusic",
      updatedAt: Date.now(),
    },
  };
}
