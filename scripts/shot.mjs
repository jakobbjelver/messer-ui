// Capture the proof image for a public README (STANDARD §11.2.3): the first screen, both themes.
//
//   node scripts/shot.mjs --url https://swipe.messer.wtf --out ../messer-swipe/docs/brand --name screen
//   node scripts/shot.mjs --url http://127.0.0.1:3015 --out ../messer-paste/docs/brand --wait 1200
//
// Why a script and not a screenshot tool: the picture on a title page has to be regenerable when the
// shell changes, and it must never be a hand-crop of a live installation. Point --url at a seeded dev
// server or a public demo, never at an instance holding a real archive — PIXELS ARE NOT SCANNED by
// PUBLIC_SCAN, and a file path or a film title in a screenshot is the leak that check cannot see.
//
// Output is 1600×1000 PNG (the page's own scroll position, no OS chrome), one file per theme:
//   <out>/<name>-light.png and <out>/<name>-dark.png

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : fallback;
};
/** Repeatable flags, in the order given: `--fill "input=x"` then `--click "button=Start"`. */
const all = (name) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]] : []));

const url = flag("url");
if (!url) {
  console.error("shot: --url is required (a seeded dev server or a public demo)");
  process.exit(1);
}
const out = path.resolve(flag("out", path.join(ROOT, "screenshots")));
const name = flag("name", "screen");
const wait = Number(flag("wait", 1500));
const width = Number(flag("width", 1600));
const height = Number(flag("height", 1000));
const ready = flag("ready"); // optional selector that proves the screen painted
const fills = all("fill");   // selector=value, applied in order before the capture
const clicks = all("click"); // selector or selector=text, applied in order

/** `value` is optional: a bare selector clicks whatever it matches first. */
function pick(root, spec) {
  const [selector, text] = spec.split("=");
  const el = root.locator(text ? `${selector}:has-text("${text}")` : selector).first();
  return el;
}

function loadPlaywright() {
  const roots = [
    path.join(ROOT, "node_modules"),
    process.env.PLAYWRIGHT_PATH,
    path.join(process.env.HOME ?? "", "Repos/messer-agent/node_modules"),
    path.join(process.env.HOME ?? "", "Repos/hermes-agent/node_modules"),
  ].filter((p) => p && fs.existsSync(p));
  for (const root of roots) {
    try {
      return require(require.resolve("playwright", { paths: [root] }));
    } catch {}
  }
  throw new Error("playwright not found");
}

fs.mkdirSync(out, { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const written = [];

try {
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      colorScheme: scheme,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
    for (const spec of fills) {
      const [selector, ...rest] = spec.split("=");
      await page.fill(selector, rest.join("="), { timeout: 15000 }).catch(() => {});
    }
    for (const spec of clicks) {
      await pick(page, spec).click({ timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(600);
    }
    if (ready) await page.waitForSelector(ready, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(wait);
    const file = path.join(out, `${name}-${scheme}.png`);
    await page.screenshot({ path: file });
    const kb = Math.round(fs.statSync(file).size / 1024);
    written.push(`${scheme}  ${path.relative(process.cwd(), file)}  ${width}×${height}  ${kb} KB`);
    await context.close();
  }
} finally {
  await browser.close();
}

for (const line of written) console.log(`  ${line}`);
console.log(`\nshot  ${written.length} captures → ${out}`);
if (written.some((l) => Number(l.split(/\s+/).at(-2)) > 400)) {
  console.error("shot: a capture is over 400 KB — flatten it or lower --width (STANDARD §11.2.3)");
}
