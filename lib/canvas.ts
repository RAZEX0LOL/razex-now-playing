/**
 * Spotify Canvas resolver (unofficial `canvaz-cache` endpoint), hardened:
 *  - per-track in-memory cache (positive + negative) so we hit the endpoint at most
 *    once per track,
 *  - short timeout and full error isolation (a failure never affects now-playing),
 *  - graceful: returns null when there is no canvas / on any error → widget falls
 *    back to the ambient background,
 *  - toggle with CANVAS_ENABLED=false.
 *
 * Protobuf is hand-encoded/decoded to avoid a fragile dependency.
 */

const ENDPOINT = "https://spclient.wg.spotify.com/canvaz-cache/v0/canvases";
const HIT_TTL = 24 * 3600_000; // canvas rarely changes for a track
const MISS_TTL = 60 * 60_000; // no canvas → don't retry for an hour
const ERR_TTL = 5 * 60_000; // transient error → retry sooner

type Entry = { url: string | null; exp: number };
const cache = new Map<string, Entry>();

const enabled = () => process.env.CANVAS_ENABLED !== "false";

// ---- minimal protobuf ----
function varint(n: number): number[] {
  const o: number[] = [];
  while (n > 0x7f) {
    o.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  o.push(n);
  return o;
}

function encodeRequest(trackUri: string): Buffer {
  const u = Buffer.from(trackUri, "utf8");
  // Entity{ field1: string entity_uri }
  const entity = Buffer.from([0x0a, ...varint(u.length), ...u]);
  // EntityCanvazRequest{ field1: repeated Entity entities }
  return Buffer.from([0x0a, ...varint(entity.length), ...entity]);
}

function readVarint(buf: Buffer, pos: number): [number, number] {
  let r = 0,
    s = 0,
    b: number;
  do {
    b = buf[pos++];
    r |= (b & 0x7f) << s;
    s += 7;
  } while (b & 0x80);
  return [r >>> 0, pos];
}

/** Pull the first canvas url: top-level field1 (canvases) → inner field2 (url). */
function firstCanvasUrl(buf: Buffer): string | null {
  let pos = 0;
  while (pos < buf.length) {
    let tag: number;
    [tag, pos] = readVarint(buf, pos);
    const field = tag >> 3;
    const wt = tag & 7;
    if (wt === 2) {
      let len: number;
      [len, pos] = readVarint(buf, pos);
      const sub = buf.subarray(pos, pos + len);
      pos += len;
      if (field === 1) {
        let p = 0;
        while (p < sub.length) {
          let t: number;
          [t, p] = readVarint(sub, p);
          const f = t >> 3;
          const w = t & 7;
          if (w === 2) {
            let l: number;
            [l, p] = readVarint(sub, p);
            const v = sub.subarray(p, p + l);
            p += l;
            if (f === 2) return v.toString("utf8"); // url
          } else if (w === 0) {
            [, p] = readVarint(sub, p);
          } else if (w === 5) p += 4;
          else if (w === 1) p += 8;
          else break;
        }
      }
    } else if (wt === 0) {
      [, pos] = readVarint(buf, pos);
    } else if (wt === 5) pos += 4;
    else if (wt === 1) pos += 8;
    else break;
  }
  return null;
}

/** Synchronous cache peek. `undefined` = unknown (not fetched yet). */
export function peekCanvas(trackId: string): string | null | undefined {
  const e = cache.get(trackId);
  if (!e) return undefined;
  if (e.exp < Date.now()) {
    cache.delete(trackId);
    return undefined;
  }
  return e.url;
}

/** Resolve + cache the canvas for a track. Never throws. */
export async function resolveCanvas(
  trackId: string,
  accessToken: string,
): Promise<string | null> {
  if (!enabled()) return null;
  const peek = peekCanvas(trackId);
  if (peek !== undefined) return peek;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/protobuf",
        "Content-Type": "application/x-protobuf",
      },
      body: new Uint8Array(encodeRequest(`spotify:track:${trackId}`)),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      cache.set(trackId, { url: null, exp: Date.now() + ERR_TTL });
      return null;
    }
    const url = firstCanvasUrl(Buffer.from(await res.arrayBuffer()));
    cache.set(trackId, {
      url,
      exp: Date.now() + (url ? HIT_TTL : MISS_TTL),
    });
    return url;
  } catch {
    cache.set(trackId, { url: null, exp: Date.now() + ERR_TTL });
    return null;
  }
}
