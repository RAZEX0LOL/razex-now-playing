import { describe, expect, test } from "bun:test";

import { parseIngestPayload } from "./ingest";

const ingestKey = "0123456789abcdef0123456789abcdef";

describe("YouTube Music ingest", () => {
  test("normalizes a valid companion payload", () => {
    const result = parseIngestPayload({
      ingestKey,
      title: "  Midnight Drive  ",
      artist: "Razex Radio",
      albumArt: "https://example.com/cover.jpg",
      durationMs: 200_000,
      progressMs: 250_000,
    });

    expect(result?.nowPlaying?.title).toBe("Midnight Drive");
    expect(result?.nowPlaying?.progressMs).toBe(200_000);
    expect(result?.nowPlaying?.albumArt).toBe("https://example.com/cover.jpg");
  });

  test("rejects malformed keys and insecure artwork URLs", () => {
    expect(parseIngestPayload({ ingestKey: "short", title: "Track" })).toBeNull();
    const result = parseIngestPayload({
      ingestKey,
      title: "Track",
      albumArt: "http://127.0.0.1/private.jpg",
    });
    expect(result?.nowPlaying?.albumArt).toBeUndefined();
  });

  test("represents an empty title as an idle source", () => {
    expect(parseIngestPayload({ ingestKey, title: null })?.nowPlaying).toBeNull();
  });
});
