import { getSpotifyNowPlaying } from "./spotify";
import { publish, subscriberCount } from "./store";

/**
 * Drives Spotify polling for a channel only while it has live subscribers (open widget SSE streams).
 * YouTube Music does not poll — its companion app pushes via /api/ingest.
 */
const timers = new Map<string, ReturnType<typeof setInterval>>();
// Unofficial web-token path shares Spotify's per-IP rate limit, so we poll
// conservatively (1.5s was fast enough to get the IP throttled).
const POLL_MS = 4000;

function stop(channel: string) {
  const t = timers.get(channel);
  if (t) clearInterval(t);
  timers.delete(channel);
}

export function ensureSpotifyPolling(channel: string): void {
  if (timers.has(channel)) return;
  const userId = channel.split(":")[0];

  const tick = async () => {
    if (subscriberCount(channel) === 0) {
      stop(channel);
      return;
    }
    try {
      publish(channel, await getSpotifyNowPlaying(userId));
    } catch {
      /* transient — keep last state */
    }
  };

  timers.set(channel, setInterval(tick, POLL_MS));
  void tick();
}
