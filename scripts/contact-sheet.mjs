// Contact sheet: screenshot each app's sink and composite one sheet per theme.
//
//   node scripts/contact-sheet.mjs \
//     --tile portal=~/Repos/messer-portal/web/out \
//     --tile ai-router=~/Repos/messer-ai-router/packages/dashboard/dist
//
// A tile value is either a directory (served locally) or an http(s) URL. Auth-gated apps take
// --storage-state <file>; without it, point the tile at the app's sink route instead.
//
// Output: screenshots/contact-light.png and screenshots/contact-dark.png (1280×900 per tile,
// scaled to 640 wide, two columns).

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./lib/serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const values = (name) => args.flatMap((arg, i) => (arg === name ? [args[i + 1]] : []));
const tiles = values("--tile").map((tile) => {
  const at = tile.indexOf("=");
  if (at < 1) throw new Error(`--tile needs label=value, got ${tile}`);
  return { label: tile.slice(0, at), value: tile.slice(at + 1) };
});
const storageState = values("--storage-state")[0];
if (!tiles.length) {
  console.error("usage: node scripts/contact-sheet.mjs --tile <label>=<dir|url> [--tile …] [--storage-state file]");
  process.exit(1);
}

const OUT = path.join(ROOT, "screenshots");
fs.mkdirSync(OUT, { recursive: true });
const expand = (p) => (p.startsWith("~/") ? path.join(process.env.HOME, p.slice(2)) : p);
const browser = await chromium.launch();
const context = storageState ? await browser.newContext({ storageState }) : null;

async function capture(tile) {
  const isUrl = /^https?:\/\//.test(tile.value);
  const server = isUrl ? null : await serve(expand(tile.value), { fallback: "index.html" });
  const base = isUrl ? tile.value : server.url;
  const page = await (context ?? browser).newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const shots = {};
  for (const theme of ["light", "dark"]) {
    await page.goto(base, { waitUntil: "networkidle", timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    if (theme === "dark") {
      await page.evaluate(() => document.documentElement.classList.add("dark"));
      await page.waitForTimeout(250);
    }
    shots[theme] = (await page.screenshot({ type: "png" })).toString("base64");
  }
  await page.close();
  server?.close();
  return shots;
}

const sheets = { light: [], dark: [] };
for (const tile of tiles) {
  const shots = await capture(tile);
  for (const theme of ["light", "dark"]) {
    sheets[theme].push({ label: tile.label, png: shots[theme] });
  }
  console.log(`captured ${tile.label}`);
}

const page = await browser.newPage({ viewport: { width: 1320, height: 900 } });
for (const theme of ["light", "dark"]) {
  const dark = theme === "dark";
  const html = `<!doctype html><meta charset="utf-8">
  <style>
    :root { color-scheme: ${dark ? "dark" : "light"}; }
    body { margin: 0; padding: 20px; background: ${dark ? "#0b0b0b" : "#f4f4f4"};
      font-family: ui-monospace, monospace; color: ${dark ? "#e8e8e8" : "#1a1a1a"}; }
    h1 { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 14px; font-weight: 500; }
    .grid { display: grid; grid-template-columns: repeat(2, 640px); gap: 16px; }
    figure { margin: 0; }
    img { display: block; width: 640px; height: 450px; object-fit: cover; border: 1px solid ${dark ? "#2a2a2a" : "#d8d8d8"}; }
    figcaption { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; padding-top: 6px; color: ${dark ? "#8a8a8a" : "#6a6a6a"}; }
  </style>
  <h1>Messer UI — contact sheet · ${theme} · canon ${JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version}</h1>
  <div class="grid">
    ${sheets[theme]
      .map(
        (s) => `<figure><img src="data:image/png;base64,${s.png}" alt="${s.label}"><figcaption>${s.label}</figcaption></figure>`,
      )
      .join("\n    ")}
  </div>`;
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(OUT, `contact-${theme}.png`), fullPage: true });
  console.log(`screenshots/contact-${theme}.png`);
}
await page.close();
await browser.close();
