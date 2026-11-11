// Builds the Messer UI showcase: one static page, every brand, both themes.
//
//   node showcase/build.mjs      → showcase/dist/{index.html,css/messer.css,fonts/,marks/,favicon.svg}
//
// The numbers on the page come from canon/tokens.json, brand/*.json and canon/rules.md, so the page
// cannot describe a system we do not ship. The markup uses the same .m-* recipes the CSS port uses,
// which makes it the visual oracle for every port rather than a mock of one of them.
//
// The page chrome is an editorial specimen sheet in the messer.wtf idiom: one topbar that obeys §16,
// a type-led hero, one row per project, then the specimens. Copy is deliberately short — detail
// lives in the hybrid tooltip, per canon §12.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accentFg, chartRamp, categoricalRamp } from "../scripts/lib/color.mjs";

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

/* ── the family, as links ────────────────────────────────────────────────────
 * One row per brand. `href` is the live surface, `repo` the source. Every brand must have a row
 * (the build fails otherwise), so adding a brand cannot silently leave the page without its link.
 * `private: true` marks a surface behind Cloudflare Access — the page says so instead of dead-ending.
 */
const PROJECTS = [
  { id: "messer", name: "Messer", role: "Front door", href: "https://messer.wtf", repo: null, private: false },
  { id: "portal", name: "Portal", role: "Server dashboard", href: "https://portal.messer.wtf", repo: "https://github.com/jakobbjelver/messer-portal", private: true },
  { id: "ai-router", name: "AI Router", role: "Key pool proxy", href: "https://ai.messer.wtf", repo: "https://github.com/jakobbjelver/messer-ai-router", private: true },
  { id: "messer-swipe", name: "Swipe", role: "Media deck", href: "https://swipe-server.messer.wtf", repo: "https://github.com/jakobbjelver/messer-swipe", private: true },
  { id: "request-games", name: "Request Games", role: "Game requests", href: "https://request-games.messer.wtf", repo: "https://github.com/jakobbjelver/messer-request-games", private: true },
  { id: "studio", name: "Site Studio", role: "Site publishing", href: "https://studio.messer.wtf", repo: "https://github.com/jakobbjelver/site", private: true },
  { id: "transcode", name: "Transcode", role: "Transcode queue", href: "https://transcode.messer.wtf", repo: "https://github.com/jakobbjelver/messer-transcode", private: true },
].filter((project) => brands.some((brand) => brand.project === project.id));

for (const p of PROJECTS) {
  if (!brands.some((brand) => brand.project === p.id)) {
    throw new Error(`showcase: project "${p.id}" has no brand file — its accent and mark cannot render`);
  }
}
for (const brand of brands) {
  if (!PROJECTS.some((project) => project.id === brand.project)) {
    console.warn(`showcase: brand "${brand.project}" has no project row — skipped (add it to PROJECTS when its surface is live)`);
  }
}

const project = (id) => PROJECTS.find((p) => p.id === id);
const DEFAULT_BRAND = project("messer") ? "messer" : brands[0].project;

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Flat token lookup: walk the DTCG tree and keep `--name` → value for both themes. */
function tokenMap(theme) {
  const map = new Map();
  for (const [k, v] of Object.entries(tokens.color[theme])) {
    if (v && typeof v === "object" && "$value" in v) map.set(k, v.$value);
  }
  return map;
}

/** Colour derivation lives in scripts/lib/color.mjs — the showcase imports it so the page cannot
 *  describe a ramp the canon does not ship. (It used to re-implement the ramp with different chroma
 *  rules; that is exactly the drift this showcase exists to prevent.) */

const icon = (name) => {
  const file = path.join(ICONS, `${name}.svg`);
  if (!fs.existsSync(file)) return "";
  const svg = fs.readFileSync(file, "utf8");
  const d = [...svg.matchAll(/<path[^>]*\/>/g)].map((m) => m[0]).join("");
  return `<svg class="icon" viewBox="0 0 256 256" aria-hidden="true">${d}</svg>`;
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** The theme-appropriate mark: ink-on-paper in light, paper-on-ink in dark. */
const mark = (id, size = 32) =>
  `<span class="markpair" style="width:${size}px;height:${size}px">` +
  `<img class="only-light" src="marks/${id}/favicon.svg" alt="" width="${size}" height="${size}">` +
  `<img class="only-dark" src="marks/${id}/favicon-dark.svg" alt="" width="${size}" height="${size}">` +
  `</span>`;

/* ── brand CSS ───────────────────────────────────────────────────────────── */
// Each brand sets its accent and the ramp derived from it; everything else is canon.
const brandCss = brands
  .map((b) => {
    const light = b.accent.light;
    const dark = b.accent.dark;
    const lr = chartRamp(light, "light");
    const dr = chartRamp(dark, "dark");
    const lc = categoricalRamp(light, "light");
    const dc = categoricalRamp(dark, "dark");
    const vars = (seq, cat) =>
      `${seq.map((v, i) => `--chart-${i + 1}:${v};`).join("")}${cat
        .map((v, i) => `--chart-cat-${i + 1}:${v};`)
        .join("")}`;
    return `.brand-${b.project}{--primary:${light};--primary-foreground:${accentFg(light)};--ring:${light};${vars(lr, lc)}}
.brand-${b.project}.dark{--primary:${dark};--primary-foreground:${accentFg(dark)};--ring:${dark};${vars(dr, dc)}}`;
  })
  .join("\n");

/* ── the canon, read not retyped ──────────────────────────────────────────
 * The ten rules are parsed from canon/rules.md: titles show, the body rides in a hybrid tooltip.
 * A hand-copied list is how the old page went stale.
 */
const rulesMd = fs.readFileSync(path.join(ROOT, "canon/rules.md"), "utf8");
const plainRule = (body) =>
  body
    .replace(/```[\s\S]*?```/g, " ")
    .split("\n")
    .filter((line) => !/^\s*\|/.test(line))
    .join("\n")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/`/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

const rules = [];
for (const m of rulesMd.matchAll(/^## (\d+)\. (.+)$/gm)) {
  const n = Number(m[1]);
  if (n > 10) continue;
  const start = m.index + m[0].length;
  const rest = rulesMd.slice(start);
  const next = rest.search(/^#{1,2} /m);
  rules.push({ n, title: m[2].trim(), body: plainRule(next === -1 ? rest : rest.slice(0, next)) });
}
if (rules.length !== 10) throw new Error(`showcase: expected 10 rules in canon/rules.md, parsed ${rules.length}`);

const numberWord = { 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten" };
const surfaceCount = numberWord[PROJECTS.length] ?? String(PROJECTS.length);

/* ── page ────────────────────────────────────────────────────────────────── */

const L = tokenMap("light");

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
  ["success", L.get("success")],
  ["warning", L.get("warning")],
  ["danger", L.get("danger")],
]
  .filter(([, v]) => v)
  .map(([k, v]) => swatch(k, v))
  .join("");

const projectRows = PROJECTS.map(
  (p) => `<div class="proj">
    <a class="proj-main" href="${esc(p.href)}" target="_blank" rel="noreferrer" title="${esc(p.href.replace(/^https:\/\//, ""))}">
      ${mark(p.id, 32)}
      <span class="proj-id"><span class="proj-name">${esc(p.name)}</span><span class="proj-role">${esc(p.role)}</span></span>
      <span class="proj-meta">${p.private ? `${icon("lock-simple")} private` : esc(p.href.replace(/^https:\/\//, ""))}</span>
      ${icon("arrow-up-right")}
    </a>
    ${
      p.repo
        ? `<a class="proj-src" href="${esc(p.repo)}" target="_blank" rel="noreferrer" aria-label="${esc(p.name)} source" title="Source">${icon("github-logo")}</a>`
        : ""
    }
  </div>`,
).join("");

const brandChips = PROJECTS.map(
  (p) =>
    `<button type="button" class="chip" data-brand-btn="${p.id}" aria-label="${esc(p.name)}" aria-pressed="false" data-tip="${esc(p.name)} accent">${mark(p.id, 16)}</button>`,
).join("");

const marksRow = PROJECTS.map(
  (p) => `<div class="mk">${mark(p.id, 32)}<span class="m-data">${esc(p.name)}</span></div>`,
).join("");

const ruleRows = rules
  .map(
    (r) =>
      `<button type="button" class="rule" data-tip="${esc(r.body)}" aria-label="Rule ${r.n}: ${esc(r.title)}">
        <span class="rule-n">${String(r.n).padStart(2, "0")}</span>
        <span class="rule-t">${esc(r.title)}</span>
        ${icon("info")}
      </button>`,
  )
  .join("");

const html = `<!doctype html>
<html lang="en" class="brand-${DEFAULT_BRAND}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Messer UI — one family, ${surfaceCount.toLowerCase()} surfaces</title>
<meta name="description" content="The Messer UI design system: tokens, rules, blocks and the seven projects that adopt them.">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<script>try{var t=localStorage.getItem("messer-ui-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}</script>
<link rel="stylesheet" href="css/messer.css">
<style>
  /* ── showcase chrome — the only styles outside the canon, deliberately ── */
  body { padding: 0; }
  a { color: inherit; }
  .shell { width: 100%; max-width: var(--shell); margin-inline: auto; padding-inline: 16px; }
  @media (min-width: 768px) { .shell { padding-inline: 32px; } }

  /* §16: the bar's border spans the viewport, its row sits in the page's box. 48px, never wraps. */
  .top { position: sticky; top: 0; z-index: 30; background: var(--surface); border-bottom: 1px solid var(--border); }
  .top .shell { display: flex; align-items: center; gap: 16px; height: 48px; }
  .brand { display: flex; align-items: center; gap: 8px; text-decoration: none; flex: none; }
  .brand img { width: 20px; height: 20px; }
  .brand .name { font-family: var(--font-mono); font-size: 14px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; }
  .top .meta { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-3); white-space: nowrap; }
  .nav { display: flex; align-items: center; gap: 2px; margin-left: auto; min-width: 0; overflow-x: auto; scrollbar-width: none; }
  .nav::-webkit-scrollbar { display: none; }
  .nav a { display: flex; align-items: center; height: 32px; padding: 0 8px; font-size: 14px; color: var(--text-2); text-decoration: none; white-space: nowrap; transition: background-color .12s, color .12s; position: relative; }
  .nav a:hover { background: var(--surface-2); color: var(--text); }
  /* §11 selected: accent tint + a 2px accent rule, never a filled accent row */
  .nav a[aria-current="page"] { background: color-mix(in oklab, var(--primary) 10%, transparent); color: var(--text); }
  .nav a[aria-current="page"]::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--primary); }
  .actions { display: flex; align-items: center; gap: 8px; flex: none; }
  .icon-btn { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid var(--border); background: var(--surface); color: var(--text); text-decoration: none; cursor: pointer; transition: background-color .12s, border-color .12s, color .12s; }
  .icon-btn:hover { background: var(--surface-2); }
  .icon-btn .icon { width: 16px; height: 16px; }
  .icon-btn .moon { display: none; }
  .icon-btn[data-dark] .sun { display: none; }
  .icon-btn[data-dark] .moon { display: grid; }
  @media (max-width: 1080px) { .top .meta { display: none; } }
  @media (max-width: 640px) { .top .name { display: none; } }

  /* the drafting sheet: column rules, plus a second copy that brightens under the pointer */
  .sheet { position: relative; }
  .sheet-lines, .sheet-glow { position: absolute; inset: 0; pointer-events: none; background-image: linear-gradient(to right, var(--border) 1px, transparent 1px); background-size: 72px 100%; }
  .sheet-lines { opacity: .6; }
  .sheet-glow { opacity: 0; background-image: linear-gradient(to right, var(--border-strong) 1px, transparent 1px); transition: opacity .3s; -webkit-mask-image: radial-gradient(220px 340px at var(--mx, 50%) var(--my, 30%), #000 0%, transparent 72%); mask-image: radial-gradient(220px 340px at var(--mx, 50%) var(--my, 30%), #000 0%, transparent 72%); }
  .sheet[data-glow] .sheet-glow { opacity: 1; }
  .content { position: relative; }

  html { scroll-behavior: smooth; scroll-padding-top: 64px; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }

  /* hero — type-led, one thought */
  .hero .shell { padding-block: 80px 64px; }
  .hero h1 { margin-top: 16px; font-size: clamp(2.75rem, 7vw, 5rem); line-height: .95; letter-spacing: -.035em; max-width: 15ch; text-wrap: balance; }
  .hero .sub { margin-top: 20px; max-width: 72ch; font-size: 15px; line-height: 1.6; color: var(--text-2); text-wrap: pretty; }
  .hero-links { display: flex; flex-wrap: wrap; gap: 28px; margin-top: 40px; }
  .textlink { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; text-decoration: none; background-image: linear-gradient(var(--border-strong), var(--border-strong)); background-position: 0 100%; background-repeat: no-repeat; background-size: 100% 1px; transition: background-size .2s; }
  .textlink:hover, .textlink:focus-visible { background-size: 100% 2px; }
  .textlink .icon { width: 12px; height: 12px; }

  .sec { border-top: 1px solid var(--border); }
  .sec .shell { padding-block: 56px 64px; }
  .sec-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
  .sec-head .m-label { color: var(--text-2); }
  .grid-2 { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); align-items: start; }
  .stack { display: grid; gap: 12px; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }

  /* projects — one row each, the messer.wtf work row */
  .projects { border-top: 1px solid var(--border); }
  .proj { display: flex; align-items: stretch; border-bottom: 1px solid var(--border); }
  .proj-main { flex: 1; min-width: 0; display: grid; grid-template-columns: 32px minmax(0, 1fr) auto 16px; align-items: center; gap: 16px; padding: 12px; text-decoration: none; transition: background-color .15s; }
  .proj:hover, .proj-main:focus-visible { background: var(--surface-2); }
  .proj-id { display: grid; gap: 2px; min-width: 0; }
  .proj-name { font-family: var(--font-mono); font-size: 13px; font-weight: 500; letter-spacing: .06em; text-transform: uppercase; }
  .proj-role { font-size: 13.5px; line-height: 1.4; color: var(--text-2); }
  .proj-meta { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--text-3); white-space: nowrap; }
  .proj-meta .icon { width: 12px; height: 12px; }
  .proj-main > .icon { width: 16px; height: 16px; color: var(--text-3); transition: color .15s; }
  .proj:hover .proj-main > .icon { color: var(--text); }
  .proj-src { display: grid; place-items: center; width: 48px; flex: none; border-left: 1px solid var(--border); color: var(--text-3); transition: background-color .15s, color .15s; }
  .proj-src:hover { background: var(--surface-2); color: var(--text); }
  .proj-src .icon { width: 16px; height: 16px; }
  @media (max-width: 640px) { .proj-meta { display: none; } .proj-main { grid-template-columns: 32px minmax(0, 1fr) 16px; } }

  /* marks */
  .markpair { display: inline-block; position: relative; flex: none; border: 1px solid var(--border); }
  .markpair img { display: block; width: 100%; height: 100%; }
  .markpair .only-dark { display: none; }
  .dark .markpair .only-light { display: none; }
  .dark .markpair .only-dark { display: block; }
  .mk { display: grid; gap: 8px; justify-items: start; }
  .mkrow { display: flex; flex-wrap: wrap; gap: 24px; }

  /* accent switcher — the only place the page changes brand */
  .chiprow { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .chip { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 1px solid var(--border); background: var(--surface); cursor: pointer; transition: background-color .12s, border-color .12s; }
  .chip .markpair { border: 0; }
  .chip:hover { background: var(--surface-2); }
  .chip[aria-pressed="true"] { background: color-mix(in oklab, var(--primary) 8%, transparent); border-color: var(--border-strong); box-shadow: inset 0 -2px 0 var(--primary); }
  .chiprow .m-label { margin-right: 4px; }

  /* rules — titles visible, the rule itself on hover/tap */
  .rules { display: grid; }
  .rule { display: grid; grid-template-columns: 24px minmax(0, 1fr) 14px; align-items: center; gap: 8px; width: 100%; height: 36px; padding: 0 4px; border: 0; border-top: 1px solid var(--border); background: transparent; color: var(--text); text-align: left; cursor: help; transition: background-color .12s; }
  .rule:first-child { border-top: 0; }
  .rule:hover { background: var(--surface-2); }
  .rule-n { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-3); }
  .rule-t { font-size: 14px; }
  .rule .icon { width: 14px; height: 14px; color: var(--text-3); }

  /* hybrid tooltip: hover on a pointer, tap on touch */
  .tip-pop { position: fixed; z-index: 60; max-width: 360px; padding: 10px 12px; border: 1px solid var(--border); background: var(--surface); box-shadow: var(--shadow-pop); font-size: 12px; line-height: 1.55; color: var(--text); white-space: pre-line; }

  .sw { display: grid; grid-template-columns: 20px 1fr auto; gap: 10px; align-items: center; padding-block: 4px; }
  .sw-chip { width: 20px; height: 20px; border: 1px solid var(--border-strong); box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--foreground) 8%, transparent); }
  .sw-val { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-3); }
  .swatches { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0 24px; }
  .ramp { display: flex; height: 32px; border: 1px solid var(--border); }
  .ramp span { flex: 1; }
  .ramp-labels { display: flex; justify-content: space-between; margin-top: 6px; }
  pre { background: var(--surface-2); border: 1px solid var(--border); padding: 12px; margin: 0; overflow-x: auto; font-family: var(--font-mono); font-size: 12px; line-height: 1.6; }
  code { font-family: var(--font-mono); font-size: 12px; }

  /* blocks — the composed layer, shown at the same geometry the React component uses */
  .block-shell { border: 1px solid var(--border); background: var(--surface); width: 240px; }
  .block-shell__brand { display: flex; align-items: center; gap: 8px; height: 56px; padding: 0 16px; border-bottom: 1px solid var(--border); background: var(--background); }
  .block-mark { display: inline-block; width: 20px; height: 20px; background: var(--foreground); }
  .block-nav { position: relative; display: flex; align-items: center; height: 32px; padding: 0 12px; color: var(--text-2); font-size: 14px; text-decoration: none; }
  .block-nav--active { background: color-mix(in oklab, var(--primary) 10%, transparent); color: var(--text); }
  .block-nav--active::after { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--primary); }
  .block-shell__user { display: flex; align-items: center; gap: 8px; border-top: 1px solid var(--border); padding: 12px; }
  .block-stat { display: grid; gap: 4px; }
  .block-stat__value { font-family: var(--font-mono); font-size: 24px; line-height: 1; font-variant-numeric: tabular-nums; }
  .block-toolbar { display: flex; align-items: center; gap: 8px; min-height: 32px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }

  .foot { border-top: 1px solid var(--border); }
  .foot .shell { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; padding-block: 20px; }
  .icon { width: 16px; height: 16px; fill: currentColor; flex: none; }
  @media (max-width: 640px) {
    .hero .shell { padding-block: 48px 40px; }
    .sec .shell { padding-block: 40px 48px; }
  }
</style>
</head>
<body>
<header class="top">
  <div class="shell">
    <a class="brand" href="#top" aria-label="Messer UI">
      <img src="favicon.svg" alt="" width="20" height="20">
      <span class="name">Messer UI</span>
    </a>
    <span class="meta">v${esc(pkg.version)} · canon</span>
    <nav class="nav" aria-label="Sections">
      <a href="#projects">Projects</a>
      <a href="#foundations">Foundations</a>
      <a href="#blocks">Blocks</a>
      <a href="#components">Components</a>
      <a href="#adopting">Adopt</a>
    </nav>
    <div class="actions">
      <a class="icon-btn" href="https://github.com/jakobbjelver/messer-ui" target="_blank" rel="noreferrer" aria-label="Source on GitHub" title="Source">${icon("github-logo")}</a>
      <button class="icon-btn" id="theme" type="button" aria-label="Switch theme"><span class="sun">${icon("sun")}</span><span class="moon">${icon("moon")}</span></button>
    </div>
  </div>
</header>

<div class="sheet">
  <div class="sheet-lines" aria-hidden="true"></div>
  <div class="sheet-glow" aria-hidden="true"></div>
  <div class="content">

    <section class="hero" id="top">
      <div class="shell">
        <p class="m-label">Messer UI · canon ${esc(pkg.version)}</p>
        <h1>One family.<br>${surfaceCount} surfaces.</h1>
        <p class="sub">Tokens, rules and blocks — the same system under every project I run.</p>
        <div class="hero-links">
          <a class="textlink" href="#projects">Projects ${icon("arrow-down")}</a>
          <a class="textlink" href="#adopting">Adopt ${icon("arrow-up-right")}</a>
          <a class="textlink" href="https://github.com/jakobbjelver/messer-ui" target="_blank" rel="noreferrer">Source ${icon("arrow-up-right")}</a>
        </div>
      </div>
    </section>

    <section class="sec" id="projects">
      <div class="shell">
        <div class="sec-head"><p class="m-label">01 — Projects</p><span class="m-data">${PROJECTS.length} live · port 1</span></div>
        <div class="projects">${projectRows}</div>
      </div>
    </section>

    <section class="sec" id="foundations">
      <div class="shell">
        <div class="sec-head"><p class="m-label">02 — Foundations</p><span class="m-data">type · colour · marks</span></div>
        <div class="grid-2">
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Type</h3><span class="m-data">Golos Text · JetBrains Mono</span></div>
            <div class="m-panel__body stack">
              <h1>Heading one</h1>
              <h2>Heading two</h2>
              <h3>Heading three</h3>
              <h4>Heading four</h4>
              <p style="margin:0">Body copy sits at 14px in Golos Text. The quick brown fox jumps over the lazy dog.</p>
              <span class="m-label">Meta label</span>
              <span class="m-data">2026-11-11 · 14,208 ms · #4A9F</span>
              <div class="row"><code>npm run check</code><kbd class="m-kbd">⌘K</kbd></div>
            </div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Ten rules</h3><a class="m-data" href="https://github.com/jakobbjelver/messer-ui/blob/main/canon/rules.md" target="_blank" rel="noreferrer">canon ${icon("arrow-up-right")}</a></div>
            <div class="m-panel__body" style="padding-block:4px">
              <div class="rules">${ruleRows}</div>
            </div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Neutral</h3><span class="m-data">light · canon tokens</span></div>
            <div class="m-panel__body swatches">${neutralRamp}</div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Status</h3><span class="m-data">fixed hues</span></div>
            <div class="m-panel__body stack">
              <div class="swatches">${statusRow}</div>
              <div class="row">
                <span class="m-badge m-badge--success">${icon("check")} Healthy</span>
                <span class="m-badge m-badge--warning">${icon("warning")} Degraded</span>
                <span class="m-badge m-badge--danger">${icon("x")} Stopped</span>
                <span class="m-badge">${icon("circle")} Idle</span>
              </div>
            </div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Accent</h3><span class="m-data" id="accent-name">Messer</span></div>
            <div class="m-panel__body stack">
              <div class="ramp" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<span style="background:var(--chart-${i})"></span>`).join("")}</div>
              <div class="chiprow"><span class="m-label">Preview</span>${brandChips}</div>
            </div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Charts</h3><span class="m-data">ramp · categorical</span></div>
            <div class="m-panel__body stack">
              <div class="ramp" aria-hidden="true">${[1, 2, 3, 4, 5].map((i) => `<span style="background:var(--chart-${i})"></span>`).join("")}</div>
              <div class="ramp" aria-hidden="true">${[1, 2, 3, 4, 5, 6].map((i) => `<span style="background:var(--chart-cat-${i})"></span>`).join("")}</div>
            </div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Marks</h3><span class="m-data">ink box · paper glyph</span></div>
            <div class="m-panel__body"><div class="mkrow">${marksRow}</div></div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Controls</h3><span class="m-data">28 / 32 / 36</span></div>
            <div class="m-panel__body stack">
              <div class="row"><button class="m-btn m-btn--sm">Small</button><button class="m-btn">Medium</button><button class="m-btn m-btn--lg">Large</button></div>
              <div class="row"><button class="m-btn">Default</button><button class="m-btn" disabled>Disabled</button><button class="m-btn m-btn--icon" aria-label="Search">${icon("magnifying-glass")}</button><button class="m-btn m-btn--danger">${icon("trash")} Delete</button></div>
              <div class="m-progress" aria-label="Progress 62%"><span style="width:62%"></span></div>
              <div class="m-skeleton" style="height:20px"></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="sec" id="blocks">
      <div class="shell">
        <div class="sec-head"><p class="m-label">03 — Blocks</p><span class="m-data">composed · second copy promotes</span></div>
        <div class="grid-2">
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">App shell</h3><span class="m-data">sidebar · 240px</span></div>
            <div class="m-panel__body">
              <div class="block-shell">
                <div class="block-shell__brand"><span class="block-mark"></span><span class="m-data">PORTAL</span></div>
                <a class="block-nav block-nav--active" href="#blocks" aria-current="page">Home</a>
                <a class="block-nav" href="#blocks">Music</a>
                <a class="block-nav" href="#blocks">Lists</a>
                <div class="block-shell__user"><span class="m-avatar">JB</span><span class="m-data">jakob · admin</span></div>
              </div>
            </div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Stat</h3><span class="m-data">value · trend</span></div>
            <div class="m-panel__body">
              <div class="row" style="gap:32px">
                <div class="block-stat"><span class="m-label">Requests</span><span class="block-stat__value">1,204</span><span class="m-hint" style="display:inline-flex;align-items:center;gap:4px"><span style="color:var(--success)">${icon("caret-up")} 12%</span> vs last week</span></div>
                <div class="block-stat"><span class="m-label">Uptime</span><span class="block-stat__value">99.98%</span><span class="m-hint">30 days</span></div>
              </div>
            </div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Empty state</h3><span class="m-data">what · why · one action</span></div>
            <div class="m-panel__body">
              <div class="m-empty">
                ${icon("folder")}
                <strong>No libraries yet</strong>
                <span class="m-hint">Add a folder to start indexing.</span>
                <button class="m-btn m-btn--sm">Add library</button>
              </div>
            </div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Page toolbar</h3><span class="m-data">32px row</span></div>
            <div class="m-panel__body">
              <div class="block-toolbar">
                <span class="m-badge">All</span><span class="m-badge">Active</span>
                <span style="flex:1"></span>
                <button class="m-btn m-btn--sm">${icon("funnel")} Filter</button>
                <button class="m-btn m-btn--sm m-btn--primary">New request</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="sec" id="components">
      <div class="shell">
        <div class="sec-head"><p class="m-label">04 — Components</p><span class="m-data">atoms in canon chrome</span></div>
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
            <div class="m-panel__head"><h3 class="m-panel__title">Table</h3><span class="m-badge m-badge--success">${icon("check")} Healthy</span></div>
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
      </div>
    </section>

    <section class="sec" id="adopting">
      <div class="shell">
        <div class="sec-head"><p class="m-label">05 — Adopt</p><span class="m-data">port 1 · React + shadcn</span></div>
        <div class="grid-2">
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Install</h3></div>
            <div class="m-panel__body"><pre>node scripts/install.mjs --app ~/Repos/portal \\
  --brand portal --dir src/styles/messer

npx shadcn@latest add jakobbjelver/messer-ui/status-badge -y</pre></div>
          </div>
          <div class="m-panel">
            <div class="m-panel__head"><h3 class="m-panel__title">Gate</h3></div>
            <div class="m-panel__body stack">
              <pre>node scripts/check.mjs --app ~/Repos/portal --static
npm run blocks

npm run check   # the canon's own gate</pre>
              <p class="m-data">port 2 · compiled CSS — frozen · port 3 · native — future</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="foot">
      <div class="shell">
        <span class="m-data">generated ${new Date().toISOString().slice(0, 10)} · canon ${esc(pkg.version)}</span>
        <span class="m-data">${PROJECTS.length} projects · measured by messer check</span>
      </div>
    </footer>
  </div>
</div>

<script type="module">
  const root = document.documentElement;
  const THEME_KEY = "messer-ui-theme";
  const BRAND_KEY = "messer-ui-brand";
  const themeBtn = document.getElementById("theme");

  const setTheme = (dark) => {
    root.classList.toggle("dark", dark);
    themeBtn.toggleAttribute("data-dark", dark);
    themeBtn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (e) {}
  };
  setTheme((localStorage.getItem(THEME_KEY) ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark");
  themeBtn.addEventListener("click", () => setTheme(!root.classList.contains("dark")));

  const brands = ${JSON.stringify(brands.map((b) => ({ id: b.project, title: project(b.project)?.name ?? b.title })))};
  const accentName = document.getElementById("accent-name");
  const chips = [...document.querySelectorAll("[data-brand-btn]")];
  const setBrand = (id, persist) => {
    for (const b of brands) root.classList.remove("brand-" + b.id);
    root.classList.add("brand-" + id);
    for (const c of chips) c.setAttribute("aria-pressed", String(c.dataset.brandBtn === id));
    const found = brands.find((b) => b.id === id);
    if (accentName) accentName.textContent = found ? found.title : id;
    if (persist) { try { localStorage.setItem(BRAND_KEY, id); } catch (e) {} }
  };
  for (const c of chips) c.addEventListener("click", () => setBrand(c.dataset.brandBtn, true));
  const savedBrand = localStorage.getItem(BRAND_KEY);
  setBrand(brands.some((b) => b.id === savedBrand) ? savedBrand : "${DEFAULT_BRAND}", false);

  /* the current section, marked with §11's selected state */
  const sections = [...document.querySelectorAll("section[id]")].filter((s) => s.id !== "top");
  const navFor = new Map([...document.querySelectorAll(".nav a")].map((a) => [a.getAttribute("href").slice(1), a]));
  const spy = () => {
    let current = null;
    for (const s of sections) if (s.getBoundingClientRect().top <= 80) current = s.id;
    // The last section cannot reach the top (the footer follows it); at the bottom it is current.
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1].id;
    for (const [id, a] of navFor) {
      if (id === current) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
  };
  addEventListener("scroll", spy, { passive: true });
  addEventListener("resize", spy, { passive: true });
  spy();

  /* the sheet: column rules brighten in a disc under the pointer */
  const sheet = document.querySelector(".sheet");
  if (matchMedia("(pointer: fine)").matches) {
    sheet.addEventListener("pointermove", (e) => {
      const r = sheet.getBoundingClientRect();
      sheet.style.setProperty("--mx", (e.clientX - r.left) + "px");
      sheet.style.setProperty("--my", (e.clientY - r.top) + "px");
      sheet.setAttribute("data-glow", "");
    });
    sheet.addEventListener("pointerleave", () => sheet.removeAttribute("data-glow"));
  }

  /* hybrid tooltip: hover on a pointer, tap on touch (canon §12 detail lives here) */
  const coarse = matchMedia("(pointer: coarse)");
  const tip = document.createElement("div");
  tip.className = "tip-pop";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);
  let openFor = null;

  const place = (el) => {
    tip.hidden = false;
    tip.style.visibility = "hidden";
    tip.style.left = "0px";
    tip.style.top = "0px";
    const r = el.getBoundingClientRect();
    const w = Math.min(340, innerWidth - 32);
    tip.style.width = w + "px";
    const h = tip.offsetHeight;
    const left = Math.max(16, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 16));
    const below = r.bottom + 8;
    const top = below + h > innerHeight - 16 ? Math.max(16, r.top - h - 8) : below;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
    tip.style.visibility = "";
    openFor = el;
    el.setAttribute("aria-expanded", "true");
  };

  const hideTip = () => {
    tip.hidden = true;
    if (openFor) openFor.removeAttribute("aria-expanded");
    openFor = null;
  };

  for (const el of document.querySelectorAll("[data-tip]")) {
    el.addEventListener("pointerenter", () => {
      if (coarse.matches) return;
      tip.textContent = el.dataset.tip;
      place(el);
    });
    el.addEventListener("pointerleave", () => { if (!coarse.matches) hideTip(); });
    el.addEventListener("focus", () => {
      if (coarse.matches) return;
      tip.textContent = el.dataset.tip;
      place(el);
    });
    el.addEventListener("blur", () => { if (!coarse.matches) hideTip(); });
    el.addEventListener("click", (e) => {
      if (!coarse.matches) return;
      e.preventDefault();
      if (openFor === el) { hideTip(); return; }
      tip.textContent = el.dataset.tip;
      place(el);
    });
  }
  document.addEventListener("pointerdown", (e) => {
    if (openFor && !e.target.closest("[data-tip]") && !tip.contains(e.target)) hideTip();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); });
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

fs.cpSync(path.join(ROOT, "marks"), path.join(OUT, "marks"), { recursive: true });

fs.writeFileSync(
  path.join(OUT, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#141414"/><rect x="7" y="7" width="8" height="8" fill="#f2f2f2"/><rect x="17" y="17" width="8" height="8" fill="#f2f2f2"/></svg>`,
);

fs.writeFileSync(path.join(OUT, "index.html"), html);

const bytes = fs.statSync(path.join(OUT, "css/messer.css")).size;
console.log(`showcase → ${OUT}`);
console.log(`  brands ${brands.length} · css ${(bytes / 1024).toFixed(1)} KB · html ${(html.length / 1024).toFixed(1)} KB`);
