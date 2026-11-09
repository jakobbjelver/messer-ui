// Builds the Messer UI showcase: one static page, every brand, both themes.
//
//   node showcase/build.mjs      → showcase/dist/{index.html,css/messer.css,fonts/,favicon.svg}
//
// The numbers on the page come from canon/tokens.json and brand/*.json, so the showcase cannot
// describe a system we do not ship. The markup uses the same .m-* recipes the CSS port uses, which
// makes it the visual oracle for every port rather than a mock of one of them.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "showcase", "dist");
const ICONS = path.join(ROOT, "node_modules/@phosphor-icons/core/assets/regular");

const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, "canon/tokens.json"), "utf8"));
const brands = fs
  .readdirSync(path.join(ROOT, "brand"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "brand", f), "utf8")))
  .sort((a, b) => a.project.localeCompare(b.project));

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Flat token lookup: walk the DTCG tree and keep `--name` → value for both themes. */
function tokenMap(theme) {
  const map = new Map();
  for (const [k, v] of Object.entries(tokens.color[theme])) {
    if (v && typeof v === "object" && "$value" in v) map.set(k, v.$value);
  }
  return map;
}

/** oklch(30% .008 260) | #141414 → { l, c, h } so we can derive a ramp and pick ink. */
function parseColor(value) {
  const oklch = /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(value);
  if (oklch) {
    const l = oklch[2] === "%" ? Number(oklch[1]) / 100 : Number(oklch[1]);
    return { l, c: Number(oklch[3]), h: Number(oklch[4]) };
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const lin = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // crude but monotone: enough to rank light against dark for the ink choice
    return { l: Math.cbrt(lin), c: 0, h: 0 };
  }
  return { l: 0.5, c: 0, h: 0 };
}

/** Text ink for a filled accent: light fills take dark ink, dark fills take white. */
const inkFor = (accent) => (parseColor(accent).l >= 0.62 ? "#0a0a0a" : "#ffffff");

/** Five-step chart ramp from the accent's hue, per rule 7. */
function ramp(accent, dark) {
  const { c, h } = parseColor(accent);
  const hue = h || 260;
  const chroma = Math.max(0.008, Math.min(c, 0.16)) * (dark ? 0.6 : 1);
  const steps = dark ? [0.86, 0.74, 0.62, 0.5, 0.38] : [0.82, 0.7, 0.58, 0.46, 0.34];
  return steps.map((l) => `oklch(${l} ${chroma.toFixed(3)} ${hue})`);
}

const icon = (name) => {
  const file = path.join(ICONS, `${name}.svg`);
  if (!fs.existsSync(file)) return "";
  const svg = fs.readFileSync(file, "utf8");
  const d = [...svg.matchAll(/<path[^>]*\/>/g)].map((m) => m[0]).join("");
  return `<svg class="icon" viewBox="0 0 256 256" aria-hidden="true">${d}</svg>`;
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ── brand CSS ───────────────────────────────────────────────────────────── */
// Each brand sets its accent and the ramp derived from it; everything else is canon.
const brandCss = brands
  .map((b) => {
    const light = b.accent.light;
    const dark = b.accent.dark;
    const lr = ramp(light, false);
    const dr = ramp(dark, true);
    return `.brand-${b.project}{--primary:${light};--primary-foreground:${inkFor(light)};--ring:${light};${lr
      .map((v, i) => `--chart-${i + 1}:${v};`)
      .join("")}}
.brand-${b.project}.dark{--primary:${dark};--primary-foreground:${inkFor(dark)};--ring:${dark};${dr
      .map((v, i) => `--chart-${i + 1}:${v};`)
      .join("")}}`;
  })
  .join("\n");

/* ── page ────────────────────────────────────────────────────────────────── */

const L = tokenMap("light");
const D = tokenMap("dark");

const swatch = (name, value) =>
  `<div class="sw"><span class="sw-chip" style="background:${esc(value)}"></span><span class="m-data">${esc(name)}</span><span class="sw-val">${esc(value)}</span></div>`;

const neutralRamp = [
  ["bg", L.get("bg")],
  ["surface", L.get("surface")],
  ["surface-2", L.get("surface-2")],
  ["border", L.get("border")],
  ["border-strong", L.get("border-strong")],
  ["text-3", L.get("text-3")],
  ["text-2", L.get("text-2")],
  ["text", L.get("text")],
]
  .filter(([, v]) => v)
  .map(([k, v]) => swatch(k, v))
  .join("");

const statusRow = [
  ["success", L.get("success"), "check"],
  ["warning", L.get("warning"), "warning"],
  ["danger", L.get("danger"), "x"],
]
  .filter(([, v]) => v)
  .map(
    ([k, v, ic]) =>
      `<div class="sw"><span class="sw-chip" style="background:${esc(v)}"></span><span class="m-data">${k}</span><span class="sw-val">${esc(v)}</span></div>`,
  )
  .join("");

const brandButtons = brands
  .map(
    (b, i) =>
      `<button class="m-btn ${i === 0 ? "m-btn--primary" : ""}" data-brand-btn="${b.project}">${esc(
        b.title ?? b.project,
      )}</button>`,
  )
  .join("");

const ports = [
  ["React + shadcn", "swiparr · server-portal · ai-router · Site Studio", "every component, overlays included"],
  ["Compiled CSS", "messer-request-games", "atoms only — no dialog, drawer, popover, tooltip"],
  ["Native lookalike", "future (SwiftUI, Flutter)", "tokens exported, no code shared"],
];

const rules = [
  "Square everything. Circles only for avatars, status dots, scrollbar thumbs.",
  "No shadows on static controls — hairlines and surface steps instead.",
  "Mono from h3 down; h1 and h2 stay in the human voice.",
  "Golos Text for body, JetBrains Mono for meta.",
  "Meta labels are mono uppercase 10.5/500; field labels are sentence case 14/500.",
  "Density: 28 / 32 / 36 control heights.",
  "The accent belongs to the project; charts derive a ramp from it.",
  "Status is icon + label — colour only reinforces.",
  "Overrides patch locally and stay diffable against upstream.",
  "A port may look different; it may not read as a different family.",
];

const html = `<!doctype html>
<html lang="en" class="brand-${brands[0].project}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Messer UI — one family, five surfaces</title>
<meta name="description" content="The Messer UI design system: tokens, rules, recipes and the components every Messer project adopts.">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/messer.css">
<style>
  /* ── showcase chrome — the only styles outside the canon, deliberately ── */
  body { padding: 0; }
  .top { position: sticky; top: 0; z-index: 10; background: var(--background); border-bottom: 1px solid var(--border); }
  .top .m-shell { display: flex; align-items: center; gap: 16px; padding-block: 12px; flex-wrap: wrap; }
  .mark { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-weight: 600; letter-spacing: -0.01em; }
  .mark .icon { width: 18px; height: 18px; color: var(--primary); }
  .top .grow { flex: 1 1 auto; }
  .top .meta { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-3); }
  main.m-shell { padding-block: 32px 96px; display: grid; gap: 48px; }
  section { display: grid; gap: 16px; }
  .lead { max-width: 68ch; font-size: 15px; line-height: 1.6; color: var(--text-2); }
  .grid-2 { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); align-items: start; }
  .stack { display: grid; gap: 12px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .ramp { display: flex; height: 32px; border: 1px solid var(--border); }
  .ramp span { flex: 1; }
  .sw { display: grid; grid-template-columns: 20px 1fr auto; gap: 10px; align-items: center; padding-block: 4px; }
  .sw-chip { width: 20px; height: 20px; border: 1px solid var(--border-strong); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  .sw-val { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-3); }
  .swatches { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 24px; }
  .rules { counter-reset: r; display: grid; gap: 8px; }
  .rules li { display: grid; grid-template-columns: 24px 1fr; gap: 10px; align-items: baseline; }
  .rules li::before { counter-increment: r; content: counter(r, decimal-leading-zero); font-family: var(--font-mono); font-size: 10.5px; color: var(--text-3); }
  .rules li span { font-size: 14px; line-height: 1.5; }
  pre { background: var(--surface-2); border: 1px solid var(--border); padding: 12px; overflow-x: auto; font-family: var(--font-mono); font-size: 12px; line-height: 1.6; }
  .foot { border-top: 1px solid var(--border); padding-top: 16px; color: var(--text-3); display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; }
  .foot .m-data { color: var(--text-3); }
  .icon { width: 16px; height: 16px; fill: currentColor; flex: none; }
  @media (max-width: 640px) { main.m-shell { padding-block: 24px 64px; gap: 32px; } .top .meta { display: none; } }
</style>
</head>
<body>
<div class="top">
  <div class="m-shell">
    <span class="mark">${icon("circles-four")} Messer UI</span>
    <span class="meta">v${esc(pkg.version ?? "1.0.0")} · canon</span>
    <span class="grow"></span>
    <div class="row" id="brands">${brandButtons}</div>
    <button class="m-btn m-btn--sm" id="theme">${icon("moon")} <span id="theme-label">Dark</span></button>
  </div>
</div>

<main class="m-shell">
  <section>
    <span class="m-label">The system</span>
    <h1>One family, five surfaces.</h1>
    <p class="lead">
      Tokens, ten rules and a set of recipes that every Messer project adopts — React ports through
      shadcn, the Go port through compiled CSS. Each project keeps its own accent; nothing else is
      negotiable. This page is generated from <code>canon/tokens.json</code> and
      <code>brand/*.json</code>, so it cannot describe a system we do not ship.
    </p>
    <div class="row">
      <a class="m-btn m-btn--primary" href="#components">${icon("arrow-right")} Components</a>
      <a class="m-btn" href="#adopting">Adopt it</a>
      <a class="m-btn m-btn--ghost" href="#rules">The ten rules</a>
    </div>
  </section>

  <section>
    <span class="m-label">Foundations · type</span>
    <div class="grid-2">
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">Scale</h3><span class="m-data">Golos Text · JetBrains Mono</span></div>
        <div class="m-panel__body stack">
          <h1>Heading one</h1>
          <h2>Heading two</h2>
          <h3>Heading three</h3>
          <h4>Heading four</h4>
          <p style="margin:0">Body copy sits at 14px in Golos Text. The quick brown fox jumps over the lazy dog.</p>
          <p class="prose" style="margin:0">Prose runs at 15px with a 68ch measure, for anything longer than a panel.</p>
          <p class="m-hint" style="margin:0">Hints and captions sit at 12px in the tertiary colour.</p>
          <span class="m-label">Meta label</span>
          <span class="m-data">2026-11-09 · 14,208 ms · #4A9F</span>
          <div class="row"><code>npm run check</code><kbd class="m-kbd">⌘K</kbd></div>
        </div>
      </div>
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">Rules</h3><span class="m-data">ten, unchanged</span></div>
        <div class="m-panel__body">
          <ol class="rules">${rules.map((r) => `<li><span>${esc(r)}</span></li>`).join("")}</ol>
        </div>
      </div>
    </div>
  </section>

  <section>
    <span class="m-label">Foundations · colour</span>
    <div class="grid-2">
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">Neutral ramp</h3><span class="m-data">light theme · canon tokens</span></div>
        <div class="m-panel__body swatches">${neutralRamp}</div>
      </div>
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">Status</h3><span class="m-data">fixed hues · 150° / 75° / 25°</span></div>
        <div class="m-panel__body stack">
          <div class="swatches">${statusRow}</div>
          <div class="row">
            <span class="m-badge m-badge--success">${icon("check")} Healthy</span>
            <span class="m-badge m-badge--warning">${icon("warning")} Degraded</span>
            <span class="m-badge m-badge--danger">${icon("x")} Stopped</span>
            <span class="m-badge">${icon("circle")} Idle</span>
          </div>
          <p class="m-hint" style="margin:0">Status is icon + label. Colour reinforces; it never carries the meaning alone.</p>
        </div>
      </div>
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">Accent</h3><span class="m-data" id="accent-name">${esc(brands[0].title ?? brands[0].project)}</span></div>
        <div class="m-panel__body stack">
          <div class="ramp" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<span style="background:var(--chart-${i})"></span>`).join("")}</div>
          <div class="row" style="justify-content:space-between">${[1, 2, 3, 4, 5].map((i) => `<span class="m-data">chart-${i}</span>`).join("")}</div>
          <p class="m-hint" style="margin:0">Five steps at the accent's hue and chroma, lightness walking 0.82 → 0.34 (rule 7). Switch brands to see it move; the values are computed at build time, so they cannot drift from the accent.</p>
        </div>
      </div>
    </div>
  </section>

  <section>
    <span class="m-label">Foundations · geometry</span>
    <div class="grid-2">
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">Density</h3><span class="m-data">28 / 32 / 36</span></div>
        <div class="m-panel__body stack">
          <div class="row"><button class="m-btn m-btn--sm">Small</button><button class="m-btn">Medium</button><button class="m-btn m-btn--lg">Large</button></div>
          <p class="m-hint" style="margin:0">Control heights. Rows follow the same three steps.</p>
        </div>
      </div>
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">Radius</h3><span class="m-data">0px</span></div>
        <div class="m-panel__body stack">
          <p class="m-hint" style="margin:0">Square by default. The only circles in the system are avatars, status dots and scrollbar thumbs.</p>
          <div class="row"><span class="m-avatar">JB</span><span class="m-badge"><span class="m-dot"></span> Online</span><span class="m-badge">Everything else</span></div>
        </div>
      </div>
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">States</h3><span class="m-data">no shadows</span></div>
        <div class="m-panel__body stack">
          <div class="row"><button class="m-btn">Default</button><button class="m-btn" disabled>Disabled</button><button class="m-btn m-btn--icon" aria-label="Search">${icon("magnifying-glass")}</button><button class="m-btn m-btn--danger">${icon("trash")} Delete</button></div>
          <div class="m-progress" aria-label="Progress 62%"><span style="width:62%"></span></div>
          <span class="m-hint" style="margin:0">Progress — accent fill, 62%</span>
          <div class="m-skeleton" style="height:24px"></div>
          <span class="m-hint" style="margin:0">Skeleton — surface-2 wash while loading</span>
        </div>
      </div>
    </div>
  </section>

  <section>
    <span class="m-label">Components</span>
    <div class="grid-2">
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">Fields</h3></div>
        <div class="m-panel__body stack">
          <div class="m-field"><label class="m-label" for="s-name">Name</label><input class="m-input" id="s-name" value="Request Games"></div>
          <div class="m-field"><label class="m-label" for="s-note">Notes</label><textarea class="m-textarea" id="s-note" placeholder="Anything to remember"></textarea></div>
          <div class="m-field">
            <label class="m-label" for="s-kind">Kind</label>
            <span class="m-select-wrap"><select class="m-select" id="s-kind"><option>Game</option><option>DLC</option></select>${icon("caret-down")}</span>
          </div>
          <div class="row">
            <label class="m-check-row"><input type="checkbox" class="m-check" checked> Include subfolders</label>
            <label class="m-check-row"><input type="radio" name="r" class="m-radio" checked> Keep</label>
            <label class="m-check-row"><input type="checkbox" class="m-switch" checked> Enabled</label>
          </div>
        </div>
      </div>
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">Request queue</h3><span class="m-badge m-badge--success">${icon("check")} Healthy</span></div>
        <div class="m-panel__body stack">
          <table class="m-table">
            <thead><tr><th>Request</th><th>State</th><th class="num">Size</th></tr></thead>
            <tbody>
              <tr><td><code>Elden Ring</code></td><td><span class="m-badge m-badge--success">${icon("check")} Done</span></td><td class="num">14.2 GB</td></tr>
              <tr><td><code>Hades II</code></td><td><span class="m-badge m-badge--warning">${icon("warning")} Queued</span></td><td class="num">2.1 GB</td></tr>
              <tr><td><code>Outer Wilds</code></td><td><span class="m-badge">${icon("circle")} Idle</span></td><td class="num">8.4 GB</td></tr>
            </tbody>
          </table>
          <div class="m-alert">${icon("info")}<span>Neutral note. Hairline borders, no shadow.</span></div>
          <div class="m-alert m-alert--warning">${icon("warning")}<span>Warning tone, left rule only.</span></div>
        </div>
        <div class="m-panel__foot"><button class="m-btn m-btn--sm">Run</button><button class="m-btn m-btn--sm m-btn--primary">Open</button></div>
      </div>
    </div>
  </section>

  <section>
    <span class="m-label">Ports</span>
    <div class="m-panel">
      <div class="m-panel__head"><h3 class="m-panel__title">Capability matrix</h3><span class="m-data">same canon, different vehicle</span></div>
      <div class="m-panel__body">
        <table class="m-table">
          <thead><tr><th>Port</th><th>Projects</th><th>What it implements</th></tr></thead>
          <tbody>
            ${ports.map(([a, b, c]) => `<tr><td><strong>${esc(a)}</strong></td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section>
    <span class="m-label">Adopting</span>
    <div class="grid-2">
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">React</h3><span class="m-data">port 1</span></div>
        <div class="m-panel__body"><pre>node scripts/install.mjs --app . --brand swiparr --dir src/styles/messer
npx shadcn@latest add jakobbjelver/messer-ui/status-badge -y
npm run messer   # the gate</pre></div>
      </div>
      <div class="m-panel">
        <div class="m-panel__head"><h3 class="m-panel__title">Anywhere else</h3><span class="m-data">port 2</span></div>
        <div class="m-panel__body"><pre>@import "tailwindcss";
@import "./messer/theme.css";
@import "./messer/recipes.css";

&lt;a class="m-btn m-btn--primary"&gt;Save&lt;/a&gt;</pre></div>
      </div>
    </div>
  </section>

  <div class="foot">
    <span class="m-data">generated ${new Date().toISOString().slice(0, 10)} · canon ${esc(pkg.version ?? "")} · measured by messer check</span>
    <span class="m-data">brands: ${brands.map((b) => esc(b.project)).join(" · ")}</span>
  </div>
</main>

<script type="module">
  const root = document.documentElement;
  const btn = document.getElementById("theme");
  const label = document.getElementById("theme-label");
  const setTheme = (dark) => {
    root.classList.toggle("dark", dark);
    label.textContent = dark ? "Light" : "Dark";
    try { localStorage.setItem("messer-ui-theme", dark ? "dark" : "light"); } catch {}
  };
  setTheme((localStorage.getItem("messer-ui-theme") ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark");
  btn.addEventListener("click", () => setTheme(!root.classList.contains("dark")));

  const brands = ${JSON.stringify(brands.map((b) => ({ id: b.project, title: b.title ?? b.project })))};
  const accentName = document.getElementById("accent-name");
  document.getElementById("brands").addEventListener("click", (e) => {
    const b = e.target.closest("[data-brand-btn]");
    if (!b) return;
    for (const x of brands) root.classList.remove("brand-" + x.id);
    root.classList.add("brand-" + b.dataset.brandBtn);
    accentName.textContent = brands.find((x) => x.id === b.dataset.brandBtn)?.title ?? b.dataset.brandBtn;
    for (const x of document.querySelectorAll("[data-brand-btn]")) x.classList.toggle("m-btn--primary", x === b);
    try { localStorage.setItem("messer-ui-brand", b.dataset.brandBtn); } catch {}
  });
  const savedBrand = localStorage.getItem("messer-ui-brand");
  const startBrand = brands.some((b) => b.id === savedBrand) ? savedBrand : brands[0].id;
  document.querySelector('[data-brand-btn="' + startBrand + '"]')?.click();
</script>
</body>
</html>`;

/* ── write ───────────────────────────────────────────────────────────────── */

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "css"), { recursive: true });
// messer.css references ./fonts/*.woff2 relative to the sheet, so they live beside it
fs.mkdirSync(path.join(OUT, "css", "fonts"), { recursive: true });

const css = fs.readFileSync(path.join(ROOT, "packages/css/messer.css"), "utf8");
fs.writeFileSync(path.join(OUT, "css/messer.css"), `${css}\n\n/* brands */\n${brandCss}\n`);

for (const f of fs.readdirSync(path.join(ROOT, "packages/css/fonts"))) {
  fs.copyFileSync(path.join(ROOT, "packages/css/fonts", f), path.join(OUT, "css", "fonts", f));
}

fs.writeFileSync(
  path.join(OUT, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#141414"/><rect x="7" y="7" width="8" height="8" fill="#f2f2f2"/><rect x="17" y="17" width="8" height="8" fill="#f2f2f2"/></svg>`,
);

fs.writeFileSync(path.join(OUT, "index.html"), html);

const bytes = fs.statSync(path.join(OUT, "css/messer.css")).size;
console.log(`showcase → ${OUT}`);
console.log(`  brands ${brands.length} · css ${(bytes / 1024).toFixed(1)} KB · html ${(html.length / 1024).toFixed(1)} KB`);
