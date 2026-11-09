// Shared mark helpers: the file set, the Phosphor glyph lookup, and the SVG builder.
// Used by scripts/mark.mjs (generate) and scripts/brand-check.mjs (verify).

import fs from "node:fs";
import path from "node:path";

export const MARK_FILES = [
  "favicon.svg",
  "favicon-dark.svg",
  "favicon-32.png",
  "apple-touch-icon.png",
  "og.png",
];

/** GameController → game-controller (Phosphor's file naming). */
export const kebab = (name) =>
  String(name)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

// The mark is a silhouette, not a line icon: Phosphor `fill` survives 20px where `regular` loses its
// interior detail. Rule 9's `regular` is the UI voice; §13 gives the mark its own weight.
const WEIGHT = "fill";

export function glyphFile(assetsDir, glyph) {
  return path.join(assetsDir, WEIGHT, `${kebab(glyph)}-fill.svg`);
}

/** The <path> elements of a Phosphor fill icon, joined. */
export function glyphPaths(iconsDir, glyph) {
  const file = glyphFile(iconsDir, glyph);
  if (!fs.existsSync(file)) {
    throw new Error(`mark: no Phosphor glyph "${glyph}" (${path.basename(file)})`);
  }
  const svg = fs.readFileSync(file, "utf8");
  const d = [...svg.matchAll(/<path[^>]*\/>/g)].map((m) => m[0]).join("");
  if (!d) throw new Error(`mark: "${glyph}" has no <path> elements`);
  return d;
}

/** Ink box + paper glyph. Glyph occupies 75 % of the box, centred. */
export function markSvg(glyph, { ink, paper, size = 32 }, iconsDir) {
  const pad = +(size * 0.125).toFixed(3);
  const scale = +((size * 0.75) / 256).toFixed(6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${ink}"/>
  <g transform="translate(${pad} ${pad}) scale(${scale})" fill="${paper}">${glyphPaths(iconsDir, glyph)}</g>
</svg>
`;
}

/** The glyph alone, transparent — for the OG image, which already sits on ink. */
export function glyphSvg(glyph, { fill, size = 96 }, iconsDir) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}" fill="${fill}">${glyphPaths(iconsDir, glyph)}</svg>`;
}
