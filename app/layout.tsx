import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Razex Labs — Now Playing widget for streamers",
  description:
    "Show what you're listening to on stream. Beautiful Spotify & YouTube Music now-playing overlays for OBS. One URL, zero setup.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
