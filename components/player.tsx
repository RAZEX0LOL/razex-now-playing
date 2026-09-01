"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DEFAULT_SETTINGS,
  type NowPlaying,
  type WidgetSettings,
} from "@/lib/types";

function fmt(ms: number): string {
  if (!ms || ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const FONT_CLASS: Record<string, string> = {
  sans: "font-sans-w",
  rounded: "font-rounded-w",
  mono: "font-mono-w",
};

type V = {
  np: NowPlaying;
  s: Required<WidgetSettings>;
  pct: number;
  progress: number;
};

function useNowPlaying(token: string) {
  const [np, setNp] = useState<NowPlaying | null>(null);
  const [progress, setProgress] = useState(0);
  const baseRef = useRef({ at: 0, progressMs: 0, playing: false });

  useEffect(() => {
    const es = new EventSource(`/api/stream/${token}`);
    es.onmessage = (e) => {
      const data = e.data ? (JSON.parse(e.data) as NowPlaying | null) : null;
      setNp(data);
      baseRef.current = {
        at: Date.now(),
        progressMs: data?.progressMs ?? 0,
        playing: Boolean(data?.isPlaying),
      };
    };
    return () => es.close();
  }, [token]);

  useEffect(() => {
    const id = setInterval(() => {
      const b = baseRef.current;
      setProgress(b.playing ? b.progressMs + (Date.now() - b.at) : b.progressMs);
    }, 250);
    return () => clearInterval(id);
  }, []);

  return { np, progress };
}

export default function Player({
  token,
  style,
  settings: raw,
}: {
  token: string;
  style: string;
  settings: WidgetSettings;
}) {
  const s = { ...DEFAULT_SETTINGS, ...raw } as Required<WidgetSettings>;
  const { np, progress } = useNowPlaying(token);
  const [visible, setVisible] = useState(true);
  const lastTrack = useRef<string | undefined>(undefined);

  useEffect(() => {
    document.body.classList.add("overlay");
    document.documentElement.style.background = "transparent";
  }, []);

  useEffect(() => {
    if (!s.onlyOnSongSwitch) return;
    const id = np?.trackId ?? np?.title;
    if (id && id !== lastTrack.current) {
      lastTrack.current = id;
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(t);
    }
  }, [np?.trackId, np?.title, s.onlyOnSongSwitch]);

  const hidden =
    !np ||
    (s.hideOnPause && !np.isPlaying) ||
    (s.onlyOnSongSwitch && !visible);

  const pct = np?.durationMs ? Math.min(100, (progress / np.durationMs) * 100) : 0;
  const justify =
    s.position === "center" ? "center" : s.position === "right" ? "flex-end" : "flex-start";
  const origin =
    s.position === "center" ? "bottom center" : s.position === "right" ? "bottom right" : "bottom left";

  const view = { np: np as NowPlaying, s, pct, progress };

  return (
    <div
      style={{ display: "flex", justifyContent: justify, padding: 16 }}
      className={`h-screen w-screen items-end ${FONT_CLASS[s.font] ?? "font-sans-w"}`}
    >
      <AnimatePresence mode="wait">
        {!hidden && np && (
          <motion.div
            key={np.trackId ?? np.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            style={{ transform: `scale(${s.scale})`, transformOrigin: origin }}
          >
            <WidgetView style={style} view={view} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PlayerPreview({
  nowPlaying,
  style,
  settings,
}: {
  nowPlaying: NowPlaying;
  style: string;
  settings: WidgetSettings;
}) {
  const s = { ...DEFAULT_SETTINGS, ...settings } as Required<WidgetSettings>;
  const progress = nowPlaying.progressMs;
  const pct = nowPlaying.durationMs
    ? Math.min(100, (progress / nowPlaying.durationMs) * 100)
    : 0;

  return (
    <div className={FONT_CLASS[s.font] ?? "font-sans-w"}>
      <WidgetView style={style} view={{ np: nowPlaying, s, pct, progress }} />
    </div>
  );
}

function WidgetView({ style, view }: { style: string; view: V }) {
  if (style === "minimal") return <Minimal {...view} />;
  if (style === "vinyl") return <Vinyl {...view} />;
  if (style === "spotify") return <Spotify {...view} />;
  if (style === "bars") return <Bars {...view} />;
  return <Classic {...view} />;
}

/** Card shell with an optional ambient / video / solid background behind the content. */
function VideoBg({ url }: { url: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <video
      src={url}
      autoPlay
      loop
      muted
      playsInline
      aria-hidden
      onError={() => setOk(false)}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
    />
  );
}

function Shell({
  s,
  np,
  width,
  children,
}: {
  s: Required<WidgetSettings>;
  np: NowPlaying;
  width: number;
  children: React.ReactNode;
}) {
  // "video" keeps an ambient base, so there's always a backdrop while the canvas
  // loads or if it fails / the track has none.
  const ambientBase = s.background === "ambient" || s.background === "video";
  return (
    <div
      style={{
        width,
        borderRadius: s.radius,
        background:
          s.background === "solid"
            ? s.bgColor
            : ambientBase
              ? "#0b0b10"
              : "rgba(14,14,20,0.82)",
        backdropFilter: "blur(12px)",
      }}
      className="relative overflow-hidden text-white shadow-2xl"
    >
      {ambientBase && np.albumArt && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={np.albumArt}
          alt=""
          aria-hidden
          className="ambient-pan pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ filter: "blur(22px) brightness(0.55) saturate(1.2)" }}
        />
      )}
      {s.background === "video" && np.canvasUrl && <VideoBg url={np.canvasUrl} />}
      {ambientBase && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
      )}
      <div className="relative p-4">{children}</div>
    </div>
  );
}

function Art({ np, s, className }: { np: NowPlaying; s: Required<WidgetSettings>; className: string }) {
  if (!s.showAlbumArt) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={np.albumArt || ""} alt="" className={className} />;
}

function Progress({ s, pct, progress, np }: V) {
  if (!s.showProgress) return null;
  return (
    <>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div
          style={{ width: `${pct}%`, background: s.accent }}
          className="h-full rounded-full transition-[width] duration-200"
        />
      </div>
      {s.showTimes && (
        <div className="mt-1 flex justify-between text-[11px] text-white/50">
          <span>{fmt(progress)}</span>
          <span>{fmt(np.durationMs)}</span>
        </div>
      )}
    </>
  );
}

function Classic(v: V) {
  return (
    <Shell s={v.s} np={v.np} width={360}>
      <div className="flex items-center gap-4">
        <Art np={v.np} s={v.s} className="h-16 w-16 flex-none rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{v.np.title}</div>
          <div className="truncate text-sm text-white/60">{v.np.artist}</div>
          <Progress {...v} />
        </div>
      </div>
    </Shell>
  );
}

function Spotify(v: V) {
  return (
    <Shell s={v.s} np={v.np} width={360}>
      <div className="flex items-center gap-4">
        <Art np={v.np} s={v.s} className="h-14 w-14 flex-none rounded object-cover" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold">{v.np.title}</div>
          <div className="truncate text-xs uppercase tracking-wide text-white/55">
            {v.np.artist}
          </div>
          <Progress {...v} />
        </div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="#1DB954" className="flex-none">
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.6 14.4a.6.6 0 01-.86.2c-2.35-1.43-5.3-1.76-8.79-.96a.62.62 0 11-.28-1.2c3.8-.87 7.07-.5 9.7 1.1a.62.62 0 01.23.86zm1.23-2.74a.78.78 0 01-1.07.26c-2.7-1.66-6.81-2.14-10-1.17a.78.78 0 11-.45-1.49c3.64-1.1 8.17-.56 11.27 1.34.36.22.48.7.25 1.06zm.1-2.85C14.8 8.94 9.5 8.76 6.45 9.69a.94.94 0 11-.54-1.8c3.5-1.05 9.35-.85 13.04 1.34a.94.94 0 11-.96 1.62z" />
        </svg>
      </div>
    </Shell>
  );
}

function Bars(v: V) {
  return (
    <Shell s={v.s} np={v.np} width={340}>
      <div className="flex items-center gap-4">
        <Art np={v.np} s={v.s} className="h-14 w-14 flex-none rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{v.np.title}</div>
          <div className="truncate text-sm text-white/60">{v.np.artist}</div>
        </div>
        <div className="flex h-10 items-end gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="eq-bar w-1 rounded-full"
              style={{
                height: "100%",
                background: v.s.accent,
                animationDelay: `${i * 0.13}s`,
                animationPlayState: v.np.isPlaying ? "running" : "paused",
              }}
            />
          ))}
        </div>
      </div>
    </Shell>
  );
}

function Vinyl(v: V) {
  return (
    <Shell s={v.s} np={v.np} width={360}>
      <div className="flex items-center gap-4">
        {v.s.showAlbumArt && (
          <motion.img
            src={v.np.albumArt || ""}
            alt=""
            className="h-16 w-16 flex-none rounded-full object-cover"
            animate={{ rotate: v.np.isPlaying ? 360 : 0 }}
            transition={{ repeat: Infinity, ease: "linear", duration: 6 }}
            style={{ outline: `2px solid ${v.s.accent}`, outlineOffset: 2 }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{v.np.title}</div>
          <div className="truncate text-sm text-white/60">{v.np.artist}</div>
          <Progress {...v} />
        </div>
      </div>
    </Shell>
  );
}

function Minimal({ np, s, pct }: V) {
  return (
    <div className="text-white drop-shadow-lg" style={{ minWidth: 220 }}>
      <div className="flex items-center gap-2 text-lg font-medium">
        <span style={{ color: s.accent }}>♪</span>
        <span className="truncate">
          {np.title} <span className="text-white/50">— {np.artist}</span>
        </span>
      </div>
      {s.showProgress && (
        <div className="mt-1 h-0.5 w-full overflow-hidden rounded bg-white/20">
          <div style={{ width: `${pct}%`, background: s.accent }} className="h-full" />
        </div>
      )}
    </div>
  );
}
