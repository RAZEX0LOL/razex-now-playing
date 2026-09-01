import Link from "next/link";

import { PlayerPreview } from "@/components/player";
import { STYLES, type NowPlaying, type WidgetSettings } from "@/lib/types";

const sample: NowPlaying = {
  isPlaying: true,
  title: "Midnight Drive",
  artist: "Razex Radio",
  album: "After Hours",
  albumArt: "/demo-album.svg",
  durationMs: 224_000,
  progressMs: 91_000,
  trackId: "demo-midnight-drive",
  source: "spotify",
  updatedAt: Date.now(),
};

const settings: WidgetSettings = {
  accent: "#8b5cf6",
  background: "ambient",
  radius: 18,
  showAlbumArt: true,
  showProgress: true,
  showTimes: true,
};

export default function DemoPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <header className="mb-12 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold">
          Razex<span className="brand-text"> Labs</span>
        </Link>
        <Link
          href="/"
          className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm"
        >
          Back to overview
        </Link>
      </header>

      <section className="mb-10 max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
          Live widget styles
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl">One source, five stream-ready looks.</h1>
        <p className="mt-4 text-[var(--color-muted)]">
          Every widget receives the same normalized now-playing event and renders it as a
          transparent OBS browser source.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {STYLES.map((style) => (
          <article
            key={style}
            className={`min-w-0 rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-5 ${
              style === "classic" ? "lg:col-span-2" : ""
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold capitalize">{style}</h2>
              <span className="text-xs text-[var(--color-muted)]">360 × 140 OBS source</span>
            </div>
            <div className="flex min-h-44 items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_top,#25203b,#0e0e16_68%)] p-6">
              <div className="scale-[0.78] sm:scale-100">
                <PlayerPreview nowPlaying={sample} style={style} settings={settings} />
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
