// Conformance check: measured against canon/reference.styles.json.
//   node scripts/check.mjs --url http://127.0.0.1:3001/ui [--profile full|atoms] [--json]
//   node scripts/check.mjs --app ~/Repos/messer-swipe --url ...     (also runs the static pass)

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { CIRCLE, MUST_MONO, MUST_SANS, measure, num, rgbClose } from "./lib/measure.mjs";
import { probeStates } from "./lib/states.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : d;
};
const JSON_OUT = process.argv.includes("--json");
const STATIC_ONLY = process.argv.includes("--static");
const NO_REFERENCE = process.argv.includes("--no-reference");
const DEBUG = process.argv.includes("--debug");
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
if (!url && !(STATIC_ONLY && app)) {
  console.error("usage: node scripts/check.mjs --url <sink-url> [--app <dir>] [--profile full|atoms] [--static] [--no-reference] [--json] [--debug]");
  process.exit(1);
}
const reference = STATIC_ONLY || NO_REFERENCE
  ? null
  : JSON.parse(fs.readFileSync(path.join(ROOT, "canon/reference.styles.json"), "utf8"));
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "canon/states.json"), "utf8"));

const fails = [];
const warns = [];

/* ── constraints: one gate per rule ───────────────────────────────────────── */

function hueOf(value) {
  const m = String(value).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b] = m[1].split(/[,\s/]+/).slice(0, 3).map(Number);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 24) return null; // neutral: hue carries no meaning
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

const alphaOf = (value) => {
  const m = String(value).match(/rgba\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(/[,\s/]+/);
  return parts.length > 3 ? Number(parts[3]) : 1;
};

const msOf = (value) =>
  Math.max(...String(value).split(",").map((d) => d.trim()).filter(Boolean)
    .map((d) => (d.endsWith("ms") ? parseFloat(d) : parseFloat(d) * 1000)));

function assertConstraints(got, tag) {
  // R2 — no shadows on anything that is not floating.
  for (const [name, rec] of Object.entries(got.fixtures)) {
    if (rec.boxShadow && rec.boxShadow !== "none" && !/^rgba?\(0, 0, 0, 0\)/.test(rec.boxShadow)) {
      fails.push(`${tag}/${name}: R2 shadow ${rec.boxShadow}`);
    }
  }

  // R6 — numbers line up.
  for (const name of ["data", "table-num"]) {
    const rec = got.fixtures[name];
    if (rec && !String(rec.fontVariantNumeric).includes("tabular-nums")) {
      fails.push(`${tag}/${name}: R6 tabular-nums missing`);
    }
  }

  // R7 — one accent, plus the three fixed status hues. Nothing else.
  const hues = [];
  for (const rec of Object.values(got.fixtures)) {
    for (const value of [rec.color, rec.backgroundColor]) {
      const h = hueOf(value);
      if (h == null) continue;
      if (!hues.some((x) => Math.min(Math.abs(x - h), 360 - Math.abs(x - h)) < 12)) hues.push(h);
    }
  }
  if (hues.length > 4) {
    fails.push(`${tag}: R7 ${hues.length} distinct hues (max 4: accent + danger/warning/success) — ${hues.map((h) => Math.round(h)).join("/")}`);
  }

  // R7 — accent budget, per page composition.
  for (const p of got.pages ?? []) {
    if (p.fills > 1) fails.push(`${tag}/${p.id}: R7 ${p.fills} primary fills (max 1)`);
    if (p.accentArea > 0.05) {
      fails.push(`${tag}/${p.id}: R7 accent area ${(p.accentArea * 100).toFixed(1)}% (max 5%)`);
    }
  }

  // R8 — status is icon + label.
  for (const s of got.statuses ?? []) {
    if (!s.hasIcon || !s.hasLabel) fails.push(`${tag}/${s.name}: R8 status needs an icon and a label`);
  }

  // R10 — three control heights.
  for (const c of got.controls ?? []) {
    if (![28, 32, 36].some((h) => Math.abs(h - c.h) <= 0.6)) {
      fails.push(`${tag}: R10 "${c.label}" height ${c.h} (28/32/36)`);
    }
  }
}

function assertStates(states, tag) {
  const v = states.vars;
  const allowed = new Set([
    `${v.surface}|${v.surface2}`,
    `${v.surface2}|${v.surface}`,
    `rgba(0, 0, 0, 0)|${v.surface2}`,
    `${v.primary}|${v.primaryHover}`,
  ]);

  if (!states.hover.length) warns.push(`${tag}: no [data-state-hover] fixture`);
  for (const h of states.hover) {
    const pair = `${h.before.bg}|${h.after.bg}`;
    if (h.before.bg === h.after.bg) fails.push(`${tag}/hover#${h.i}: background did not change`);
    else if (!allowed.has(pair)) {
      fails.push(`${tag}/hover#${h.i}: ${h.before.bg} → ${h.after.bg} is not one surface step`);
    }
    if (h.after.shadow !== "none") fails.push(`${tag}/hover#${h.i}: shadow on hover`);
    if (h.after.transform !== "none") fails.push(`${tag}/hover#${h.i}: transform on hover`);
    const dur = msOf(h.after.duration);
    if (dur > contract.hover.durationMaxMs) {
      fails.push(`${tag}/hover#${h.i}: transition ${dur}ms > ${contract.hover.durationMaxMs}ms`);
    }
  }

  if (!states.focus.length) warns.push(`${tag}: no [data-state-focus] fixture`);
  for (const f of states.focus) {
    if (!f.focusVisible) fails.push(`${tag}/focus/${f.key}: not :focus-visible`);
    const w = num(f.outlineWidth), o = num(f.outlineOffset);
    if (!Number.isFinite(w) || Math.abs(w - contract.focusVisible.outlineWidth) > 0.1) {
      fails.push(`${tag}/focus/${f.key}: outline ${f.outlineWidth}`);
    }
    if (!Number.isFinite(o) || Math.abs(o - contract.focusVisible.outlineOffset) > 0.1) {
      fails.push(`${tag}/focus/${f.key}: outline-offset ${f.outlineOffset}`);
    }
    if (!rgbClose(f.outlineColor, v.ring)) {
      fails.push(`${tag}/focus/${f.key}: outline colour ${f.outlineColor} ≠ --ring ${v.ring}`);
    }
  }

  for (const d of states.disabled) {
    if (Number(d.opacity) > contract.disabled.textOpacityMax) {
      fails.push(`${tag}/disabled/${d.key}: opacity ${d.opacity} (max ${contract.disabled.textOpacityMax})`);
    }
    if (d.cursor === "pointer") fails.push(`${tag}/disabled/${d.key}: cursor pointer`);
  }

  if (!states.selected.length) warns.push(`${tag}: no [data-state-selected] fixture`);
  for (const s of states.selected) {
    const a = alphaOf(s.bg);
    if (!(a > 0 && a <= contract.selected.accentMixMax)) {
      fails.push(`${tag}/selected/${s.key}: tint alpha ${a} (max ${contract.selected.accentMixMax})`);
    }
    const w = num(s.ruleWidth);
    if (!Number.isFinite(w) || Math.abs(w - contract.selected.ruleWidth) > 0.1) {
      fails.push(`${tag}/selected/${s.key}: accent rule ${s.ruleWidth}`);
    }
  }
}

const runs = STATIC_ONLY ? [] : ["light", "dark"];
const browser = STATIC_ONLY ? null : await (await loadPlaywright()).chromium.launch();

for (const theme of runs) {
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
  const states = profile === "full" ? await probeStates(page, contract) : null;
  if (DEBUG && states) console.error(`  · vars ${JSON.stringify(states.vars)}`);
  await context.close();

  const tag = `${theme}`;
  if (errors.length) fails.push(`${tag}: ${errors.length} console error(s) — ${errors[0]}`);
  if (!got.fontsLoaded.golos || !got.fontsLoaded.mono) fails.push(`${tag}: family fonts not loaded`);
  if (got.bodyFont !== "Golos Text") fails.push(`${tag}: body font is "${got.bodyFont}"`);
  if (got.docWidth > got.viewport + 1) fails.push(`${tag}: page overflows ${got.docWidth} > ${got.viewport}`);

  const ref = reference ? reference.themes[theme].fixtures : {};
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

  assertConstraints(got, tag);
  if (states) assertStates(states, tag);
}

if (browser) await browser.close();

// static pass
if (app) {
  // Walk the whole app: repos in this family keep source under src/, app/, web/ or packages/, and a
  // scanner pointed at a fixed directory goes quietly green on everything else.
  const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".messer-ui", "dist", "build", "out",
    "coverage", "vendor", "__pycache__", ".turbo", ".astro", "playwright-report"]);
  const SKIP_FILES = new Set(["app.css", "styles.css"]); // build output, not source
  const walk = (dir, out = []) => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory() ? SKIP_DIRS.has(e.name) : SKIP_FILES.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(tsx?|jsx?|css|html|gohtml|tmpl)$/.test(e.name)) out.push(p);
    }
    return out;
  };
  // styles/messer/* is the generated canon itself — its literals are the tokens.
  const sourceFiles = walk(app);
  // Rule 9's icon family is Phosphor; canon §14 lets a brand declare the other family. An
  // exception is per app, never per file: the check must still catch the opposite import.
  const family = (() => {
    try {
      const apps = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/apps.json"), "utf8")).apps ?? [];
      const real = fs.realpathSync(app);
      const hit = apps.find((a) => fs.existsSync(a.path.replace("~", process.env.HOME ?? "~")) &&
        fs.realpathSync(a.path.replace("~", process.env.HOME ?? "~")) === real);
      return hit?.iconFamily ?? "phosphor";
    } catch { return "phosphor"; }
  })();
  const ICON_IMPORT = {
    phosphor: /from\s+["']@phosphor-icons\/react[^"']*["']/,
    lucide: /from\s+["']lucide-react["']/,
  };
  const banned = Object.entries(ICON_IMPORT).filter(([k]) => k !== family);
  for (const file of sourceFiles.filter((f) => !f.includes("/styles/messer/"))) {
    const src = fs.readFileSync(file, "utf8");
    const rel = path.relative(app, file);
    for (const [name, re] of banned) if (re.test(src)) fails.push(`${rel}: imports ${name === "lucide" ? "lucide-react" : "phosphor-icons"} (icon family is ${family})`);
    const hex = [...src.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0]);
    if (hex.length) warns.push(`${rel}: ${hex.length} hex literal(s) ${[...new Set(hex)].slice(0, 3).join(" ")}`);
    if (/rounded-full/.test(src) && !/avatar|smooth-avatar|scroll-area|slider/.test(rel))
      warns.push(`${rel}: rounded-full outside the whitelist`);
  }

  // canon version: the installed theme.css is a copy of ours; a stale copy is how a rule change
  // goes unnoticed for months.
  const themeFile = sourceFiles.find((f) => /\/styles\/messer\/theme\.css$/.test(f));
  const canonVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
  if (themeFile) {
    const m = fs.readFileSync(themeFile, "utf8").match(/messer-ui canon ([\d.]+)/);
    const rel = path.relative(app, themeFile);
    if (!m) warns.push(`${rel}: no canon version header — re-run scripts/install.mjs`);
    else if (m[1] !== canonVersion) warns.push(`${rel}: canon ${m[1]} ≠ ${canonVersion} — re-run scripts/install.mjs`);
  } else {
    warns.push(`no styles/messer/theme.css — canon version unknown (registry install?)`);
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
