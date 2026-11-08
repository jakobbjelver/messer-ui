// Compiles packages/css/index.css → packages/css/messer.css and keeps fonts in place.

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSS_DIR = path.join(ROOT, "packages/css");
const FONT_DIR = path.join(CSS_DIR, "fonts");

const FONTS = [
  ["@fontsource-variable/golos-text", "golos-text"],
  ["@fontsource-variable/jetbrains-mono", "jetbrains-mono"],
];

fs.mkdirSync(FONT_DIR, { recursive: true });
for (const [pkg, base] of FONTS) {
  const target = path.join(FONT_DIR, `${base}-latin-wght-normal.woff2`);
  if (fs.existsSync(target)) continue;
  const files = path.join(ROOT, "node_modules", pkg, "files");
  const match = fs.existsSync(files)
    ? fs.readdirSync(files).find((f) => f === `${base}-latin-wght-normal.woff2`)
    : null;
  if (!match) {
    console.error(`missing ${pkg}/files/${base}-latin-wght-normal.woff2 — run npm install`);
    process.exit(1);
  }
  fs.copyFileSync(path.join(files, match), target);
  console.log(`font  ${base} → packages/css/fonts/`);
}

execFileSync(
  process.execPath,
  [
    path.join(ROOT, "node_modules/@tailwindcss/cli/dist/index.mjs"),
    "--input",
    path.join(CSS_DIR, "index.css"),
    "--output",
    path.join(CSS_DIR, "messer.css"),
    "--minify",
  ],
  { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"] },
);

const css = fs.readFileSync(path.join(CSS_DIR, "messer.css"));
const gz = zlib.gzipSync(css, { level: 9 }).length;
console.log(
  `css   packages/css/messer.css  ${(css.length / 1024).toFixed(1)} KB raw · ${(gz / 1024).toFixed(1)} KB gzip`,
);
if (gz / 1024 > 25) {
  console.error("over the 25 KB gzip budget");
  process.exit(1);
}
