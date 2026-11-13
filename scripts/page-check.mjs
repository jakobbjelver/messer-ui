// The generated-document gate: the chrome *two* fronts share, measured as a pair.
//
//   node scripts/page-check.mjs <page.html> [<page.html> ...] [--json <out>] [--theme light|dark|both]
//   node scripts/page-check.mjs --selftest
//
// `chrome-check.mjs` measures the topbar of one document (§11/§16/§21). It cannot see the things that
// actually diverge between the two generated fronts — a contents rail with a track on one page and a
// numeral column on the other, a table floating on the drafting sheet, a dashboard rendered as an
// ordered list, a custom switch, a badge that wraps, two timestamps in one view, two footers that
// mean different things. Those are *contract* violations, and a contract has to be measured on both
// documents at once.
//
// Each local file is served over a throwaway same-origin http server (the dashboard fetches
// backlog.json and /api/state), so the block is measured as it renders, not as it is written.
//
// Exit 1 on any violation, 0 when green.

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const FLOOR = 10; // §19: no visible text below 10px
const BADGE_MAX = 24; // §18: a badge is a 20px line; 24 allows its border and one line's rounding
const SWITCH = { w: 32, h: 18 }; // the .m-switch atom
const CHROME = [".pg-bar", ".pg-bar__row", ".pg-brand", ".pg-nav", ".pg-actions", ".pg-hero", ".pg-sec", ".pg-rail", ".pg-foot"];
const FOOT = /^Messer [\p{L} .]+ · (standard \d+\.\d+\.\d+ · )?canon \d+\.\d+\.\d+ · built \d{4}-\d{2}-\d{2}$/u;
const STAMP = /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/g;

function usage(message) {
  if (message) console.error(message);
  console.error(
    "usage: node scripts/page-check.mjs <page.html> [<page.html> ...] [--json <out>] " +
      "[--theme light|dark|both]\n       node scripts/page-check.mjs --selftest",
  );
  process.exit(1);
}

const pages = [];
let jsonOut = null;
let themeArg = "light";
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
    case "--json": jsonOut = value(); break;
    case "--theme": themeArg = value(); break;
    case "--selftest": selftest = true; break;
    case "--help": case "-h": usage(); break;
    default:
      if (argv[i].startsWith("-")) usage(`unknown option ${argv[i]}`);
      pages.push(argv[i]);
  }
}

if (!selftest && !pages.length) usage("at least one page is required");
if (!["light", "dark", "both"].includes(themeArg)) usage(`--theme must be light, dark or both (got ${themeArg})`);
for (const p of pages) if (!fs.existsSync(p)) usage(`not a file: ${p}`);

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

/* ── the throwaway server: same origin, real fetches ──────────────────────── */

const MIME = { ".html": "text/html", ".json": "application/json", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

/** Serve the page's own directory, plus a control plane so the switches and badge render. */
function startServer(file) {
  const dir = path.dirname(path.resolve(file));
  const name = path.basename(path.resolve(file));
  let state = { paused: [], autofix: [] };
  try {
    const data = JSON.parse(fs.readFileSync(path.join(dir, "backlog.json"), "utf8"));
    // Let one row carry the badge, so the badge is measured where it is shown, not only where it hides.
    const first = (data.findings ?? [])[0];
    if (first?.projectId) state = { paused: [], autofix: [first.projectId], updated_at: new Date().toISOString() };
  } catch { /* no dashboard on this page */ }

  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = (req.url ?? "/").split("?")[0];
      if (url === "/api/state") {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (c) => { body += c; });
          req.on("end", () => {
            try { state = { ...state, ...JSON.parse(body || "{}") }; } catch {}
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(state));
          });
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(state));
        return;
      }
      const rel = url === "/" ? name : url.replace(/^\//, "");
      const target = path.join(dir, rel);
      if (!target.startsWith(dir) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(target)] ?? "application/octet-stream" });
      fs.createReadStream(target).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port, name }));
  });
}

/* ── the in-page measurement ──────────────────────────────────────────────── */

const measurePage = async () => {
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = (colour) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return { r, g, b, a };
  };
  const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  const visible = (el) => {
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
  };

  const header = document.querySelector("header");
  const navLinks = header ? [...header.querySelectorAll("nav a")].filter((a) => (a.getAttribute("href") ?? "").startsWith("#")) : [];
  const sections = [...document.querySelectorAll("main section[id]")].map((s) => s.id);

  const rail = document.querySelector(".pg-rail");
  const railNav = rail?.querySelector("nav") ?? null;
  const railTop = railNav ? [...railNav.children].filter((c) => c.tagName === "A") : [];

  // Data blocks must sit on their own paper: the drafting sheet is the page, not the data.
  const transparent = [];
  for (const el of document.querySelectorAll(".bl, .pg-data, pre")) {
    if (!visible(el)) continue;
    const bg = rgba(getComputedStyle(el).backgroundColor);
    if (bg.a !== 255) transparent.push(`${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).trim().split(/\s+/)[0] : ""} (alpha ${(bg.a / 255).toFixed(2)})`);
  }

  const list = document.querySelector(".bl__list");
  const badges = [...document.querySelectorAll(".bl [data-badge], .bl .m-badge, .pg-sec .m-badge")].map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      cls: String(el.className),
      nowrap: cs.whiteSpace === "nowrap",
      height: el.classList.contains("m-badge") ? px(cs.height) : Math.round(r.height),
      visible: visible(el),
      canon: el.classList.contains("m-badge"),
    };
  });

  const switches = [...document.querySelectorAll(".bl [role='switch']")].map((el) => {
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: String(el.className),
      w: px(cs.width),
      h: px(cs.height),
      radius: px(cs.borderTopLeftRadius),
      labelled: Boolean(el.getAttribute("aria-label")),
    };
  });

  // §19 type floor: visible text, not a specimen, not decoration.
  const tiny = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!(el instanceof HTMLElement)) continue;
    if (el.closest("[data-specimen], [aria-hidden='true'], script, style")) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    if (!visible(el)) continue;
    const size = px(getComputedStyle(el).fontSize);
    if (size > 0 && size < 10) tiny.push(`${size}px ${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).trim().split(/\s+/)[0] : ""} "${text(el).slice(0, 30)}"`);
  }

  // Two timestamps in one view is one too many: the same minute must not print twice.
  const stamps = (document.body.innerText.match(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/g) ?? []).map((s) => s.replace("T", " "));
  const dupes = [...new Set(stamps.filter((s, i) => stamps.indexOf(s) !== i))];

  const foot = document.querySelector(".pg-foot__meta");
  const eyebrow = document.querySelector(".pg-hero .m-label, .pg-hero .pg-eyebrow, .pg-hero p:first-child");
  const h1 = [...document.querySelectorAll("h1")].filter((el) => !el.closest("[data-specimen]"));
  const h2 = [...document.querySelectorAll("h2")].filter((el) => !el.closest("[data-specimen]"));
  const pressed = (sel) => [...document.querySelectorAll(sel)].filter((b) => b.getAttribute("aria-pressed") === "true");

  return {
    nav: navLinks.map((a) => ({ href: a.getAttribute("href").slice(1), label: text(a) })),
    sections,
    rail: rail
      ? {
          present: true,
          track: railNav ? px(getComputedStyle(railNav).borderLeftWidth) : 0,
          extras: [...rail.children].filter((c) => !c.matches("nav, .pg-rail__group")).map((c) => text(c).slice(0, 40)),
          top: railTop.map((a) => ({ n: text(a.querySelector(".pg-rail__n")), label: text(a) })),
          lastAudit: /last audit/i.test(text(rail)),
        }
      : { present: false },
    transparent,
    list: list ? { style: getComputedStyle(list).listStyleType } : null,
    badges,
    switches,
    tiny,
    stamps,
    dupes,
    foot: foot ? { text: text(foot) } : null,
    eyebrow: text(eyebrow),
    h1: h1.length,
    h2: h2.length,
    chrome: Object.fromEntries(
      [".pg-bar", ".pg-bar__row", ".pg-brand", ".pg-nav", ".pg-actions", ".pg-hero", ".pg-sec", ".pg-rail", ".pg-foot"].map(
        (c) => [c, Boolean(document.querySelector(c))],
      ),
    ),
    filters: {
      sev: pressed(".bl__sev-btn").map((b) => text(b)),
      proj: pressed("[data-proj]").map((b) => text(b)),
      hasSev: Boolean(document.querySelector(".bl__sev-btn")),
      hasProj: Boolean(document.querySelector("[data-proj]")),
    },
  };
};

/* ── assertions ───────────────────────────────────────────────────────────── */

function judge(m) {
  const fails = [];
  const warn = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };

  // A1/A2 — the header nav is this page's sections, in the document's order.
  const idx = m.nav.map((n) => m.sections.indexOf(n.href));
  ok(m.nav.length > 0, "§16 the header nav has no in-page link");
  ok(idx.every((i) => i >= 0), `§21 a nav item points at no section on this page (${m.nav.filter((n, i) => idx[i] < 0).map((n) => n.href).join(", ")})`);
  ok(idx.every((v, i) => i === 0 || v > idx[i - 1]), `§16 the nav order does not follow the document (${m.nav.map((n) => n.href).join(" → ")} vs ${m.sections.join(" → ")})`);

  // A3/A4 — one contents rail, no track, no trailer, two-digit numerals on top-level entries.
  ok(m.rail.present, "the page has no .pg-rail contents rail");
  if (m.rail.present) {
    ok(m.rail.track === 0, `the rail draws a ${m.rail.track}px track — the numeral column is the rail's structure`);
    ok(m.rail.extras.length === 0, `the rail carries a block below the contents (${m.rail.extras.join(", ")}) — a timestamp here is a second view of the same fact`);
    ok(!m.rail.lastAudit, "the rail is labelled \"Last audit\" — the block owns the audit time, the footer the build time");
    const badN = m.rail.top.filter((i) => !/^\d{2}$/.test(i.n));
    ok(badN.length === 0, `${badN.length} rail entr${badN.length === 1 ? "y has" : "ies have"} no two-digit numeral ("${badN.slice(0, 3).map((i) => `${i.n || "∅"} ${i.label}`).join('", "')}${badN.length > 3 ? `", … ${badN.length - 3} more` : '"'})`);
  }

  // A5 — data on its own paper.
  ok(m.transparent.length === 0, `§16 a data block is transparent, so the drafting sheet runs through it (${m.transparent.join(", ")})`);

  // A6 — the dashboard is a list of rows, not a numbered document list.
  if (m.list) ok(m.list.style === "none", `the dashboard list renders markers (list-style: ${m.list.style}) — a rank column and a marker double-number every row`);

  // A7 — a badge is the canon badge: one line, sentence case, 20px.
  for (const b of m.badges) {
    ok(b.canon, `"${b.cls}" is a badge-shaped element that is not .m-badge (canon §18)`);
    ok(b.nowrap, `§18 a badge does not set white-space: nowrap, so it wraps mid-word (${b.cls})`);
    if (b.visible) ok(b.height <= BADGE_MAX, `§18 a badge is ${b.height}px tall — it has wrapped onto a second line`);
  }

  // A8 — the switch is the canon atom, not a hand-painted pill.
  for (const s of m.switches) {
    ok(s.tag === "INPUT", `a dashboard switch is a <${s.tag.toLowerCase()}>, not the canon .m-switch input`);
    ok(/\bm-switch\b/.test(s.cls), "a dashboard switch does not carry the .m-switch atom");
    ok(Math.abs(s.w - SWITCH.w) <= 0.5 && Math.abs(s.h - SWITCH.h) <= 0.5, `a switch measures ${s.w}×${s.h}, not ${SWITCH.w}×${SWITCH.h}`);
    ok(s.radius === 0, `§1 a switch has ${s.radius}px radius — everything square but avatars, dots and scrollbar thumbs`);
    ok(s.labelled, "a switch has no accessible name");
  }

  // A9 — the type floor.
  ok(m.tiny.length === 0, `§19 text below ${FLOOR}px (${m.tiny.slice(0, 4).join("; ")})`);

  // A10 — one timestamp per fact.
  ok(m.dupes.length === 0, `the same timestamp prints twice in one view (${m.dupes.join(", ")}) — the block owns the audit time, the footer the build time`);

  // A11 — one footer grammar.
  ok(Boolean(m.foot), "the page has no .pg-foot__meta version line");
  if (m.foot) ok(FOOT.test(m.foot.text), `the footer meta reads "${m.foot.text}", not "<Product> · [standard x.y.z · ]canon x.y.z · built YYYY-MM-DD HH:MM <zone>"`);

  // A14 — outline: one h1, and one h2 per top-level rail entry.
  ok(m.h1 === 1, `§3 the page has ${m.h1} h1 elements, expected exactly 1`);
  if (m.rail.present) {
    ok(m.h2 === m.rail.top.length, `§3 the page has ${m.h2} section h2 headings but the rail lists ${m.rail.top.length} sections — one of the two is describing a different page`);
  }

  // A15 — a filter group always has exactly one selection, and "All" is one of them.
  if (m.filters.hasSev) {
    ok(m.filters.sev.length === 1, `the severity filter has ${m.filters.sev.length} selected controls — "none" is not a state`);
    ok(m.filters.sev.includes("All"), `the severity filter has no selected "All" (selected: ${m.filters.sev.join(", ") || "none"})`);
  }
  if (m.filters.hasProj) ok(m.filters.proj.length === 1, `the project filter has ${m.filters.proj.length} selected controls — "none" is not a state`);

  // A12 — the eyebrow says what this page is (the pair check asserts the two differ).
  ok(m.eyebrow.length > 0, "the hero has no eyebrow — the label above the h1 is what tells the two documents apart");

  // A13 — the shared chrome is present (the pair check asserts it is the *same* chrome).
  const missing = CHROME.filter((c) => !m.chrome[c]);
  ok(missing.length === 0, `the page does not use the shared chrome (${missing.join(", ")})`);

  return { fails: [...new Set(fails)], warn: [...new Set(warn)] };
}

function judgePair(a, b) {
  const fails = [];
  const label = (f) => path.resolve(f).split("/").slice(-3).join("/");
  const na = label(a.file);
  const nb = label(b.file);
  if (!a.m.eyebrow || !b.m.eyebrow) fails.push("A12 one of the two pages has no hero eyebrow");
  else if (a.m.eyebrow.toLowerCase() === b.m.eyebrow.toLowerCase()) {
    fails.push(`A12 both heroes carry the same eyebrow ("${a.m.eyebrow}") — the eyebrow says what the page is, and these are two different documents`);
  }
  // The footer grammar itself is judged per page (A11). What the pair adds is that both pages carry
  // one: an absent version line on either side is the divergence, not the presence of `standard x.y.z`
  // on the document that is governed by it.
  if (!a.m.foot || !b.m.foot) fails.push(`A11 one of the two pages has no version line (${!a.m.foot ? na : nb})`);
  for (const c of CHROME) {
    if (a.m.chrome[c] !== b.m.chrome[c]) fails.push(`A13 ${c} is on one page and not the other (${a.m.chrome[c] ? na : nb})`);
  }
  return { fails };
}

/* ── run ──────────────────────────────────────────────────────────────────── */

async function runPages() {
  const { chromium } = loadPlaywright();
  const themes = themeArg === "both" ? ["light", "dark"] : [themeArg];
  const browser = await chromium.launch();
  const results = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    for (const file of pages) {
      const { server, port, name } = await startServer(file);
      const page = await ctx.newPage();
      try {
        for (const theme of themes) {
          await page.addInitScript((t) => {
            try { localStorage.setItem("messer-theme", t); } catch {}
          }, theme);
          await page.goto(`http://127.0.0.1:${port}/${name}`, { waitUntil: "networkidle" });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(300);

          // The interaction that the report found broken: filter by project, then read both groups.
          const before = await page.evaluate(measurePage);
          let after = null;
          const chip = page.locator("[data-proj]").nth(1);
          if (await chip.count()) {
            await chip.click();
            await page.waitForTimeout(200);
            after = await page.evaluate(measurePage);
          }

          const { fails, warn } = judge(before);
          if (after) {
            if (after.filters.sev.length !== 1 || !after.filters.sev.includes("All")) {
              fails.push(`A15 selecting a project chip cleared the severity filter (selected: ${after.filters.sev.join(", ") || "none"}) — the two dimensions share one state`);
            }
            if (after.filters.proj.length !== 1) fails.push(`A15 selecting a project chip left ${after.filters.proj.length} project chips selected`);
          }
          results.push({ file, theme, fails, warn, m: before, after });
        }
      } finally {
        await page.close();
        server.close();
      }
    }
  } finally {
    await browser.close();
  }

  const label = (f) => path.resolve(f).split("/").slice(-3).join("/");
  const width = Math.min(48, Math.max(...results.map((r) => label(r.file).length + 2), 12));
  console.log(`page${" ".repeat(Math.max(0, width - 4))}theme     nav  rail data list badge swit floor time foot h2   verdict`);
  for (const r of results) {
    const m = r.m;
    const cell = (good) => (good ? " ok " : " ✗  ");
    const hit = (needle) => !r.fails.some((f) => f.includes(needle));
    console.log(
      `${label(r.file).padEnd(width)}${r.theme.padEnd(9)} ` +
        [hit("nav order"), hit("contents rail"), hit("transparent"), hit("markers"), hit("badge"), hit(".m-switch"), hit("below 10px"), hit("timestamp"), hit("footer meta"), hit("h1")]
          .map(cell)
          .join("  ") +
        `  ${r.fails.length ? "FAIL" : "pass"}`,
    );
  }

  let failures = 0;
  for (const r of results) {
    for (const f of r.fails) { failures++; console.log(`  ✗ ${label(r.file)} · ${r.theme}: ${f}`); }
    for (const w of r.warn) console.log(`  ! ${label(r.file)} · ${r.theme}: ${w}`);
  }
  if (results.length > 1) {
    const light = results.filter((r) => r.theme === "light");
    if (light.length > 1) {
      const { fails } = judgePair(...light);
      for (const f of fails) { failures++; console.log(`  ✗ pair: ${f}`); }
    }
  }
  console.log(`\npage-check  ${failures ? "FAILED" : "green"} · ${failures} failure(s) · ${results.length} page-theme(s)`);
  if (jsonOut) {
    fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
    fs.writeFileSync(jsonOut, JSON.stringify(results, null, 1));
    console.log(`  json → ${path.resolve(jsonOut)}`);
  }
  return failures;
}

/* ── selftest ─────────────────────────────────────────────────────────────── */

const GOOD = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Fixture</title><meta name="description" content="fixture">
<style>
  :root { --surface:#fff; --background:#fafafa; --border:#e4e4e4; --border-strong:#999; --text-3:#8a8a8a; --primary:#2b2b2b; }
  body { margin:0; font-family: sans-serif; font-size:14px; }
  .pg-bar { position:sticky; top:0; background:var(--surface); border-bottom:1px solid var(--border); }
  .pg-bar__row { display:flex; align-items:center; gap:16px; height:47px; max-width:1152px; margin:0 auto; padding:0 32px; }
  .pg-brand { font-family:"JetBrains Mono",monospace; text-transform:uppercase; }
  .pg-nav { margin-left:auto; display:flex; gap:2px; }
  .pg-nav a { display:flex; align-items:center; height:32px; padding:0 8px; text-decoration:none; color:#333; }
  .pg-rail { width:196px; }
  .pg-rail nav { display:grid; gap:1px; }
  .pg-rail a { display:flex; gap:8px; min-height:28px; padding:4px 0; text-decoration:none; color:#333; }
  .pg-rail__n { flex:0 0 2ch; font-family:monospace; font-size:10px; }
  .pg-hero h1 { font-family:"Golos Text",sans-serif; font-size:40px; margin:10px 0; }
  .pg-sec { margin-top:40px; border-top:1px solid var(--border); }
  .pg-sec__title { font-family:"Golos Text",sans-serif; font-size:24px; margin:0 0 16px; }
  .pg-data { background:var(--surface); border:1px solid var(--border); }
  .pg-prose ol { list-style: decimal outside; padding-left:22px; }
  .pg-prose li::marker { color:var(--text-3); }
  .pg-foot__meta { font-family:monospace; font-size:10.5px; text-transform:uppercase; }
  .bl { background:var(--surface); border:1px solid var(--border); }
  .bl__meta { font-family:monospace; font-size:10.5px; }
  .bl__list { list-style:none; margin:0; padding:0; }
  .bl__sev-btn { font-size:13.5px; }
  .bl__rank { font-family:monospace; font-size:10.5px; }
  .m-badge { display:inline-flex; align-items:center; height:20px; padding-inline:8px; border:1px solid var(--border-strong); background:var(--surface); font-size:12px; white-space:nowrap; }
  .m-switch { appearance:none; position:relative; width:32px; height:18px; border:1px solid var(--border-strong); border-radius:0; background:var(--border-strong); }
  .bl__sw-t { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
  pre { background:var(--surface); border:1px solid var(--border); }
</style></head><body>
<header class="pg-bar"><div class="pg-bar__row">
  <a class="pg-brand" href="#one">Fixture</a>
  <nav class="pg-nav"><a href="#one">One</a><a href="#two">Two</a></nav>
  <div class="pg-actions"><button aria-label="Switch theme">t</button></div>
</div></header>
<main>
  <aside class="pg-rail"><nav><a href="#one"><span class="pg-rail__n">00</span>One</a><a href="#two"><span class="pg-rail__n">01</span>Two</a></nav></aside>
  <section class="pg-hero"><p class="m-label">Fixture kind</p><h1>Fixture</h1></section>
  <section class="pg-sec" id="one"><h2 class="pg-sec__title">One</h2>
    <div class="bl">
      <span class="bl__meta">audit · 2026-11-13 03:00 CET</span>
      <button class="bl__sev-btn" data-sev="all" aria-pressed="true">All</button>
      <button class="bl__sev-btn" data-sev="error" aria-pressed="false">Errors</button>
      <button class="bl__chip" data-proj="all" aria-pressed="true">All</button>
      <button class="bl__chip" data-proj="fixture" aria-pressed="false">Fixture</button>
      <ol class="bl__list"><li class="bl__item">
        <span class="bl__rank">01</span>
        <span class="m-badge" data-badge>auto-fix</span>
        <label class="bl__sw"><input class="m-switch" type="checkbox" role="switch" aria-label="Auto-fix Fixture"><span class="bl__sw-t">fix</span></label>
      </li></ol>
    </div>
    <div class="pg-data"><table><tbody><tr><td>cell</td></tr></tbody></table></div>
    <div class="pg-prose"><ol><li>a prose step</li></ol><pre><code>x</code></pre></div>
  </section>
  <section class="pg-sec" id="two"><h2 class="pg-sec__title">Two</h2></section>
</main>
<footer class="pg-foot"><span class="pg-foot__meta">Messer Fixture · canon 2.4.0 · built 2026-11-13</span></footer>
</body></html>`;

function broken(mutations) {
  let html = GOOD;
  for (const [from, to] of mutations) {
    if (!html.includes(from)) throw new Error(`selftest fixture no longer contains: ${from}`);
    html = html.replace(from, to);
  }
  return html;
}

const CASES = [
  ["nav out of order", [['<a href="#one">One</a><a href="#two">Two</a>', '<a href="#two">Two</a><a href="#one">One</a>']], /nav order does not follow/],
  ["rail numeral", [['<span class="pg-rail__n">00</span>', '<span class="pg-rail__n">0.</span>']], /no two-digit numeral/],
  ["rail track", [["</style>", ".pg-rail nav { border-left:1px solid #e4e4e4; }</style>"]], /draws a 1px track/],
  ["rail trailer", [['</nav></aside>', '</nav><div class="m-label">Last audit</div></aside>']], /carries a block below the contents/],
  ["transparent data", [["</style>", ".bl { background:transparent; }</style>"]], /data block is transparent/],
  ["list marker", [["</style>", ".bl__list { list-style:decimal outside; }</style>"]], /renders markers/],
  ["wrapping badge", [["</style>", ".m-badge { white-space:normal; height:auto; }</style>"]], /white-space: nowrap/],
  ["custom switch", [['<input class="m-switch" type="checkbox" role="switch" aria-label="Auto-fix Fixture">', '<button role="switch" aria-label="Auto-fix Fixture" class="sw"></button>']], /not the canon .m-switch input|does not carry the .m-switch/],
  ["sub-10px text", [["</style>", ".bl__meta { font-size:9px; }</style>"]], /text below 10px/],
  ["duplicate timestamp", [["<h1>Fixture</h1>", "<h1>Fixture 2026-11-13 03:00</h1>"]], /prints twice in one view/],
  ["footer grammar", [['Messer Fixture · canon 2.4.0 · built 2026-11-13', 'Messer Fixture · canon 2.4.0 · 2026-11-13']], /footer meta reads/],
  ["two h1", [['<h2 class="pg-sec__title">Two</h2>', '<h2 class="pg-sec__title">Two</h2><h1>Second</h1>']], /2 h1 elements/],
  ["two pressed", [['data-sev="error" aria-pressed="false"', 'data-sev="error" aria-pressed="true"']], /severity filter has 2 selected/],
  ["no eyebrow", [['<p class="m-label">Fixture kind</p>', ""]], /no eyebrow/],
];

const SIBLING = GOOD.replace("Fixture kind", "Fixture kind").replace(
  "Messer Fixture · canon 2.4.0 · built 2026-11-13",
  "Messer Fixture Site · canon 2.4.0 · built 2026-11-14",
);

async function runSelftest() {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "page-selftest-"));
  let bad = 0;
  try {
    const good = path.join(dir, "good.html");
    fs.writeFileSync(good, GOOD);
    const { server, port } = await startServer(good);
    await page.goto(`http://127.0.0.1:${port}/good.html`, { waitUntil: "networkidle" });
    await page.waitForTimeout(150);
    const control = judge(await page.evaluate(measurePage));
    server.close();
    if (control.fails.length) { bad++; console.log(`  ✗ control fixture reports: ${control.fails.join("; ")}`); }
    else console.log("  ok  control fixture is green");

    for (const [label, mutations, expect] of CASES) {
      const p = path.join(dir, `${label.replace(/\W+/g, "-")}.html`);
      fs.writeFileSync(p, broken(mutations));
      const s = await startServer(p);
      await page.goto(`http://127.0.0.1:${s.port}/${path.basename(p)}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(120);
      const { fails } = judge(await page.evaluate(measurePage));
      s.server.close();
      if (!fails.some((f) => expect.test(f))) {
        bad++;
        console.log(`  ✗ ${label}: expected a failure matching ${expect}, got ${fails.length ? fails.join("; ") : "none"}`);
      } else console.log(`  ok  ${label}`);
    }

    // The pair assertions: same eyebrow, and a footer that means something else.
    const a = path.join(dir, "pair-a.html");
    const b = path.join(dir, "pair-b.html");
    fs.writeFileSync(a, GOOD);
    fs.writeFileSync(b, SIBLING);
    const sa = await startServer(a);
    await page.goto(`http://127.0.0.1:${sa.port}/pair-a.html`, { waitUntil: "networkidle" });
    const ma = { file: a, m: await page.evaluate(measurePage) };
    sa.server.close();
    const sb = await startServer(b);
    await page.goto(`http://127.0.0.1:${sb.port}/pair-b.html`, { waitUntil: "networkidle" });
    const mb = { file: b, m: await page.evaluate(measurePage) };
    sb.server.close();
    const pair = judgePair(ma, mb).fails;
    if (!pair.some((f) => /A12/.test(f))) { bad++; console.log(`  ✗ pair eyebrow: expected A12, got ${pair.join("; ") || "none"}`); }
    else console.log("  ok  pair eyebrow");
  } finally {
    await browser.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(`\npage-check --selftest  ${bad ? "FAILED" : "green"} · ${bad} case(s) that did not fire`);
  return bad;
}

const failures = selftest ? await runSelftest() : await runPages();
process.exit(failures ? 1 : 0);
