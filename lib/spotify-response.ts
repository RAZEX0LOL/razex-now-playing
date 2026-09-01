import type { NowPlaying } from "./types";

type SpotifyImage = { url?: string };
type SpotifyArtist = { name?: string };

export type SpotifyCurrentlyPlaying = {
  is_playing?: boolean;
  progress_ms?: number;
  item?: {
    id?: string;
    type?: "track" | "episode" | string;
    name?: string;
    duration_ms?: number;
    artists?: SpotifyArtist[];
    album?: { name?: string; images?: SpotifyImage[] };
    show?: { name?: string };
    images?: SpotifyImage[];
  };
};

export function normalizeSpotifyResponse(
  data: SpotifyCurrentlyPlaying,
  updatedAt = Date.now(),
): NowPlaying | null {
  const item = data.item;
  if (!item) return null;

  const isTrack = item.type === "track";
  return {
    isPlaying: Boolean(data.is_playing),
    title: item.name ?? "",
    artist: isTrack
      ? (item.artists ?? []).map((artist) => artist.name ?? "").filter(Boolean).join(", ")
      : (item.show?.name ?? ""),
    album: isTrack ? item.album?.name : undefined,
    albumArt: (isTrack ? item.album?.images : item.images)?.[0]?.url,
    durationMs: item.duration_ms ?? 0,
    progressMs: data.progress_ms ?? 0,
    trackId: item.id,
    source: "spotify",
    updatedAt,
  };
}
