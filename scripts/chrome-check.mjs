// Family-chrome gate for a *running* page — the topbar, measured rather than eyeballed.
//
//   node scripts/chrome-check.mjs --url <url> [--url ...] [--theme light|dark|both] [--json <out>]
//   node scripts/chrome-check.mjs --selftest
//
// `check.mjs` measures a fixture sink and `app-conformance.mjs` measures atoms, controls and type.
// Neither sees the shell: the topbar of a generated static document is hand-written markup, so a bar
// that is one pixel too tall, a nav item that keeps a destination arrow, or a selected rule that
// lands on a half pixel all pass both gates. This script measures the chrome itself against canon
// §11 (selected state), §16 (one width, one gutter, 48 px bar) and §21 (no arrow in the header nav).
//
// Exit 1 on any violation, 0 when green.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const BAR = { height: 48, tolerance: 0.5 }; // §16: the bar is 48 px including its hairline
const CTRL = 32; // §6/§16: nav items are the 32 px control height
const RULE = 2; // §11: the selected rule is 2 px on its thin axis
const GUTTER = 1.5; // a row that is off by more than this is not in the page's box

function usage(message) {
  if (message) console.error(message);
  console.error(
    "usage: node scripts/chrome-check.mjs --url <url> [--url ...] [--theme light|dark|both] " +
      "[--json <out>]\n       node scripts/chrome-check.mjs --selftest",
  );
  process.exit(1);
}

const urls = [];
let themeArg = "both";
let jsonOut = null;
let selftest = false;

const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const [flag, inline] = argv[i].startsWith("--") && argv[i].includes("=")
    ? [argv[i].slice(0, argv[i].indexOf("=")), argv[i].slice(argv[i].indexOf("=") + 1)]
    : [argv[i], null];
  const value = () => {
    if (inline !== null) return inline;
    const next = argv[++i];
    if (next === undefined || next.startsWith("--")) usage(`${flag} needs a value`);
    return next;
  };
  switch (flag) {
    case "--url": urls.push(value()); break;
    case "--theme": themeArg = value(); break;
    case "--json": jsonOut = value(); break;
    case "--selftest": selftest = true; break;
    case "--help": case "-h": usage(); break;
    default:
      if (argv[i].startsWith("-")) usage(`unknown option ${argv[i]}`);
      urls.push(argv[i]);
  }
}

// A bare path is convenient for a generated document: measure the build on disk.
for (let i = 0; i < urls.length; i++) {
  const u = urls[i];
  if (!/^[a-z]+:\/\//i.test(u)) {
    if (!fs.existsSync(u)) usage(`not a URL and not a file: ${u}`);
    urls[i] = pathToFileURL(path.resolve(u)).href;
  }
}

if (!selftest && !urls.length) usage("at least one --url is required");
if (!["light", "dark", "both"].includes(themeArg)) usage(`--theme must be light, dark or both (got ${themeArg})`);

function loadPlaywright() {
  const roots = [
    path.join(ROOT, "node_modules"),
    process.env.PLAYWRIGHT_PATH,
    path.join(process.env.HOME ?? "", "Repos/messer-agent/node_modules"),
    path.join(process.env.HOME ?? "", "Repos/hermes-agent/node_modules"),
  ].filter((p) => p && fs.existsSync(p));
  for (const root of roots) {
    try { return require(require.resolve("playwright", { paths: [root] })); } catch {}
  }
  throw new Error("playwright not found — npm i in messer-ui, or set PLAYWRIGHT_PATH");
}

/* ── the in-page measurement ──────────────────────────────────────────────── */

const measureChrome = async () => {
  const px = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = (colour) => {
    // computed colours arrive as rgb(), lab() or oklab(); let the canvas normalise them.
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a };
  };

  const header = document.querySelector("header, [role='banner'], .mp-bar, .top");
  if (!header) return { noHeader: true };

  const hcs = getComputedStyle(header);
  const hrect = header.getBoundingClientRect();
  const nav = header.querySelector("nav");
  const links = nav ? [...nav.querySelectorAll("a")] : [];

  // The page's content box: an explicit hook first, then the usual container, then <main>.
  const candidates = [
    document.querySelector("[data-page-container]"),
    header.nextElementSibling?.querySelector?.(".shell") ?? null,
    ...document.querySelectorAll(".shell, .mp-layout, .mp-bar__row + *, main"),
  ].filter(Boolean);
  let content = candidates[0] ?? null;
  if (content && content.classList.contains("doc-title")) {
    content = content.querySelector(".shell") ?? content;
  }
  const cbox = content
    ? (() => {
        const r = content.getBoundingClientRect();
        const cs = getComputedStyle(content);
        return { left: r.left + px(cs.paddingLeft), right: r.right - px(cs.paddingRight), width: r.width };
      })()
    : null;

  // The bar's inner row: the element that actually lays out the brand, nav and actions.
  const row = header.querySelector(".shell, .mp-bar__row, [data-shell-row], .row") ?? header.firstElementChild;
  const rrect = row ? row.getBoundingClientRect() : null;
  const rcs = row ? getComputedStyle(row) : null;

  // §11 selected: measure the item that carries aria-current; force one if the page has none, and
  // say so, so a page is still measured before its scrollspy has run.
  let selected = links.find((a) => a.getAttribute("aria-current"));
  const forced = !selected && links.length > 0;
  if (forced) selected = links[0];
  // idempotent: the second theme pass meets the attribute the first one left behind
  if (selected) selected.setAttribute("aria-current", "page");
  // A just-forced state lags one style pass, and the selected tint arrives through a 120 ms
  // background-color transition — wait both out, or the tint reads as 0–2 % alpha.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 250));
  let state = null;
  if (selected) {
    const scs = getComputedStyle(selected);
    const after = getComputedStyle(selected, "::after");
    const tint = rgba(scs.backgroundColor);
    state = {
      label: (selected.textContent || "").trim(),
      hasAfter: after.content !== "none" && after.content !== "normal",
      thinAxis: Math.min(px(after.width), px(after.height)),
      ruleBg: after.content === "none" ? null : rgba(after.backgroundColor),
      tintAlpha: tint.a,
      barBg: rgba(hcs.backgroundColor),
    };
  }

  // The wordmark: the first link in the bar that carries text, and the last span inside it
  // (AppShell wraps the mark in its own span first, so the first span is never the name).
  const brand = [...header.querySelectorAll("a")].find((a) => (a.textContent ?? "").trim().length > 1) ?? null;
  const brandSpans = brand ? [...brand.querySelectorAll("span")].filter((s) => (s.textContent ?? "").trim().length > 1) : [];
  const bcs = brand ? getComputedStyle(brand) : null;
  const brandText = brand ? getComputedStyle(brandSpans.at(-1) ?? brand) : null;

  // A specimen sheet demonstrates h1–h6 by rendering them; those are samples, not the page's own
  // heading, so they are excluded from the one-h1 rule via [data-specimen].
  const h1s = [...document.querySelectorAll("h1")].filter((el) => !el.closest("[data-specimen]"));
  const toggle = [...header.querySelectorAll("button, a")].find((el) =>
    /theme/i.test(el.getAttribute("aria-label") ?? ""),
  );

  return {
    bar: {
      height: hrect.height,
      position: hcs.position,
      tag: header.tagName + (header.className ? "." + String(header.className).trim().split(/\s+/)[0] : ""),
      borderBottom: px(hcs.borderBottomWidth),
      background: rgba(hcs.backgroundColor),
      stickyTop: hcs.top,
    },
    row: rrect
      ? { left: rrect.left + px(rcs.paddingLeft), right: rrect.right - px(rcs.paddingRight), height: rrect.height }
      : null,
    content: cbox,
    nav: {
      present: Boolean(nav),
      items: links.map((a) => {
        const r = a.getBoundingClientRect();
        const cs = getComputedStyle(a);
        return {
          label: (a.textContent || "").trim(),
          height: r.height,
          y: r.y,
          icons: a.querySelectorAll("svg, img, picture").length,
          fontSize: px(cs.fontSize),
        };
      }),
    },
    brand: bcs
      ? {
          mono: /JetBrains|monospace|Mono/i.test(brandText?.fontFamily ?? bcs.fontFamily),
          family: brandText?.fontFamily ?? bcs.fontFamily,
          uppercase: (brandText?.textTransform ?? "") === "uppercase",
        }
      : null,
    h1: h1s.map((el) => ({ text: (el.textContent || "").trim().slice(0, 40), family: getComputedStyle(el).fontFamily })),
    toggle: toggle ? { label: toggle.getAttribute("aria-label") } : null,
    head: {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
      themeScript: Boolean(
        [...document.querySelectorAll("script:not([src])")].some((s) => /messer-theme/.test(s.textContent || "")),
      ),
      colourScheme: document.querySelector('meta[name="color-scheme"]')?.getAttribute("content") ?? null,
      favicon: Boolean(document.querySelector('link[rel~="icon"]')),
    },
    state,
    stateForced: forced,
  };
};

/* ── assertions ───────────────────────────────────────────────────────────── */

function judge(url, theme, m) {
  const fails = [];
  const warn = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };

  if (m.noHeader) {
    fails.push("§16 no <header> — a surface in this family has a topbar");
    return { fails, warn };
  }

  ok(Math.abs(m.bar.height - BAR.height) <= BAR.tolerance, `§16 bar is ${m.bar.height}px, not ${BAR.height}px (including the hairline)`);
  if (!["sticky", "fixed"].includes(m.bar.position)) warn.push(`bar is position:${m.bar.position} — on a document the topbar is sticky`);
  else ok(m.bar.stickyTop === "0px", `bar sticks at ${m.bar.stickyTop}, not 0`);
  ok(m.bar.borderBottom === 1, `§16 bar hairline is ${m.bar.borderBottom}px, not 1px`);

  if (m.row && m.content) {
    const d = Math.abs(m.row.left - m.content.left);
    ok(d <= GUTTER, `§16 bar row starts ${d.toFixed(1)}px from the page container's left edge`);
  } else {
    warn.push("§16 could not find the bar row or the page container to align");
  }

  ok(m.nav.present, "§16 header has no <nav>");
  for (const item of m.nav.items) {
    ok(Math.abs(item.height - CTRL) <= 0.5, `§6 nav item "${item.label}" is ${item.height}px tall, not ${CTRL}px`);
    ok(item.icons === 0, `§21 nav item "${item.label}" carries an icon — the header nav is exempt from the destination arrow`);
    ok(item.label.length > 0, "§12 a nav item has no label");
  }
  if (m.nav.items.length > 1) {
    const centres = m.nav.items.map((i) => i.y + i.height / 2);
    ok(Math.max(...centres) - Math.min(...centres) <= 0.5, "§16 nav items are not on one baseline");
  }

  ok(m.h1.length === 1, `§3 page has ${m.h1.length} h1 elements, expected exactly 1`);
  for (const h of m.h1) ok(/Golos/.test(h.family), `§3 h1 "${h.text}" is ${h.family}, not Golos`);

  ok(Boolean(m.brand), "§13 header carries no wordmark");
  if (m.brand) {
    ok(m.brand.mono, `§5 wordmark is ${m.brand.family}, not mono`);
    ok(m.brand.uppercase, "§5 wordmark is not uppercase");
  }

  ok(Boolean(m.toggle), '§11 header has no theme control with an accessible "…theme…" name');

  ok(Boolean(m.head.title), "page has no <title>");
  ok(Boolean(m.head.description), "page has no meta description");
  ok(Boolean(m.head.favicon), "page declares no favicon");
  ok(Boolean(m.head.colourScheme), "page declares no color-scheme");
  ok(m.head.themeScript, "no pre-paint messer-theme script — the first paint can flash the wrong surface");

  if (m.state) {
    ok(m.state.hasAfter, `§11 selected item "${m.state.label}" has no rule`);
    ok(Math.abs(m.state.thinAxis - RULE) <= 0.5, `§11 selected rule is ${m.state.thinAxis}px, not ${RULE}px`);
    ok(m.state.tintAlpha > 0, `§11 selected item "${m.state.label}" has no accent tint`);
    if (m.state.ruleBg) {
      const same = ["r", "g", "b"].every((k) => Math.abs(m.state.ruleBg[k] - m.state.barBg[k]) < 6);
      ok(!same, "§11 selected rule is the bar's own colour — no accent rule is painted");
    }
    ok(m.state.ruleBg?.a > 0, "§11 selected rule is transparent");
  } else {
    warn.push("§11 no nav item carries aria-current and none could be forced");
  }
  if (m.stateForced) warn.push("§11 selected state was forced on the first nav item (no aria-current in the DOM)");

  return { fails, warn };
}

/* ── run ──────────────────────────────────────────────────────────────────── */

async function runUrls() {
  const { chromium } = loadPlaywright();
  const themes = themeArg === "both" ? ["light", "dark"] : [themeArg];
  const browser = await chromium.launch();
  const results = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    for (const url of urls) {
      for (const theme of themes) {
        await page.goto(url, { waitUntil: "networkidle" });
        await page.evaluate((t) => {
          document.documentElement.classList.toggle("dark", t === "dark");
        }, theme);
        await page.waitForTimeout(200);
        const m = await page.evaluate(measureChrome);
        const { fails, warn } = judge(url, theme, m);
        results.push({ url, theme, fails, warn, measured: m });
      }
    }
  } finally {
    await browser.close();
  }

  const label = (u) => {
    const url = new URL(u);
    if (url.protocol !== "file:") return url.pathname;
    return url.pathname.split("/").slice(-3).join("/"); // …/<repo>/<page>/index.html
  };
  const width = Math.min(46, Math.max(...results.map((r) => label(r.url).length + 2), 12));
  console.log(`page${" ".repeat(Math.max(0, width - 4))}theme     bar  nav  rule  fonts  head  verdict`);
  for (const r of results) {
    const m = r.measured;
    const cell = (good, text) => (good ? " ok " : " ✗  ");
    const bar = m.noHeader ? false : Math.abs(m.bar.height - BAR.height) <= BAR.tolerance;
    const navOk = !m.noHeader && m.nav.items.length > 0 && m.nav.items.every((i) => i.icons === 0 && Math.abs(i.height - CTRL) <= 0.5);
    const ruleOk = Boolean(m.state?.hasAfter) && Math.abs((m.state?.thinAxis ?? 0) - RULE) <= 0.5;
    const fontsOk = !m.noHeader && m.h1.length === 1 && m.h1.every((h) => /Golos/.test(h.family)) && Boolean(m.brand?.mono);
    const headOk = Boolean(m.head?.title) && Boolean(m.head?.description) && Boolean(m.head?.themeScript);
    console.log(
      `${label(r.url).padEnd(width)}${r.theme.padEnd(9)} ${cell(bar)}  ${cell(navOk)}  ${cell(ruleOk)}  ${cell(fontsOk)}   ${cell(headOk)}  ${r.fails.length ? "FAIL" : "pass"}`,
    );
  }

  let failures = 0;
  for (const r of results) {
    for (const f of r.fails) { failures++; console.log(`  ✗ ${label(r.url)} · ${r.theme}: ${f}`); }
    for (const w of r.warn) console.log(`  ! ${label(r.url)} · ${r.theme}: ${w}`);
  }
  console.log(`\nchrome-check  ${failures ? "FAILED" : "green"} · ${failures} failure(s) · ${results.reduce((n, r) => n + r.warn.length, 0)} warning(s) · ${results.length} page-theme(s)`);
  if (jsonOut) {
    fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
    fs.writeFileSync(jsonOut, JSON.stringify(results, null, 1));
    console.log(`  json → ${path.resolve(jsonOut)}`);
  }
  return failures;
}

/* ── selftest: a page that breaks every rule, plus a page that keeps them ──── */

const GOOD = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Fixture</title><meta name="description" content="fixture">
<meta name="color-scheme" content="light dark"><link rel="icon" href="data:,">
<script>try{localStorage.getItem("messer-theme")}catch(e){}</script>
<style>
  :root { --surface:#fff; --primary:#2b2b2b; --border:#e4e4e4; }
  body { margin:0; font-family: sans-serif; }
  header { position: sticky; top: 0; background: var(--surface); border-bottom: 1px solid var(--border); }
  .row { display:flex; align-items:center; gap:16px; height:47px; max-width:1152px; margin:0 auto; padding:0 32px; }
  .brand span { font-family: "JetBrains Mono", monospace; text-transform: uppercase; font-size: 14px; }
  nav { margin-left:auto; display:flex; }
  nav a { display:flex; align-items:center; height:32px; padding:0 8px; position:relative; text-decoration:none; color:#333; }
  nav a[aria-current] { background: rgba(43,43,43,.1); }
  nav a[aria-current]::after { content:""; position:absolute; left:0; right:0; bottom:0; height:2px; background: var(--primary); }
  .shell { max-width:1152px; margin:0 auto; padding:0 32px; }
  h1 { font-family: "Golos Text", sans-serif; }
  .toggle { width:32px; height:32px; }
</style></head><body>
<header><div class="row"><a class="brand" href="#"><span>Fixture</span></a>
<nav><a href="#a" aria-current="page">One</a><a href="#b">Two</a></nav>
<button class="toggle" aria-label="Switch theme">t</button></div></header>
<section class="shell"><h1>Fixture</h1></section></body></html>`;

function broken(mutations) {
  let html = GOOD;
  for (const [from, to] of mutations) {
    if (!html.includes(from)) throw new Error(`selftest fixture no longer contains: ${from}`);
    html = html.replace(from, to);
  }
  return html;
}

const CASES = [
  ["bar 49px", [["height:47px", "height:48px"]], /bar is 49px/],
  ["nav item 36px", [["height:32px; padding:0 8px", "height:36px; padding:0 8px"]], /nav item "One" is 36px/],
  ["arrow in nav", [['<a href="#b">Two</a>', '<a href="#b">Two <svg width="12" height="12"></svg></a>']], /carries an icon/],
  ["rule 1px", [["height:2px; background: var(--primary)", "height:1px; background: var(--primary)"]], /selected rule is 1px/],
  ["no tint", [["nav a[aria-current] { background: rgba(43,43,43,.1); }", ""]], /has no accent tint/],
  ["h1 system font", [['h1 { font-family: "Golos Text", sans-serif; }', 'h1 { font-family: sans-serif; }']], /not Golos/],
  ["wordmark sans", [['font-family: "JetBrains Mono", monospace; text-transform: uppercase;', 'font-family: sans-serif; text-transform: uppercase;']], /wordmark is sans-serif, not mono/],
  ["row out of the box", [["height:47px; max-width:1152px; margin:0 auto; padding:0 32px; }", "height:47px; max-width:none; margin:0 auto; padding:0 32px; }"]], /from the page container's left edge/],
  ["no theme script", [['<script>try{localStorage.getItem("messer-theme")}catch(e){}</script>', ""]], /pre-paint messer-theme script/],
  ["no theme control", [['<button class="toggle" aria-label="Switch theme">t</button>', ""]], /no theme control/],
];

async function runSelftest() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-selftest-"));
  let bad = 0;
  try {
    const goodPath = path.join(dir, "good.html");
    fs.writeFileSync(goodPath, GOOD);
    await page.goto(pathToFileURL(goodPath).href, { waitUntil: "networkidle" });
    const goodFails = judge(goodPath, "light", await page.evaluate(measureChrome)).fails;
    if (goodFails.length) { bad++; console.log(`  ✗ fixture that should pass reports: ${goodFails.join("; ")}`); }
    else console.log("  ok  control fixture is green");

    for (const [label, mutations, expect] of CASES) {
      const p = path.join(dir, `${label.replace(/\W+/g, "-")}.html`);
      fs.writeFileSync(p, broken(mutations));
      await page.goto(pathToFileURL(p).href, { waitUntil: "networkidle" });
      const { fails } = judge(p, "light", await page.evaluate(measureChrome));
      const hit = fails.some((f) => expect.test(f));
      if (!hit) { bad++; console.log(`  ✗ ${label}: expected a failure matching ${expect}, got ${fails.length ? fails.join("; ") : "none"}`); }
      else console.log(`  ok  ${label}`);
    }
  } finally {
    await browser.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(`\nchrome-check --selftest  ${bad ? "FAILED" : "green"} · ${bad} case(s) that did not fire`);
  return bad;
}

const failures = selftest ? await runSelftest() : await runUrls();
process.exit(failures ? 1 : 0);
