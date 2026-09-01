import crypto from "crypto";

/**
 * Exchange a Spotify Web Player `sp_dc` cookie for a short-lived access token.
 * The token carries the logged-in user's scopes, so it can read
 * `/v1/me/player/currently-playing` and the unofficial canvaz-cache endpoint —
 * no developer app and no Premium required (the official Web API now gates app
 * creation behind a Premium owner account).
 *
 * Spotify guards the token endpoint with a TOTP derived from a rotating "cipher"
 * secret. The secret and its version live in env (SPOTIFY_TOTP_SECRET /
 * SPOTIFY_TOTP_VER) so they can be swapped without a rebuild when Spotify rotates
 * them; a working default is baked in.
 */

const TOKEN_URL = "https://open.spotify.com/api/token";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Cipher for TOTP version 61. XOR-transform → decimal-join → (base32 round-trip,
// which is identity for the HMAC key) gives the secret used by the web player.
const DEFAULT_CIPHER = [
  44, 55, 47, 42, 70, 40, 34, 114, 76, 74, 50, 111, 120, 97, 75, 76, 94, 102,
  43, 69, 49, 120, 118, 80, 64, 78,
];

function totpKey(): Buffer {
  const env = process.env.SPOTIFY_TOTP_SECRET;
  const cipher = env
    ? env.split(",").map((n) => parseInt(n.trim(), 10))
    : DEFAULT_CIPHER;
  const transformed = cipher.map((e, t) => e ^ ((t % 33) + 9));
  // pyotp: secret = base32(joined_bytes); TOTP key = base32decode(secret) = joined_bytes
  return Buffer.from(transformed.join(""), "utf8");
}

/** Standard RFC-6238 TOTP (HMAC-SHA1, 6 digits, 30s period) at a given epoch second. */
function totpAt(seconds: number): string {
  const counter = Math.floor(seconds / 30);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", totpKey()).update(msg).digest();
  const off = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[off] & 0x7f) << 24) |
    ((hmac[off + 1] & 0xff) << 16) |
    ((hmac[off + 2] & 0xff) << 8) |
    (hmac[off + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, "0");
}

/** Spotify's server clock (TOTP must match it), read from the response Date header. */
async function serverTimeSec(): Promise<number> {
  try {
    const r = await fetch("https://open.spotify.com/", {
      method: "HEAD",
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    const d = r.headers.get("date");
    if (d) {
      const t = new Date(d).getTime();
      if (!Number.isNaN(t)) return Math.floor(t / 1000);
    }
  } catch {
    /* fall through to local clock */
  }
  return Math.floor(Date.now() / 1000);
}

type Tok = { token: string; exp: number };
const cache = new Map<string, Tok>();

/** Get a (cached) web access token for the given sp_dc cookie. null on failure. */
export async function getWebToken(spDc: string): Promise<string | null> {
  const hit = cache.get(spDc);
  if (hit && hit.exp > Date.now() + 30_000) return hit.token;

  // Retry a couple of times — the token endpoint occasionally blips (429/5xx).
  for (let attempt = 0; attempt < 3; attempt++) {
    const tok = await mintToken(spDc);
    if (tok) return tok;
    if (attempt < 2) await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}

async function mintToken(spDc: string): Promise<string | null> {
  try {
    const sTime = await serverTimeSec();
    const cTime = Date.now();
    const ver = process.env.SPOTIFY_TOTP_VER ?? "61";
    const otp = totpAt(sTime);
    const params = new URLSearchParams({
      reason: "transport",
      productType: "web-player",
      totp: otp,
      totpServer: otp,
      totpVer: ver,
      sTime: String(sTime),
      cTime: String(cTime),
    });
    const res = await fetch(`${TOKEN_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Referer: "https://open.spotify.com/",
        "App-Platform": "WebPlayer",
        Cookie: `sp_dc=${spDc}`,
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      accessToken?: string;
      accessTokenExpirationTimestampMs?: number;
      isAnonymous?: boolean;
    };
    if (!d.accessToken || d.isAnonymous) return null;
    cache.set(spDc, {
      token: d.accessToken,
      exp: d.accessTokenExpirationTimestampMs ?? Date.now() + 50 * 60_000,
    });
    return d.accessToken;
  } catch {
    return null;
  }
}

/** Drop a cached token (call when the cookie is replaced). */
export function clearWebToken(spDc: string): void {
  cache.delete(spDc);
}
