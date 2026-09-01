import Link from "next/link";

const features = [
  {
    title: "Zero delay",
    body: "Track changes show up in real time over a live SSE stream — no polling lag on screen.",
  },
  {
    title: "Spotify & YouTube Music",
    body: "Use an encrypted Spotify web-player session or push YouTube Music state through the local companion.",
  },
  {
    title: "One URL, any software",
    body: "Drop a single browser-source URL into OBS, Streamlabs, XSplit or Twitch Studio. No downloads.",
  },
  {
    title: "Styles that fit",
    body: "Five responsive styles with accent color, progress, album art, ambient glow and Canvas video.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6">
      {/* Nav */}
      <nav className="flex items-center justify-between py-6">
        <span className="text-lg font-bold">
          Razex<span className="brand-text"> Labs</span>
        </span>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/demo" className="text-[var(--color-muted)] hover:text-white">
            Style gallery
          </Link>
          <Link href="/login" className="text-[var(--color-muted)] hover:text-white">
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="brand-gradient rounded-full px-4 py-2 font-medium text-white"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 text-center">
        <h1 className="text-5xl font-extrabold leading-tight sm:text-6xl">
          Show your stream
          <br />
          <span className="brand-text">what&apos;s playing</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--color-muted)]">
          Beautiful now-playing overlays for OBS. Connect Spotify or YouTube
          Music, drop one URL into your scene, and let viewers see every track.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="brand-gradient rounded-full px-6 py-3 font-semibold text-white"
          >
            Add the widget
          </Link>
          <Link
            href="/demo"
            className="rounded-full border border-[var(--color-border)] px-6 py-3 font-semibold"
          >
            View styles
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="grid gap-4 py-10 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6"
          >
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{f.body}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="my-16 rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-10 text-center">
        <h2 className="text-3xl font-bold">Ready to level up your stream?</h2>
        <p className="mx-auto mt-3 max-w-md text-[var(--color-muted)]">
          Set it up once. It just works while you&apos;re live.
        </p>
        <Link
          href="/dashboard"
          className="brand-gradient mt-6 inline-block rounded-full px-6 py-3 font-semibold text-white"
        >
          Get started — it&apos;s free
        </Link>
      </section>

      <footer className="flex flex-col items-center justify-between gap-2 border-t border-[var(--color-border)] py-8 text-sm text-[var(--color-muted)] sm:flex-row">
        <span>
          Razex<span className="brand-text"> Labs</span> © {new Date().getFullYear()}
        </span>
        <div className="flex gap-4">
          <Link href="/demo">Style gallery</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </footer>
    </main>
  );
}
