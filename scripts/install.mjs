// Copies the generated token files into a consuming app and prints the import lines.
//   node scripts/install.mjs --app ~/Repos/messer-swipe --brand messer-swipe --dir src/app/messer

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const app = arg("--app");
const brand = arg("--brand");
const dir = arg("--dir", "src/app/messer");
if (!app || !brand) {
  console.error("usage: node scripts/install.mjs --app <dir> --brand <project> [--dir src/app/messer]");
  process.exit(1);
}

const files = [
  ["packages/css/theme.css", "theme.css"],
  ["packages/css/type.css", "type.css"],
  ["packages/css/utilities.css", "utilities.css"],
  [`packages/css/brand/${brand}.css`, "brand.css"],
];
const target = path.join(app, dir);
fs.mkdirSync(target, { recursive: true });
for (const [from, to] of files) {
  fs.copyFileSync(path.join(ROOT, from), path.join(target, to));
  console.log(`  ${path.relative(app, path.join(target, to))}`);
}

console.log(`
Add to your global stylesheet, after the Tailwind import:

  @import "./${dir.replace(/^.*\//, "")}/theme.css";
  @import "./${dir.replace(/^.*\//, "")}/type.css";
  @import "./${dir.replace(/^.*\//, "")}/utilities.css";
  @import "./${dir.replace(/^.*\//, "")}/brand.css";

Then keep only app-specific extras (sidebar vars, custom utilities) in that file — no colour
literals, no radius scale, no font stacks.`);
