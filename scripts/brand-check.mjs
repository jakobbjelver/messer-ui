// Asserts the accent contract: contrast, lightness band, and distance from the fixed status hues.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseColor, contrast, accentFg, hueDistance, chartRamp, STATUS_HUES } from "./lib/color.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

    const band = mode === "light" ? l <= 0.55 : l >= 0.62;
    Object.entries({ fgContrast, textContrast, mutedContrast }).forEach(([k, v]) => {
      const min = k === "textContrast" ? 7 : 4.5;
      if (v < min) fails.push(`${brand.project}/${mode}: ${k} ${v.toFixed(2)} < ${min}`);
    });
    if (!band) fails.push(`${brand.project}/${mode}: L ${l.toFixed(3)} outside band`);
    if (c > 0.03 && nearest < 12) {
      warns.push(`${brand.project}/${mode}: accent is ${nearest.toFixed(1)}° from status ${nearestName} — allowed, status is never colour-only (rule 8)`);
    }

    rows.push({
      brand: brand.project, mode, accent, fg,
      fgContrast: fgContrast.toFixed(2), text: textContrast.toFixed(2),
      muted: mutedContrast.toFixed(2), L: l.toFixed(3), nearest: `${nearestName} ${nearest.toFixed(0)}°`,
      ramp: ramp.map((r) => r.match(/([\d.]+) /)[1]).join(" "),
    });
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
if (warns.length) {
  console.log("\nwarnings:");
  for (const w of warns) console.log("  ! " + w);
}
if (fails.length) {
  console.error(`\n${fails.length} failure(s):`);
  for (const f of fails) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`\nbrand  ${brands.length} brands × 2 modes ✓  AA + lightness band passed`);
