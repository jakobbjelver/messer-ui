// Font Awesome class → Phosphor sprite for a server-rendered app.
//   node scripts/icons.mjs --templates ~/Repos/x/web/templates --out ~/Repos/x/web/static/icons.svg
// Reads every `fa-*` class in the templates, maps it, and writes one <svg> sprite of <symbol>s
// named after the Font Awesome class (so markup changes from <i class="fa-solid fa-x"> to
// <svg><use href="/static/icons.svg#m-x"></use></svg>).

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "node_modules/@phosphor-icons/core/assets/regular");
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : d;
};

const MAP = {
  "fa-gamepad": "game-controller", "fa-flag": "flag", "fa-circle-check": "check-circle",
  "fa-magnifying-glass": "magnifying-glass", "fa-clock": "clock", "fa-trash-can": "trash",
  "fa-list-check": "list-checks", "fa-circle-xmark": "x-circle", "fa-star": "star",
  "fa-award": "medal", "fa-user": "user", "fa-arrow-right": "arrow-right",
  "fa-arrow-left": "arrow-left", "fa-up-right-from-square": "arrow-square-out",
  "fa-triangle-exclamation": "warning", "fa-rotate": "arrow-clockwise",
  "fa-right-from-bracket": "sign-out", "fa-plus": "plus", "fa-house": "house",
  "fa-hourglass-half": "hourglass", "fa-compass": "compass", "fa-chevron-down": "caret-down",
  "fa-xmark": "x", "fa-newspaper": "newspaper", "fa-message": "chat-circle",
  "fa-link": "link", "fa-inbox": "tray", "fa-globe": "globe", "fa-gear": "gear",
  "fa-eye": "eye", "fa-ellipsis": "dots-three", "fa-chevron-right": "caret-right",
  "fa-check": "check", "fa-camera": "camera", "fa-box": "cube", "fa-book-open": "book-open",
  "fa-ban": "prohibit", "fa-arrow-down-wide-short": "arrows-down-up",
  "fa-play": "play", "fa-pause": "pause", "fa-circle-info": "info", "fa-download": "download-simple",
  "fa-upload": "upload-simple", "fa-floppy-disk": "floppy-disk", "fa-arrows-rotate": "arrows-clockwise",
  "fa-circle-notch": "circle-notch", "fa-spinner": "spinner",
};

const templates = arg("--templates");
const out = arg("--out");
if (!templates || !out) {
  console.error("usage: node scripts/icons.mjs --templates <dir> --out <sprite.svg>");
  process.exit(1);
}

const used = new Set();
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(html|tmpl|gohtml|astro|tsx?)$/.test(e.name)) {
      const STYLES = new Set(["fa-solid", "fa-regular", "fa-brands", "fa-light", "fa-thin", "fa-duotone"]);
      for (const m of fs.readFileSync(p, "utf8").matchAll(/fa-[a-z0-9-]+/g)) if (!STYLES.has(m[0])) used.add(m[0]);
    }
  }
};
walk(templates);

const missing = [...used].filter((c) => !MAP[c]);
const symbols = [];
for (const cls of [...used].sort()) {
  const target = MAP[cls];
  if (!target) continue;
  const file = path.join(ASSETS, `${target}.svg`);
  if (!fs.existsSync(file)) {
    missing.push(`${cls} → ${target} (no such Phosphor icon)`);
    continue;
  }
  const svg = fs.readFileSync(file, "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 256 256";
  const paths = [...svg.matchAll(/<path[^>]*\/>/g)].map((m) => m[0]).join("");
  symbols.push(`  <symbol id="m-${cls.replace(/^fa-/, "")}" viewBox="${viewBox}">${paths}</symbol>`);
}

fs.writeFileSync(
  out,
  `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">\n${symbols.join("\n")}\n</svg>\n`,
);
console.log(`sprite  ${symbols.length} icons → ${out}`);
if (missing.length) {
  console.log(`unmapped: ${missing.join(", ")}`);
  process.exit(2);
}
