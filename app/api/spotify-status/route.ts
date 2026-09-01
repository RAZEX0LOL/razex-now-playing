import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tryDecryptSecret } from "@/lib/secret-box";
import { getWebToken } from "@/lib/spotify-cookie";
import {
  normalizeSpotifyResponse,
  type SpotifyCurrentlyPlaying,
} from "@/lib/spotify-response";

export const runtime = "nodejs";

/**
 * Self-service connection check for the saved Spotify `sp_dc` cookie.
 * Lets the user verify everything works without re-pasting the cookie or reading
 * server logs. Token minting uses open.spotify.com (not rate-limited); the single
 * currently-playing probe may report `rate_limited` transiently.
 *
 * states: none | bad_cookie | playing | idle | rate_limited | error
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("unauthorized", { status: 401 });
  }

  const conn = await prisma.connection.findFirst({
    where: { userId: session.user.id, provider: "spotify" },
  });
  if (!conn?.spDc) return Response.json({ state: "none", tokenOk: false });

  const spDc = tryDecryptSecret(conn.spDc);
  if (!spDc) return Response.json({ state: "bad_cookie", tokenOk: false });

  const token = await getWebToken(spDc);
  if (!token) return Response.json({ state: "bad_cookie", tokenOk: false });

  try {
    const res = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode",
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (res.status === 429) {
      return Response.json({
        state: "rate_limited",
        tokenOk: true,
        retryAfter: Number(res.headers.get("retry-after")) || undefined,
      });
    }
    if (res.status === 204 || res.status === 202) {
      return Response.json({ state: "idle", tokenOk: true });
    }
    if (!res.ok) {
      return Response.json({ state: "error", tokenOk: true, status: res.status });
    }
    const data = (await res.json()) as SpotifyCurrentlyPlaying;
    const nowPlaying = normalizeSpotifyResponse(data);
    return Response.json({
      state: "playing",
      tokenOk: true,
      isPlaying: nowPlaying?.isPlaying ?? false,
      title: nowPlaying?.title ?? "",
      artist: nowPlaying?.artist ?? "",
    });
  } catch {
    return Response.json({ state: "error", tokenOk: true });
  }
}
