// Conformance check: measured against canon/reference.styles.json.
//   node scripts/check.mjs --url http://127.0.0.1:3001/ui [--profile full|atoms] [--json]
//   node scripts/check.mjs --app ~/Repos/swiparr --url ...     (also runs the static pass)

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { CIRCLE, MUST_MONO, MUST_SANS, measure, num, rgbClose } from "./lib/measure.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : d;
};
const JSON_OUT = process.argv.includes("--json");
const profile = arg("--profile", "full");

function loadPlaywright() {
  const roots = [path.join(ROOT, "node_modules"), process.env.PLAYWRIGHT_PATH,
    path.join(process.env.HOME ?? "", "Repos/messer-agent/node_modules"),
    path.join(process.env.HOME ?? "", "Repos/hermes-agent/node_modules")].filter((p) => p && fs.existsSync(p));
  for (const root of roots) {
    try { return require(require.resolve("playwright", { paths: [root] })); } catch {}
  }
  throw new Error("playwright not found");
}

const url = arg("--url");
const app = arg("--app");
const reference = JSON.parse(fs.readFileSync(path.join(ROOT, "canon/reference.styles.json"), "utf8"));
if (!url) {
  console.error("usage: node scripts/check.mjs --url <sink-url> [--app <dir>] [--profile full|atoms] [--json]");
  process.exit(1);
}

const fails = [];
const warns = [];
const { chromium } = loadPlaywright();
const browser = await chromium.launch();

for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => {
    // the sink is anonymous on purpose: app-level session fetches 401 and that is expected
    if (m.type() === "error" && !/status of 401/.test(m.text())) errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
  await page.waitForTimeout(400); // dev CSS chunks and next-themes settle
  await page.evaluate(() => document.fonts.ready);
    const got = await measure(page);
  await context.close();

  const tag = `${theme}`;
  if (errors.length) fails.push(`${tag}: ${errors.length} console error(s) — ${errors[0]}`);
  if (!got.fontsLoaded.golos || !got.fontsLoaded.mono) fails.push(`${tag}: family fonts not loaded`);
  if (got.bodyFont !== "Golos Text") fails.push(`${tag}: body font is "${got.bodyFont}"`);
  if (got.docWidth > got.viewport + 1) fails.push(`${tag}: page overflows ${got.docWidth} > ${got.viewport}`);

  const ref = reference.themes[theme].fixtures;
  const names = Object.keys(ref).filter((n) => profile !== "atoms" || !/^(tab-active)$/.test(n));

  for (const name of names) {
    const a = ref[name];
    const b = got.fixtures[name];
    if (!b) {
      if (profile === "atoms" && /^(btn|input|textarea|select|check|radio|switch|badge|panel|table|alert|progress|skeleton|avatar|dot|empty|label|data|tabs|null)/.test(name)) {
        fails.push(`${tag}: missing fixture "${name}"`);
      }
      continue;
    }
    if (a.fontFamily !== b.fontFamily) fails.push(`${tag}/${name}: font ${b.fontFamily} ≠ ${a.fontFamily}`);
    if (Math.abs(num(a.fontSize) - num(b.fontSize)) > 0.6) fails.push(`${tag}/${name}: font-size ${b.fontSize} ≠ ${a.fontSize}`);
    if (Math.abs(num(a.lineHeight) - num(b.lineHeight)) > 1.2) warns.push(`${tag}/${name}: line-height ${b.lineHeight} ≠ ${a.lineHeight}`);
    if (!rgbClose(a.color, b.color)) fails.push(`${tag}/${name}: colour ${b.color} ≠ ${a.color}`);
    if (!rgbClose(a.backgroundColor, b.backgroundColor)) warns.push(`${tag}/${name}: background ${b.backgroundColor} ≠ ${a.backgroundColor}`);
    if (!CIRCLE.test(name) && num(b.borderRadius) !== 0) fails.push(`${tag}/${name}: radius ${b.borderRadius}`);
    if (Math.abs(num(a.height) - num(b.height)) > 1.5) warns.push(`${tag}/${name}: height ${b.height} ≠ ${a.height}`);
  }
  for (const name of names.filter((n) => MUST_MONO.includes(n) && got.fixtures[n])) {
    if (got.fixtures[name].fontFamily !== "JetBrains Mono") fails.push(`${tag}/${name}: should be mono`);
  }
  for (const name of names.filter((n) => MUST_SANS.includes(n) && got.fixtures[n])) {
    if (got.fixtures[name].fontFamily !== "Golos Text") fails.push(`${tag}/${name}: should be Golos`);
  }
}

await browser.close();

// static pass
if (app) {
  const walk = (dir, out = []) => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (["node_modules", ".next", ".git"].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(tsx?|css)$/.test(e.name)) out.push(p);
    }
    return out;
  };
  for (const file of walk(path.join(app, "src"))) {
    const src = fs.readFileSync(file, "utf8");
    const rel = path.relative(app, file);
    if (/from\s+["']lucide-react["']/.test(src)) fails.push(`${rel}: imports lucide-react`);
    const hex = [...src.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0]);
    if (hex.length) warns.push(`${rel}: ${hex.length} hex literal(s) ${[...new Set(hex)].slice(0, 3).join(" ")}`);
    if (/rounded-full/.test(src) && !/avatar|smooth-avatar|scroll-area|slider/.test(rel))
      warns.push(`${rel}: rounded-full outside the whitelist`);
  }
}

const result = { url, app: app ?? null, profile, at: new Date().toISOString(), fails, warns };
if (JSON_OUT) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const w of warns.slice(0, 12)) console.log("  ! " + w);
  if (warns.length > 12) console.log(`  ! … ${warns.length - 12} more warnings`);
  for (const f of fails) console.error("  ✗ " + f);
  console.log(`\ncheck  ${fails.length ? "FAILED" : "green ✓"} · ${fails.length} failures · ${warns.length} warnings · profile ${profile}`);
}
process.exit(fails.length ? 1 : 0);
