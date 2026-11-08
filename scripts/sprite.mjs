// Phosphor core SVGs → one inline sprite, injected into fixtures/kitchen-sink.html.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ICONS } from "./lib/icons.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "node_modules/@phosphor-icons/core/assets/regular");
const SINK = path.join(ROOT, "fixtures/kitchen-sink.html");
const START = "<!-- icons:start -->";
const END = "<!-- icons:end -->";

const symbols = ICONS.map((name) => {
  const file = path.join(ASSETS, `${name}.svg`);
  if (!fs.existsSync(file)) throw new Error(`no Phosphor icon "${name}" (${file})`);
  const svg = fs.readFileSync(file, "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 256 256";
  const paths = [...svg.matchAll(/<path[^>]*\/>/g)].map((m) => m[0]).join("");
  return `  <symbol id="m-${name}" viewBox="${viewBox}">${paths}</symbol>`;
});

const sprite = `<svg id="m-sprite" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">\n${symbols.join("\n")}\n</svg>`;

const html = fs.readFileSync(SINK, "utf8");
const start = html.indexOf(START);
const end = html.indexOf(END);
if (start === -1 || end === -1) throw new Error("icon markers missing in kitchen-sink.html");
fs.writeFileSync(SINK, html.slice(0, start + START.length) + "\n" + sprite + "\n" + html.slice(end));
console.log(`sprite  ${ICONS.length} icons → fixtures/kitchen-sink.html`);
