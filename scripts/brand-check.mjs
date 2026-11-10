// Asserts the accent contract: contrast, lightness band, and distance from the fixed status hues.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { parseColor, contrast, accentFg, hueDistance, chartRamp, categoricalRamp, STATUS_HUES } from "./lib/color.mjs";
import { GLYPH_SOURCES, glyphFile, MARK_FILES, MARK_HASHED } from "./lib/mark.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// `--app <dir>` checks one checkout's installed icons (CI has no ~/Repos tree of siblings).
const APP_FLAG = (() => {
  const i = process.argv.indexOf("--app");
  return i > -1 ? process.argv[i + 1] : null;
})();
const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, "canon/tokens.json"), "utf8"));
const brands = fs
  .readdirSync(path.join(ROOT, "brand"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "brand", f), "utf8")));

const fails = [];
const warns = [];
const rows = [];

for (const brand of brands) {
  for (const mode of ["light", "dark"]) {
    const accent = brand.accent?.[mode];
    if (!accent) {
      fails.push(`${brand.project}/${mode}: no accent`);
      continue;
    }
    const { l, c, h } = parseColor(accent);
    const fg = accentFg(accent);
    const fgContrast = contrast(accent, fg);
    const palette = tokens.color[mode];
    const textContrast = contrast(palette.text.$value, palette.bg.$value);
    const mutedContrast = contrast(palette["text-3"].$value, palette.surface.$value);
    const status = Object.entries(STATUS_HUES).map(([k, hue]) => [k, hueDistance(h, hue)]);
    const [nearestName, nearest] = status.sort((a, b) => a[1] - b[1])[0];
    const ramp = chartRamp(accent, mode);
    const cats = categoricalRamp(accent, mode);

    const band = mode === "light" ? l <= 0.55 : l >= 0.62;
    Object.entries({ fgContrast, textContrast, mutedContrast }).forEach(([k, v]) => {
      const min = k === "textContrast" ? 7 : 4.5;
      if (v < min) fails.push(`${brand.project}/${mode}: ${k} ${v.toFixed(2)} < ${min}`);
    });
    if (!band) fails.push(`${brand.project}/${mode}: L ${l.toFixed(3)} outside band`);
    if (c > 0.03 && nearest < 12) {
      warns.push(`${brand.project}/${mode}: accent is ${nearest.toFixed(1)}° from status ${nearestName} — allowed, status is never colour-only (rule 8)`);
    }

    // Categorical steps are told apart by lightness, chroma or hue — in that order of reliability.
    for (let i = 0; i < cats.length; i++) {
      for (let j = i + 1; j < cats.length; j++) {
        const A = parseColor(cats[i]), B = parseColor(cats[j]);
        const dL = Math.abs(A.l - B.l);
        const dC = Math.abs(A.c - B.c);
        let dH = Math.abs(A.h - B.h);
        if (dH > 180) dH = 360 - dH;
        if (dL < 0.1 && dC < 0.02 && dH < 12) {
          fails.push(
            `${brand.project}/${mode}: cat-${i + 1} ≈ cat-${j + 1} ` +
            `(ΔL ${dL.toFixed(2)}, ΔC ${dC.toFixed(3)}, ΔH ${dH.toFixed(0)}°)`,
          );
        }
      }
    }

    rows.push({
      brand: brand.project, mode, accent, fg,
      fgContrast: fgContrast.toFixed(2), text: textContrast.toFixed(2),
      muted: mutedContrast.toFixed(2), L: l.toFixed(3), nearest: `${nearestName} ${nearest.toFixed(0)}°`,
      ramp: ramp.map((r) => r.match(/([\d.]+) /)[1]).join(" "),
    });
  }
}

/* ── marks ───────────────────────────────────────────────────────────────── */
const ICONS = path.join(ROOT, "node_modules/@phosphor-icons/core/assets");
const MARKS = path.join(ROOT, "marks");
const manifestPath = path.join(MARKS, "manifest.json");
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : {};
const sha = (buf) => "sha256:" + crypto.createHash("sha256").update(buf).digest("hex");

for (const brand of brands) {
  const glyph = brand.mark?.glyph;
  if (!glyph) {
    fails.push(`${brand.project}: no mark.glyph in brand/${brand.project}.json`);
    continue;
  }
  const source = brand.mark?.source ?? "phosphor";
  if (!GLYPH_SOURCES.includes(source)) {
    fails.push(`${brand.project}: mark.source "${source}" is not one of ${GLYPH_SOURCES.join(", ")}`);
  } else if (!fs.existsSync(glyphFile(ICONS, glyph, source))) {
    fails.push(`${brand.project}: mark glyph "${glyph}" is not a ${source} icon`);
  }
  const files = manifest[brand.project];
  if (!files) {
    fails.push(`${brand.project}: no marks/${brand.project} — run npm run marks`);
    continue;
  }
  for (const name of MARK_FILES) {
    if (!fs.existsSync(path.join(MARKS, brand.project, name))) {
      fails.push(`${brand.project}: missing marks/${brand.project}/${name}`);
    }
  }
  for (const [name, hash] of Object.entries(files)) {
    const file = path.join(MARKS, brand.project, name);
    if (!fs.existsSync(file)) fails.push(`${brand.project}: missing marks/${brand.project}/${name}`);
    else if (sha(fs.readFileSync(file)) !== hash) {
      fails.push(`${brand.project}: marks/${brand.project}/${name} is stale — run npm run marks`);
    }
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("brand", 14) + pad("mode", 7) + pad("accent", 26) + pad("fg", 9) + pad("ctr", 6) + pad("text", 6) + pad("muted", 7) + pad("L", 7) + "nearest status");
for (const r of rows) {
  console.log(
    pad(r.brand, 14) + pad(r.mode, 7) + pad(r.accent, 26) + pad(r.fg === "#ffffff" ? "white" : "near-black", 11) +
    pad(r.fgContrast, 6) + pad(r.text, 6) + pad(r.muted, 7) + pad(r.L, 7) + r.nearest,
  );
}
/* ── installed marks ─────────────────────────────────────────────────────── */
// An app that serves its own icons declares `marksTarget` in apps.json (its public dir). Those files
// are a copy of marks/<brand>/; compare them so a repo cannot keep an old favicon while marks/ says
// it is current. og.png is rasterised per machine, so only its presence is required — same rule as
// the manifest hashes.
const FILES = MARK_HASHED; // byte-stable icons only; og.png is a per-machine rasterisation
const allApps = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/apps.json"), "utf8")).apps ?? [];
const targets = APP_FLAG
  ? (() => {
      const dir = path.resolve(APP_FLAG);
      const hit = allApps.find((a) => path.basename(a.path) === path.basename(dir));
      if (!hit) return [];
      // marksTarget is recorded against the `~/Repos/...` form, so take the suffix before re-rooting.
      const suffix = hit.marksTarget?.startsWith(hit.path) ? hit.marksTarget.slice(hit.path.length) : "";
      return [{ ...hit, path: dir, marksSuffix: suffix }];
    })()
  : allApps;

let installed = 0;
for (const app of targets) {
  if (!app.marksTarget) continue;
  // The target is recorded as an absolute-ish `~/Repos/<repo>/<suffix>`; under `--app` the checkout
  // lives somewhere else, so re-root the suffix onto it.
  const repo = (app.path ?? "").replace("~", process.env.HOME ?? "~");
  if (!APP_FLAG && (!repo || !fs.existsSync(repo))) continue; // sibling repo absent (CI)
  const suffix = app.marksSuffix ?? (app.marksTarget.startsWith(app.path) ? app.marksTarget.slice(app.path.length) : "");
  const target = path.join(app.path.replace("~", process.env.HOME ?? "~"), suffix);
  if (!fs.existsSync(target)) {
    fails.push(`${app.id}: marksTarget missing — ${target}`);
    continue;
  }
  const srcDir = path.join(MARKS, app.brand ?? app.id);
  for (const name of FILES) {
    const src = path.join(srcDir, name);
    const dst = path.join(target, name);
    if (!fs.existsSync(dst)) {
      fails.push(`${app.id}: missing ${name} in ${target} — run npm run marks`);
      continue;
    }
    if (fs.existsSync(src) && Buffer.compare(fs.readFileSync(src), fs.readFileSync(dst)) !== 0) {
      fails.push(`${app.id}: ${name} diverges from marks/${app.brand ?? app.id} — run npm run marks`);
    }
    installed++;
  }
}

if (warns.length) {
  console.log("\nwarnings:");
  for (const w of warns) console.log("  ! " + w);
}
if (fails.length) {
  console.error(`\n${fails.length} failure(s):`);
  for (const f of fails) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`\nbrand  ${brands.length} brands × 2 modes ✓  AA + lightness band + categorical passed`);
console.log(`marks  ${brands.length} projects ✓  glyph + assets + hashes current`);
if (installed) console.log(`marks  ${installed} installed copies in app public dirs ✓`);
