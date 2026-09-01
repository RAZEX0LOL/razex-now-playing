import { describe, expect, test } from "bun:test";

import { parseWidgetPatch, sanitizeWidgetSettings } from "./widget-input";

describe("widget input", () => {
  test("keeps supported fields and clamps numeric settings", () => {
    expect(
      parseWidgetPatch({
        id: "widget-id",
        name: "  Stream overlay  ",
        style: "vinyl",
        source: "spotify",
        settings: { scale: 99, radius: -4, accent: "#7c5cff", unknown: true },
      }),
    ).toEqual({
      id: "widget-id",
      name: "Stream overlay",
      style: "vinyl",
      source: "spotify",
      settings: { scale: 1.6, radius: 0, accent: "#7c5cff" },
    });
  });

  test("drops unsupported CSS-like values", () => {
    expect(
      sanitizeWidgetSettings({
        accent: "url(https://example.com)",
        background: "javascript:alert(1)",
        position: "absolute",
      }),
    ).toEqual({});
  });

  test("requires a widget id", () => {
    expect(parseWidgetPatch({ style: "classic" })).toBeNull();
  });
});
