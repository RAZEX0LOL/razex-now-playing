import type { NowPlaying } from "./types";

/**
 * In-memory pub/sub for now-playing state, keyed by channel (`userId:source`).
 * Fine for a single self-hosted instance. For horizontal scaling, back this with Redis.
 */
type Listener = (np: NowPlaying | null) => void;

const latest = new Map<string, NowPlaying | null>();
const listeners = new Map<string, Set<Listener>>();

export function getLatest(channel: string): NowPlaying | null {
  return latest.get(channel) ?? null;
}

export function publish(channel: string, np: NowPlaying | null): void {
  latest.set(channel, np);
  const set = listeners.get(channel);
  if (set) for (const fn of set) fn(np);
}

export function subscribe(channel: string, fn: Listener): () => void {
  let set = listeners.get(channel);
  if (!set) {
    set = new Set();
    listeners.set(channel, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(channel);
  };
}

export function subscriberCount(channel: string): number {
  return listeners.get(channel)?.size ?? 0;
}
