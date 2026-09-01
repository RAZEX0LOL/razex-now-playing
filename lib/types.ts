export type Source = "spotify" | "ytmusic";

/** Normalized "now playing" state shared by every source and consumed by the widget. */
export type NowPlaying = {
  isPlaying: boolean;
  title: string;
  artist: string;
  album?: string;
  albumArt?: string;
  /** Spotify Canvas / music video loop (optional, played as a video background). */
  canvasUrl?: string;
  durationMs: number;
  progressMs: number;
  trackId?: string;
  source: Source;
  /** epoch ms when this snapshot was produced (used for client-side progress interpolation) */
  updatedAt: number;
};

export const STYLES = ["classic", "minimal", "vinyl", "spotify", "bars"] as const;
export type Style = (typeof STYLES)[number];

export type Background = "none" | "ambient" | "solid" | "video";
export type FontKind = "sans" | "rounded" | "mono";
export type Position = "left" | "center" | "right";

export type WidgetSettings = {
  // behavior
  hideOnPause?: boolean;
  onlyOnSongSwitch?: boolean;
  // layout
  position?: Position;
  scale?: number; // 0.7 – 1.6
  radius?: number; // card corner radius, px
  font?: FontKind;
  // elements
  showAlbumArt?: boolean;
  showProgress?: boolean;
  showTimes?: boolean;
  // colors / background
  accent?: string; // hex
  background?: Background;
  bgColor?: string; // for solid background
};

export const DEFAULT_SETTINGS: Required<
  Omit<WidgetSettings, "hideOnPause" | "onlyOnSongSwitch">
> &
  Pick<WidgetSettings, "hideOnPause" | "onlyOnSongSwitch"> = {
  hideOnPause: false,
  onlyOnSongSwitch: false,
  position: "left",
  scale: 1,
  radius: 16,
  font: "sans",
  showAlbumArt: true,
  showProgress: true,
  showTimes: true,
  accent: "#7c5cff",
  background: "none",
  bgColor: "#14141d",
};

/** Channel = where now-playing for a given user+source is published. */
export function channelFor(userId: string, source: Source): string {
  return `${userId}:${source}`;
}
