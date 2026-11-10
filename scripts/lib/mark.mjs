// Shared mark helpers: the file set, the glyph lookup, and the SVG builder.
// Used by scripts/mark.mjs (generate) and scripts/brand-check.mjs (verify).
//
// Two glyph sources: Phosphor (the family default, `fill` silhouettes on a 256 grid) and Lucide
// (per-brand exception, `stroke` linework on a 24 grid). A brand picks one with `mark.source`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Vendored Lucide glyphs live in the canon repo, not in the Phosphor package. */
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const LUCIDE_DIR = path.join(REPO, "assets/lucide");

export const MARK_FILES = [
  "favicon.svg",
  "favicon-dark.svg",
  "favicon-32.png",
  "apple-touch-icon.png",
  "og.png",
];

/**
 * Rasterised OG cards are not byte-stable across machines (font hinting and AA differ between a
 * laptop and a CI runner), so they are generated but not hashed. SVGs and small icons are stable.
 */
export const MARK_HASHED = MARK_FILES.filter((file) => file !== "og.png");

/** GameController → game-controller (both families use kebab file names). */
export const kebab = (name) =>
  String(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

// The mark is a silhouette, not a line icon: Phosphor `fill` survives 20px where `regular` loses its
// interior detail. Rule 9's `regular` is the UI voice; §13 gives the mark its own weight.
const WEIGHT = "fill";

export const GLYPH_SOURCES = ["phosphor", "lucide"];

/** Lucide's own grid and weight: 24 and 2. At 75 % of a 32 px box that is a 2 px stroke, which is
 * what keeps a three-layer glyph from closing up at favicon size. */
const LUCIDE_BOX = 24;
const LUCIDE_STROKE = 2;

export function glyphFile(assetsDir, glyph, source = "phosphor") {
  if (source === "lucide") return path.join(LUCIDE_DIR, `${kebab(glyph)}.svg`);
  return path.join(assetsDir, WEIGHT, `${kebab(glyph)}-fill.svg`);
}

/** The drawing elements of a glyph file, joined. */
export function glyphPaths(iconsDir, glyph, source = "phosphor") {
  const file = glyphFile(iconsDir, glyph, source);
  if (!fs.existsSync(file)) {
    throw new Error(`mark: no ${source} glyph "${glyph}" (${path.basename(file)})`);
  }
  const svg = fs.readFileSync(file, "utf8");
  const shapes = [...svg.matchAll(/<(path|circle|rect|line|polyline|polygon)[^>]*\/>/g)].map((m) => m[0]).join("");
  if (!shapes) throw new Error(`mark: "${glyph}" has no drawable elements`);
  return shapes;
}

const boxFor = (source) => (source === "lucide" ? LUCIDE_BOX : 256);

/** The <g> that places the glyph inside a box of `size`, in the source's own coordinate space. */
function glyphGroup(glyph, { size, paper, source, iconsDir }) {
  const pad = +(size * 0.125).toFixed(3);
  const scale = +((size * 0.75) / boxFor(source)).toFixed(6);
  const paint =
    source === "lucide"
      ? `fill="none" stroke="${paper}" stroke-width="${LUCIDE_STROKE}" stroke-linecap="round" stroke-linejoin="round"`
      : `fill="${paper}"`;
  return `<g transform="translate(${pad} ${pad}) scale(${scale})" ${paint}>${glyphPaths(iconsDir, glyph, source)}</g>`;
}

/** Ink box + paper glyph. Glyph occupies 75 % of the box, centred. */
export function markSvg(glyph, { ink, paper, size = 32, source = "phosphor" }, iconsDir) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${ink}"/>
  ${glyphGroup(glyph, { size, paper, source, iconsDir })}
</svg>
`;
}

/** The glyph alone, transparent — for the OG image, which already sits on ink. */
export function glyphSvg(glyph, { fill, size = 96, source = "phosphor" }, iconsDir) {
  const scale = +((size * 0.75) / boxFor(source)).toFixed(6);
  const pad = +(size * 0.125).toFixed(3);
  const paint =
    source === "lucide"
      ? `fill="none" stroke="${fill}" stroke-width="${LUCIDE_STROKE}" stroke-linecap="round" stroke-linejoin="round"`
      : `fill="${fill}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><g transform="translate(${pad} ${pad}) scale(${scale})" ${paint}>${glyphPaths(iconsDir, glyph, source)}</g></svg>`;
}
