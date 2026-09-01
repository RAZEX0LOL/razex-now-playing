#!/usr/bin/env node
/**
 * Nowave companion for YouTube Music.
 *
 * Integrates with the "YouTube Music Desktop App" (github.com/th-ch/youtube-music
 * or ytmdesktop) Companion Server API v1: it does the one-time auth-code handshake,
 * then polls the player state and pushes it to your Nowave widget.
 *
 *   1. In the YouTube Music desktop app: Settings → enable "Companion Server"
 *      (and "Allow companion authorization").
 *   2. Run this; approve the pairing prompt that appears in the app once.
 *   3. Leave it running while you stream. The token is cached in ~/.nowave-ytm-token.
 *
 * Env:
 *   NOWAVE_URL   = https://nowave.example.com      (your Nowave base URL)
 *   INGEST_KEY   = <from your Nowave dashboard>
 *   YTM_URL      = http://127.0.0.1:9863           (companion server, default)
 *   INTERVAL_MS  = 1500
 *
 * Generic mode: if YTM_STATE_URL is set, it just GETs that JSON and maps it,
 * skipping the th-ch handshake (use for any custom now-playing source).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const NOWAVE_URL = process.env.NOWAVE_URL ?? "http://localhost:3000";
const INGEST_KEY = process.env.INGEST_KEY;
const YTM = (process.env.YTM_URL ?? "http://127.0.0.1:9863").replace(/\/$/, "");
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 1500);
const TOKEN_FILE = join(homedir(), ".nowave-ytm-token");
const APP = { appId: "nowave", appName: "Nowave", appVersion: "1.0.0" };

if (!INGEST_KEY) {
  console.error("Set INGEST_KEY (from your Nowave dashboard).");
  process.exit(1);
}

const j = (r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));

async function getToken() {
  try {
    const t = readFileSync(TOKEN_FILE, "utf8").trim();
    if (t) return t;
  } catch {}
  console.log("Pairing with YouTube Music Desktop — approve the prompt in the app…");
  const { code } = await fetch(`${YTM}/api/v1/auth/requestcode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(APP),
  }).then(j);
  // This call blocks until the user approves in the app.
  const { token } = await fetch(`${YTM}/api/v1/auth/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appId: APP.appId, code }),
  }).then(j);
  writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
  console.log("Paired. Token cached.");
  return token;
}

function mapState(st) {
  const v = st?.video;
  const p = st?.player ?? {};
  if (!v?.title) return { ingestKey: INGEST_KEY, title: null };
  const thumbs = v.thumbnails ?? [];
  return {
    ingestKey: INGEST_KEY,
    isPlaying: p.trackState === 1 || p.trackState === "playing",
    title: v.title,
    artist: v.author ?? "",
    album: v.album ?? "",
    albumArt: thumbs[thumbs.length - 1]?.url ?? "",
    durationMs: Math.round((v.durationSeconds ?? 0) * 1000),
    progressMs: Math.round((p.videoProgress ?? 0) * 1000),
  };
}

async function push(body) {
  await fetch(`${NOWAVE_URL}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

async function main() {
  const generic = process.env.YTM_STATE_URL;
  let token = generic ? null : await getToken();

  console.log(`Nowave YTM companion → ${NOWAVE_URL} (every ${INTERVAL_MS}ms)`);
  setInterval(async () => {
    try {
      if (generic) {
        const raw = await fetch(generic, { signal: AbortSignal.timeout(3000) }).then(j);
        return push(mapState(raw));
      }
      const st = await fetch(`${YTM}/api/v1/state`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      }).then(j);
      await push(mapState(st));
    } catch {
      /* app closed / nothing playing — retry next tick */
    }
  }, INTERVAL_MS);
}

main();
