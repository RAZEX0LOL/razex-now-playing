import type { NextRequest } from "next/server";
import { parseIngestPayload } from "@/lib/ingest";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/store";
import { channelFor } from "@/lib/types";

/**
 * Ingest endpoint for the YouTube Music companion (desktop app / extension).
 * POST { ingestKey, isPlaying, title, artist, album?, albumArt?, durationMs|duration, progressMs|progress }
 */
export async function POST(req: NextRequest) {
  const payload = parseIngestPayload(await req.json().catch(() => null));
  if (!payload) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }
  const conn = await prisma.connection.findUnique({
    where: { ingestKey: payload.ingestKey },
  });
  if (!conn || conn.provider !== "ytmusic") {
    return Response.json({ error: "invalid key" }, { status: 401 });
  }

  publish(channelFor(conn.userId, "ytmusic"), payload.nowPlaying);
  return Response.json({ ok: true });
}
