import { prisma } from "@/lib/db";
import { channelFor } from "@/lib/types";
import { getLatest, subscribe } from "@/lib/store";
import { ensureSpotifyPolling } from "@/lib/poller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server-Sent Events stream of now-playing for a widget token (public, consumed by the overlay). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const widget = await prisma.widget.findUnique({ where: { token } });
  if (!widget) return new Response("not found", { status: 404 });

  const channel = channelFor(widget.userId, widget.source);
  const encoder = new TextEncoder();
  let unsub = () => {};
  let ping: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      send(getLatest(channel));
      unsub = subscribe(channel, send);
      if (widget.source === "spotify") ensureSpotifyPolling(channel);
      ping = setInterval(
        () => controller.enqueue(encoder.encode(`: ping\n\n`)),
        15_000,
      );
    },
    cancel() {
      clearInterval(ping);
      unsub();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
