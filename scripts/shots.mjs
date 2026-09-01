import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { chromium } from "playwright";

const baseUrl = (process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const outputDirectory = resolve(process.env.SCREENSHOT_OUTPUT ?? "docs/images");
mkdirSync(outputDirectory, { recursive: true });

const pages = [
  { path: "/", file: "landing.png", viewport: { width: 1_440, height: 1_000 } },
  {
    path: "/demo",
    file: "style-gallery.png",
    viewport: { width: 1_440, height: 1_500 },
  },
];

const browser = await chromium.launch();

try {
  for (const target of pages) {
    const page = await browser.newPage({ viewport: target.viewport, deviceScaleFactor: 1 });
    await page.goto(`${baseUrl}${target.path}`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: resolve(outputDirectory, target.file),
      fullPage: true,
    });
    await page.close();
    console.log(`Saved ${target.file}`);
  }
} finally {
  await browser.close();
}
