import { describe, expect, test } from "bun:test";

import { normalizeSpotifyResponse } from "./spotify-response";

describe("Spotify response normalization", () => {
  test("normalizes a track response", () => {
    const result = normalizeSpotifyResponse(
      {
        is_playing: true,
        progress_ms: 42_000,
        item: {
          id: "track-id",
          type: "track",
          name: "Midnight Drive",
          duration_ms: 180_000,
          artists: [{ name: "Razex Radio" }, { name: "Guest" }],
          album: { name: "After Hours", images: [{ url: "https://example.com/cover.jpg" }] },
        },
      },
      123,
    );

    expect(result).toMatchObject({
      title: "Midnight Drive",
      artist: "Razex Radio, Guest",
      source: "spotify",
      updatedAt: 123,
    });
  });

  test("returns null when Spotify has no current item", () => {
    expect(normalizeSpotifyResponse({})).toBeNull();
  });
});
