#!/usr/bin/env node
/**
 * Renders Chrome Web Store screenshot HTML mockups to PNG.
 * Usage: node scripts/render-store-screenshots.mjs
 */
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const htmlDir = join(root, "docs/chrome-web-store/screenshots/html");
const outDir = join(root, "docs/chrome-web-store/screenshots/png");
const promoDir = join(root, "docs/chrome-web-store/promo");

const screens = [
  { file: "01-context-menu.html", out: "01-context-menu.png", w: 1280, h: 800 },
  { file: "02-summarize-panel.html", out: "02-summarize-panel.png", w: 1280, h: 800 },
  { file: "03-sidebar-chat.html", out: "03-sidebar-chat.png", w: 1280, h: 800 },
  { file: "04-sidebar-project.html", out: "04-sidebar-project.png", w: 1280, h: 800 },
  { file: "05-google-doc-export.html", out: "05-google-doc-export.png", w: 1280, h: 800 },
];

const promos = [
  { file: "small-tile.html", out: "small-tile-440x280.png", w: 440, h: 280 },
  { file: "large-tile.html", out: "large-tile-920x680.png", w: 920, h: 680 },
  { file: "marquee.html", out: "marquee-1400x560.png", w: 1400, h: 560 },
];

mkdirSync(outDir, { recursive: true });
mkdirSync(promoDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function capture(htmlFile, outputPath, width, height) {
  const url = `file://${join(htmlDir, htmlFile)}`;
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({ path: outputPath, type: "png" });
  console.log(`✓ ${outputPath}`);
}

for (const s of screens) {
  await capture(s.file, join(outDir, s.out), s.w, s.h);
}

for (const p of promos) {
  await capture(p.file, join(promoDir, p.out), p.w, p.h);
}

await browser.close();
console.log("Done.");
