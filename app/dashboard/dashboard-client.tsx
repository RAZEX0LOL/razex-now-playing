"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_SETTINGS,
  STYLES,
  type Source,
  type WidgetSettings,
} from "@/lib/types";

export type WidgetDTO = {
  id: string;
  token: string;
  name: string;
  style: string;
  source: Source;
  settings: WidgetSettings;
};

const STYLE_OPTS = STYLES.map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1) }));

export default function DashboardClient(props: {
  widgets: WidgetDTO[];
  spotifyName: string | null;
  spotifyConnected: boolean;
  ytIngestKey: string | null;
  appUrl: string;
  signOut: () => Promise<void>;
}) {
  const router = useRouter();
  const base =
    props.appUrl || (typeof window !== "undefined" ? window.location.origin : "");

  const [selId, setSelId] = useState(props.widgets[0]?.id);
  const selected = useMemo(
    () => props.widgets.find((w) => w.id === selId) ?? props.widgets[0],
    [props.widgets, selId],
  );

  const [name, setName] = useState(selected?.name ?? "");
  const [style, setStyle] = useState(selected?.style ?? "classic");
  const [source, setSource] = useState<Source>(selected?.source ?? "spotify");
  const [settings, setSettings] = useState<WidgetSettings>(selected?.settings ?? {});
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [previewKey, setPreviewKey] = useState(0);

  function selectWidget(widget: WidgetDTO) {
    setSelId(widget.id);
    setName(widget.name);
    setStyle(widget.style);
    setSource(widget.source);
    setSettings(widget.settings ?? {});
    setPreviewKey((k) => k + 1);
  }

  const s = { ...DEFAULT_SETTINGS, ...settings };
  function set<K extends keyof WidgetSettings>(k: K, v: WidgetSettings[K]) {
    setSettings((p) => ({ ...p, [k]: v }));
  }

  const widgetUrl = selected ? `${base}/w/${selected.token}` : "";

  async function save() {
    if (!selected) return;
    setStatus("saving");
    await fetch("/api/widget", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, name, style, source, settings }),
    });
    setStatus("saved");
    setPreviewKey((k) => k + 1);
    router.refresh();
    setTimeout(() => setStatus("idle"), 1500);
  }

  async function addWidget() {
    const r = await fetch("/api/widget", { method: "POST" });
    const d = (await r.json()) as { widget?: WidgetDTO };
    router.refresh();
    if (d.widget) selectWidget(d.widget);
  }

  async function removeWidget() {
    if (!selected || props.widgets.length <= 1) return;
    if (!confirm(`Delete "${selected.name}"?`)) return;
    await fetch(`/api/widget?id=${selected.id}`, { method: "DELETE" });
    const next = props.widgets.find((w) => w.id !== selected.id);
    if (next) selectWidget(next);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <span className="text-lg font-bold">
          Razex<span className="brand-text"> Labs</span>
        </span>
        <form action={props.signOut}>
          <button className="text-sm text-[var(--color-muted)] hover:text-white">
            Sign out
          </button>
        </form>
      </header>

      {/* Profiles */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {props.widgets.map((w) => (
          <button
            key={w.id}
            onClick={() => selectWidget(w)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              w.id === selected?.id
                ? "brand-gradient text-white"
                : "border border-[var(--color-border)] text-[var(--color-muted)]"
            }`}
          >
            {w.name}
          </button>
        ))}
        <button
          onClick={addWidget}
          className="rounded-full border border-dashed border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-white"
        >
          + New profile
        </button>
      </div>

      {selected && (
        <>
          <div className="flex items-center gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-lg font-semibold"
            />
            {props.widgets.length > 1 && (
              <button
                onClick={removeWidget}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-red-400 hover:bg-red-400/10"
              >
                Delete
              </button>
            )}
          </div>

          <Card title="Browser source URL">
            <div className="flex gap-2">
              <input
                readOnly
                value={widgetUrl}
                className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(widgetUrl)}
                className="brand-gradient rounded-lg px-4 py-2 text-sm font-medium text-white"
              >
                Copy
              </button>
            </div>
          </Card>

          <Card title="Music source">
            <Segmented
              value={source}
              onChange={(v) => setSource(v as Source)}
              options={[
                { id: "spotify", label: "Spotify" },
                { id: "ytmusic", label: "YouTube Music" },
              ]}
            />
            {source === "spotify" ? (
              <SpotifyConnect connected={props.spotifyConnected} />
            ) : (
              <code className="mt-3 block break-all rounded-lg bg-[var(--color-panel-2)] px-3 py-2 text-xs">
                POST {base}/api/ingest — ingestKey: {props.ytIngestKey ?? "—"}
              </code>
            )}
          </Card>

          <Card title="Style">
            <Segmented value={style} onChange={setStyle} options={STYLE_OPTS} />
          </Card>

          <Card title="Background">
            <Segmented
              value={s.background}
              onChange={(v) => set("background", v as WidgetSettings["background"])}
              options={[
                { id: "none", label: "None" },
                { id: "ambient", label: "Ambient" },
                { id: "solid", label: "Solid" },
                { id: "video", label: "Canvas video" },
              ]}
            />
            {s.background === "solid" && (
              <ColorRow label="Background color" value={s.bgColor} onChange={(v) => set("bgColor", v)} />
            )}
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Ambient = blurred album art glow. Canvas video plays when the source provides one.
            </p>
          </Card>

          <Card title="Look">
            <ColorRow label="Accent color" value={s.accent} onChange={(v) => set("accent", v)} />
            <Row label="Position">
              <Segmented
                value={s.position}
                onChange={(v) => set("position", v as WidgetSettings["position"])}
                options={[
                  { id: "left", label: "Left" },
                  { id: "center", label: "Center" },
                  { id: "right", label: "Right" },
                ]}
              />
            </Row>
            <Row label="Font">
              <Segmented
                value={s.font}
                onChange={(v) => set("font", v as WidgetSettings["font"])}
                options={[
                  { id: "sans", label: "Sans" },
                  { id: "rounded", label: "Rounded" },
                  { id: "mono", label: "Mono" },
                ]}
              />
            </Row>
            <Range label={`Scale ${s.scale.toFixed(2)}×`} min={0.7} max={1.6} step={0.05}
              value={s.scale} onChange={(v) => set("scale", v)} />
            <Range label={`Corner radius ${s.radius}px`} min={0} max={28} step={1}
              value={s.radius} onChange={(v) => set("radius", v)} />
          </Card>

          <Card title="Elements & behavior">
            <div className="space-y-3 text-sm">
              <Toggle label="Show album art" checked={s.showAlbumArt} onChange={(v) => set("showAlbumArt", v)} />
              <Toggle label="Show progress bar" checked={s.showProgress} onChange={(v) => set("showProgress", v)} />
              <Toggle label="Show time codes" checked={s.showTimes} onChange={(v) => set("showTimes", v)} />
              <Toggle label="Hide when paused" checked={!!s.hideOnPause} onChange={(v) => set("hideOnPause", v)} />
              <Toggle label="Only show on song switch (8s)" checked={!!s.onlyOnSongSwitch} onChange={(v) => set("onlyOnSongSwitch", v)} />
            </div>
          </Card>

          <Card title="Preview">
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[linear-gradient(45deg,#1a1a26_25%,transparent_25%,transparent_75%,#1a1a26_75%),linear-gradient(45deg,#1a1a26_25%,#13131c_25%,#13131c_75%,#1a1a26_75%)] [background-position:0_0,10px_10px] [background-size:20px_20px]">
              <iframe key={previewKey} src={`/w/${selected.token}`} className="h-[200px] w-full" title="preview" />
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Updates on Save. Play something on your source to see live data.
            </p>
          </Card>

          <div className="sticky bottom-4 mt-6">
            <button
              onClick={save}
              className="brand-gradient rounded-full px-6 py-3 font-semibold text-white"
            >
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save changes"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

type StatusResp = {
  state: "none" | "bad_cookie" | "playing" | "idle" | "rate_limited" | "error";
  tokenOk?: boolean;
  isPlaying?: boolean;
  title?: string;
  artist?: string;
  retryAfter?: number;
};

function statusMessage(s: StatusResp): { ok: boolean; text: string } {
  switch (s.state) {
    case "playing":
      return { ok: true, text: `✓ Connected — now playing: ${s.title} — ${s.artist}` };
    case "idle":
      return { ok: true, text: "✓ Connected & token works. Nothing playing right now — start a song in Spotify." };
    case "rate_limited":
      return {
        ok: true,
        text: `✓ Cookie works, but Spotify is rate-limiting right now${s.retryAfter ? ` (try again in ~${s.retryAfter}s)` : ""}. The widget will catch up automatically.`,
      };
    case "bad_cookie":
      return { ok: false, text: "✗ Cookie didn't return a token. Paste a fresh sp_dc (must be logged in to open.spotify.com)." };
    case "none":
      return { ok: false, text: "No cookie saved yet — paste your sp_dc below." };
    default:
      return { ok: false, text: "Couldn't reach Spotify, try again in a minute." };
  }
}

function SpotifyConnect({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | { connected: boolean; valid: boolean }>(null);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<StatusResp | null>(null);

  async function save(spDc: string) {
    setBusy(true);
    setResult(null);
    setStatus(null);
    const r = await fetch("/api/spotify-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spDc }),
    });
    const d = await r.json().catch(() => ({ connected: false, valid: false }));
    setResult(d);
    setBusy(false);
    setValue("");
    router.refresh();
  }

  async function check() {
    setChecking(true);
    setResult(null);
    const r = await fetch("/api/spotify-status", { cache: "no-store" });
    const d = (await r.json().catch(() => ({ state: "error" }))) as StatusResp;
    setStatus(d);
    setChecking(false);
  }

  const statusMsg = status ? statusMessage(status) : null;

  return (
    <div className="mt-3 space-y-3">
      {connected && !result && !status && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-green-400">✓ Spotify cookie saved.</span>
          <button
            onClick={check}
            disabled={checking}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-40"
          >
            {checking ? "Checking…" : "Check connection"}
          </button>
        </div>
      )}
      {statusMsg && (
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-sm ${statusMsg.ok ? "text-green-400" : "text-amber-400"}`}>
            {statusMsg.text}
          </span>
          <button
            onClick={check}
            disabled={checking}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-40"
          >
            {checking ? "Checking…" : "Check again"}
          </button>
        </div>
      )}
      {result && (
        <p className={`text-sm ${result.valid ? "text-green-400" : "text-amber-400"}`}>
          {result.valid
            ? "✓ Connected — Spotify token works."
            : result.connected
              ? "Saved, but Spotify didn't return a token (it may be rate-limiting). Use “Check connection” in a minute."
              : "Cleared."}
        </p>
      )}
      <details className="rounded-lg bg-[var(--color-panel-2)] px-3 py-2 text-xs text-[var(--color-muted)]">
        <summary className="cursor-pointer text-white">
          How to get your <code>sp_dc</code> cookie
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Open <b>open.spotify.com</b> in a browser and log in.</li>
          <li>Open DevTools (F12) → <b>Application</b> → <b>Cookies</b> → <code>https://open.spotify.com</code>.</li>
          <li>Copy the value of the <code>sp_dc</code> cookie and paste it below.</li>
        </ol>
      </details>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={connected ? "Paste a new sp_dc to replace…" : "Paste sp_dc cookie…"}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] px-3 py-2 text-sm"
        />
        <button
          onClick={() => save(value)}
          disabled={busy || !value.trim()}
          className="brand-gradient rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Checking…" : "Connect"}
        </button>
      </div>
      {connected && (
        <button
          onClick={() => save("")}
          disabled={busy}
          className="text-xs text-red-400 hover:underline disabled:opacity-40"
        >
          Disconnect
        </button>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row label={label}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-12 rounded border border-[var(--color-border)] bg-transparent"
      />
    </Row>
  );
}

function Range({
  label, min, max, step, value, onChange,
}: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-4">
      <div className="mb-1 text-sm">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </div>
  );
}

function Segmented({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { id: string; label: string }[] }) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-2)] p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            value === o.id ? "brand-gradient text-white" : "text-[var(--color-muted)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "brand-gradient" : "border border-[var(--color-border)] bg-[var(--color-panel-2)]"
        }`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}
