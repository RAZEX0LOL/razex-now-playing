import { prisma } from "./db";
import type { NowPlaying } from "./types";
import { peekCanvas, resolveCanvas } from "./canvas";
import { tryDecryptSecret } from "./secret-box";
import { getWebToken } from "./spotify-cookie";
import {
  normalizeSpotifyResponse,
  type SpotifyCurrentlyPlaying,
} from "./spotify-response";

const NOW_PLAYING_URL =
  "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode";

/**
 * Access token for the user, minted from their stored `sp_dc` web-player cookie.
 * (The official Web API now requires a Premium app owner, so we read now-playing
 * through the web player session instead.)
 */
async function validAccessToken(userId: string): Promise<string | null> {
  const conn = await prisma.connection.findFirst({
    where: { userId, provider: "spotify" },
  });
  if (!conn?.spDc) return null;
  const spDc = tryDecryptSecret(conn.spDc);
  return spDc ? getWebToken(spDc) : null;
}

// Unofficial web tokens share Spotify's per-IP rate limit; when we get a 429 we
// back off globally until Retry-After elapses instead of hammering the endpoint.
let rateLimitedUntil = 0;

/**
 * Fetch + normalize the user's currently playing track.
 *  - returns null when nothing is playing (genuine idle, 204),
 *  - throws on transient failures (429 / 5xx / network) so the poller keeps the
 *    last published state instead of blanking the widget.
 */
export async function getSpotifyNowPlaying(
  userId: string,
): Promise<NowPlaying | null> {
  if (Date.now() < rateLimitedUntil) throw new Error("spotify-rate-limited");

  const token = await validAccessToken(userId);
  if (!token) return null;

  const res = await fetch(NOW_PLAYING_URL, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 429) {
    const ra = Number(res.headers.get("retry-after")) || 10;
    rateLimitedUntil = Date.now() + (ra + 1) * 1000;
    throw new Error(`spotify-429 (retry-after ${ra}s)`);
  }
  if (res.status === 204 || res.status === 202) return null; // genuinely idle
  if (!res.ok) throw new Error(`spotify-status-${res.status}`); // keep last state

  const data = (await res.json()) as SpotifyCurrentlyPlaying;
  const np = normalizeSpotifyResponse(data);
  if (!np) return null;

  // Canvas (best-effort, cached, never blocks): attach if known, otherwise warm
  // the cache so the next poll carries it.
  if (data.item?.type === "track" && data.item.id) {
    const cached = peekCanvas(data.item.id);
    if (cached) np.canvasUrl = cached;
    else if (cached === undefined) void resolveCanvas(data.item.id, token);
  }

  return np;
}
