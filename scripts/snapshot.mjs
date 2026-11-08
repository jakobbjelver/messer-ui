// Captures the canon from a port-1 sink. Run once per reference app, review, commit.
//   node scripts/snapshot.mjs --url http://127.0.0.1:3001/ui [--out canon]

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { measure } from "./lib/measure.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : d;
};

function loadPlaywright() {
  const roots = [path.join(ROOT, "node_modules"), process.env.PLAYWRIGHT_PATH,
    path.join(process.env.HOME ?? "", "Repos/hermes-agent/node_modules")].filter((p) => p && fs.existsSync(p));
  for (const root of roots) {
    try { return require(require.resolve("playwright", { paths: [root] })); } catch {}
  }
  throw new Error("playwright not found");
}

const url = arg("--url");
if (!url) {
  console.error("usage: node scripts/snapshot.mjs --url <sink-url> [--out canon]");
  process.exit(1);
}
const out = path.join(ROOT, arg("--out", "canon"));
fs.mkdirSync(out, { recursive: true });

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const reference = { capturedAt: new Date().toISOString(), source: url, themes: {} };

for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, colorScheme: "light" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    // the sink is anonymous on purpose: app-level session fetches 401 and that is expected
    if (m.type() === "error" && !/status of 401/.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ reducedMotion: "reduce" });

  const at1280 = await measure(page);
  reference.themes[theme] = at1280;
  await page.screenshot({ path: path.join(out, `reference-${theme}-1280.png`), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(250);
  const at390 = await measure(page);
  await page.screenshot({ path: path.join(out, `reference-${theme}-390.png`), fullPage: true });
  reference.themes[theme].narrow = { docWidth: at390.docWidth, viewport: at390.viewport };

  console.log(`${theme}: ${Object.keys(at1280.fixtures).length} fixtures · ${errors.length} console errors · fonts ${at1280.bodyFont}`);
  if (errors.length) console.log(`  ! ${errors[0]}`);
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(out, "reference.styles.json"), JSON.stringify(reference, null, 2) + "\n");
console.log(`\nwrote ${path.relative(ROOT, out)}/reference.styles.json + 4 screenshots`);
