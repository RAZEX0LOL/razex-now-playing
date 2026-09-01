import {
  STYLES,
  type Background,
  type FontKind,
  type Position,
  type Source,
  type Style,
  type WidgetSettings,
} from "./types";

type JsonObject = Record<string, unknown>;

export type WidgetPatch = {
  id: string;
  name?: string;
  style?: Style;
  source?: Source;
  settings?: WidgetSettings;
};

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function oneOf<T extends string>(value: unknown, values: readonly T[]): T | undefined {
  return typeof value === "string" && values.includes(value as T) ? (value as T) : undefined;
}

function numberInRange(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(value, min), max)
    : undefined;
}

function color(value: unknown): string | undefined {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
}

export function sanitizeWidgetSettings(value: unknown): WidgetSettings | undefined {
  const input = asObject(value);
  if (!input) return undefined;

  return {
    ...(typeof input.hideOnPause === "boolean" ? { hideOnPause: input.hideOnPause } : {}),
    ...(typeof input.onlyOnSongSwitch === "boolean"
      ? { onlyOnSongSwitch: input.onlyOnSongSwitch }
      : {}),
    ...(oneOf<Position>(input.position, ["left", "center", "right"])
      ? { position: oneOf<Position>(input.position, ["left", "center", "right"]) }
      : {}),
    ...(numberInRange(input.scale, 0.7, 1.6) !== undefined
      ? { scale: numberInRange(input.scale, 0.7, 1.6) }
      : {}),
    ...(numberInRange(input.radius, 0, 28) !== undefined
      ? { radius: numberInRange(input.radius, 0, 28) }
      : {}),
    ...(oneOf<FontKind>(input.font, ["sans", "rounded", "mono"])
      ? { font: oneOf<FontKind>(input.font, ["sans", "rounded", "mono"]) }
      : {}),
    ...(typeof input.showAlbumArt === "boolean" ? { showAlbumArt: input.showAlbumArt } : {}),
    ...(typeof input.showProgress === "boolean" ? { showProgress: input.showProgress } : {}),
    ...(typeof input.showTimes === "boolean" ? { showTimes: input.showTimes } : {}),
    ...(color(input.accent) ? { accent: color(input.accent) } : {}),
    ...(oneOf<Background>(input.background, ["none", "ambient", "solid", "video"])
      ? { background: oneOf<Background>(input.background, ["none", "ambient", "solid", "video"]) }
      : {}),
    ...(color(input.bgColor) ? { bgColor: color(input.bgColor) } : {}),
  };
}

export function parseWidgetPatch(value: unknown): WidgetPatch | null {
  const input = asObject(value);
  const id = typeof input?.id === "string" ? input.id.trim().slice(0, 100) : "";
  if (!input || !id) return null;

  const name = typeof input.name === "string" ? input.name.trim().slice(0, 60) : undefined;
  const style = oneOf<Style>(input.style, STYLES);
  const source = oneOf<Source>(input.source, ["spotify", "ytmusic"]);
  const settings = input.settings === undefined ? undefined : sanitizeWidgetSettings(input.settings);

  return {
    id,
    ...(name !== undefined ? { name: name || "Untitled widget" } : {}),
    ...(style ? { style } : {}),
    ...(source ? { source } : {}),
    ...(settings ? { settings } : {}),
  };
}
