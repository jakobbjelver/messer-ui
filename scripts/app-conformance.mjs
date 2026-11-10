// URL-driven canon conformance for a *running app*.
//
//   node scripts/app-conformance.mjs --url <url> [--url ...] [--storage-state <path>]
//                                    [--theme light|dark|both] [--json <out>]
//
// check.mjs measures a fixture sink with data-fixture hooks. A shipped app has none, so this runner
// derives the same contract from what the DOM actually renders: native controls, computed radii,
// meta-label typography, numeric text, the real Tab focus ring and real hover states. It reports;
// it never tunes the app.
//
// Exit 1 on any violation, 0 when green. `--json` writes the raw measurements (not a summary).

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { measure, num, rgbClose } from "./lib/measure.mjs";
import { probeStates } from "./lib/states.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

/* ── args ─────────────────────────────────────────────────────────────────── */

function usage(message) {
  if (message) console.error(message);
  console.error(
    "usage: node scripts/app-conformance.mjs --url <url> [--url ...] [--storage-state <path>] " +
      "[--theme light|dark|both] [--json <out>]",
  );
  process.exit(1);
}

const urls = [];
let storageState = null;
let themeArg = "both";
let jsonOut = null;

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
    case "--storage-state": storageState = value(); break;
    case "--theme": themeArg = value(); break;
    case "--json": jsonOut = value(); break;
    case "--help": case "-h": usage(); break;
    default:
      if (argv[i].startsWith("-")) usage(`unknown option ${argv[i]}`);
      urls.push(argv[i]); // bare URL is convenient
  }
}

if (!urls.length) usage("at least one --url is required");
if (!["light", "dark", "both"].includes(themeArg)) usage(`--theme must be light, dark or both (got ${themeArg})`);
if (storageState && !fs.existsSync(storageState)) usage(`storage state not found: ${storageState}`);

const themes = themeArg === "both" ? ["light", "dark"] : [themeArg];
const contract = JSON.parse(fs.readFileSync(path.join(ROOT, "canon/states.json"), "utf8"));

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
  throw new Error("playwright not found");
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

const msOf = (value) =>
  Math.max(
    0,
    ...String(value).split(",").map((d) => d.trim()).filter(Boolean)
      .map((d) => (d.endsWith("ms") ? parseFloat(d) : parseFloat(d) * 1000)),
  );

const alphaOf = (value) => {
  const m = String(value).match(/rgba\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(/[,\s/]+/);
  return parts.length > 3 ? Number(parts[3]) : 1;
};

const pageName = (url) => {
  try {
    const u = new URL(url);
    return u.pathname + (u.search || "");
  } catch { return url; }
};

/* ── DOM probe ────────────────────────────────────────────────────────────── */

// One evaluate: radii, meta labels, numeric text, body type, font resolution, headings, transitions.
// Kept in the page so nothing is serialised twice and computed styles are read in the same style pass.
function probeApp(page) {
  return page.evaluate(async () => {
    // Force the two canon faces to load so "loaded" means the file resolved, not "not used yet".
    await Promise.allSettled([
      document.fonts.load('14px "Golos Text"'),
      document.fonts.load('12px "JetBrains Mono"'),
    ]);
    await document.fonts.ready;
    const px = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const family = (v) =>
      String(v).split(",")[0].replace(/["']/g, "").trim().replace(/\s+Variable$/, "");
    const textOf = (el) => (el.textContent || "").trim().replace(/\s+/g, " ");
    const visible = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0.5 && r.height > 0.5;
    };
    const describe = (el) => {
      const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 3).join(".");
      return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}`;
    };
    const SKIP = new Set([
      "SCRIPT", "STYLE", "LINK", "META", "HEAD", "TITLE", "PATH", "G", "CIRCLE", "RECT", "LINE",
      "POLYLINE", "POLYGON", "DEFS", "USE", "SYMBOL", "CLIPPATH", "LINEARGRADIENT", "STOP", "BR",
    ]);

    const skip = (el) => el instanceof SVGElement || SKIP.has(el.tagName.toUpperCase());

    // Dev-mode tooling is not app UI. Next injects a <nextjs-portal> with its own button; it lives in
    // a shadow root, so `closest()` cannot see it — check the root's host instead.
    const devChrome = (el) => {
      const root = el.getRootNode();
      return root instanceof ShadowRoot && /^NEXTJS-PORTAL$/i.test(root.host?.tagName || "");
    };

    // R1 — every visible box is square; only an element explicitly marked as one of the four legal
    // circles (avatar, status dot, slider thumb, toggle dot) may carry a radius.
    const radii = [];
    let radiusChecked = 0;
    for (const el of document.querySelectorAll("body *")) {
      if (skip(el) || devChrome(el) || !visible(el)) continue;
      radiusChecked++;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const corners = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius];
      const max = Math.max(...corners.map((v) =>
        v.endsWith("%") ? (parseFloat(v) / 100) * Math.min(r.width, r.height) : px(v)));
      if (max <= 0.5) continue;
      const isCircle = max >= Math.min(r.width, r.height) / 2 - 0.5 && Math.abs(r.width - r.height) <= 1.5;
      const marked = el.matches(
        "[data-avatar], [data-circle], [data-status-dot], [data-dot], [data-slider-thumb], .avatar, .status-dot, [role=slider]",
      ) || !!el.closest("[data-avatar], [data-circle]") ||
        // Tailwind's marker for the four legal circles. A pill (wide, not square) is still a
        // violation: the class only excuses a shape that is actually a circle.
        (el.classList.contains("rounded-full") && isCircle);
      radii.push({
        el: describe(el),
        radius: cs.borderTopLeftRadius,
        max: Math.round(max * 100) / 100,
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        marked,
      });
    }

    // R5 — the one meta label. Explicit `.m-label` / `[data-meta]` plus the uppercase-at-≤12px
    // signature, so an app that forgot the class is still caught rather than skipped.
    const meta = [];
    for (const el of document.querySelectorAll("body *")) {
      if (skip(el) || devChrome(el) || !visible(el)) continue;
      const t = textOf(el);
      if (!t) continue;
      const cs = getComputedStyle(el);
      const explicit = el.matches(".m-label, [data-meta], [data-meta-label]");
      const inferred = cs.textTransform === "uppercase" && px(cs.fontSize) <= 12;
      if (!explicit && !inferred) continue;
      // A button's own label is a control label, not a meta label.
      if (!explicit && el.closest("button, [role=button], [role=tab]")) continue;
      // A data value nested inside an explicit meta line (a <time> in a breadcrumb) inherits the
      // uppercase transform but is data, not a second label style. The wrapper is the label.
      if (!explicit && el.closest(".m-label, [data-meta], [data-meta-label]")) continue;
      meta.push({
        el: describe(el),
        text: t.slice(0, 40),
        fontSize: cs.fontSize,
        family: family(cs.fontFamily),
        transform: cs.textTransform,
        letterSpacing: cs.letterSpacing,
        weight: cs.fontWeight,
      });
    }

    // R6 — data text. Explicit data hooks plus the rendered signature: a short all-numeric string in
    // a mono face at display size is a stat value and must be tabular.
    const numeric = [];
    for (const el of document.querySelectorAll("body *")) {
      if (skip(el) || devChrome(el) || !visible(el)) continue;
      const t = textOf(el);
      if (!t || t.length > 40) continue;
      const cs = getComputedStyle(el);
      const explicit = el.matches(".tabular-nums, .m-data, time, td, th, [data-stat], [data-stat-value], [data-numeric]");
      const looksNumeric = /^[\s\d.,:%+\-–—/]+$/.test(t) && /\d/.test(t);
      const inferred = looksNumeric && px(cs.fontSize) >= 16 && /Mono/i.test(family(cs.fontFamily));
      if (!explicit && !inferred) continue;
      numeric.push({
        el: describe(el),
        text: t.slice(0, 24),
        tabular: String(cs.fontVariantNumeric).includes("tabular-nums"),
        family: family(cs.fontFamily),
        fontSize: cs.fontSize,
      });
    }

    const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
      .filter(visible)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: textOf(el).slice(0, 32),
        family: family(getComputedStyle(el).fontFamily),
        fontSize: getComputedStyle(el).fontSize,
      }));

    // Family resolution: a stack can name Golos and still paint a system fallback. A loaded face is
    // the proof; the width delta is recorded as a second signal (a missing face paints the generic
    // stack, so the two widths collapse to the same number).
    const widthOf = (stack) => {
      const span = document.createElement("span");
      span.textContent = "mmmmmmmmmmlli";
      span.style.cssText =
        "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;font-size:40px;font-family:" + stack;
      document.body.append(span);
      const w = span.getBoundingClientRect().width;
      span.remove();
      return Math.round(w * 100) / 100;
    };
    const fonts = {
      golosResolved: [...document.fonts].some((f) => /Golos/i.test(f.family) && f.status === "loaded"),
      monoResolved: [...document.fonts].some((f) => /JetBrains/i.test(f.family) && f.status === "loaded"),
      golosLoaded: [...document.fonts].some((f) => /Golos/i.test(f.family) && f.status === "loaded"),
      monoLoaded: [...document.fonts].some((f) => /JetBrains/i.test(f.family) && f.status === "loaded"),
      golosFaces: [...document.fonts].filter((f) => /Golos/i.test(f.family)).map((f) => f.status),
      monoFaces: [...document.fonts].filter((f) => /JetBrains/i.test(f.family)).map((f) => f.status),
      // A loaded face is the proof; the width delta is recorded as a second signal (a missing face
      // paints the generic stack, so the two widths collapse to the same number).
      golosWidthDelta: Math.round(Math.abs(widthOf('"Golos Text", monospace') - widthOf("monospace")) * 100) / 100,
      monoWidthDelta: Math.round(Math.abs(widthOf('"JetBrains Mono", monospace') - widthOf("monospace")) * 100) / 100,
    };

    // §11 motion — nothing may transition slower than the contract's 200ms.
    const transitions = [];
    for (const el of document.querySelectorAll("body *")) {
      if (skip(el) || devChrome(el) || !visible(el)) continue;
      const cs = getComputedStyle(el);
      const duration = cs.transitionDuration;
      const ms = Math.max(0, ...String(duration).split(",").map((d) => {
        const s = d.trim();
        return s.endsWith("ms") ? parseFloat(s) : parseFloat(s) * 1000;
      }));
      if (ms > 0) transitions.push({ el: describe(el), duration, ms: Math.round(ms) });
    }

    const body = getComputedStyle(document.body);
    return {
      body: {
        fontSize: body.fontSize,
        family: family(body.fontFamily),
        lineHeight: body.lineHeight,
        fontVariantNumeric: body.fontVariantNumeric,
      },
      fonts,
      radii,
      radiusChecked,
      meta,
      numeric,
      headings,
      transitions,
      dark: document.documentElement.classList.contains("dark"),
    };
  });
}

// Real pointer hover on every interactive element, one at a time. This is the only way to see the
// hover state the app actually ships; a class scanner cannot.
async function probeHover(page) {
  const SELECTOR = "a[href], button, [role=button], input:not([type=hidden]), select, textarea, [role=tab]";
  const total = await page.locator(SELECTOR).count();
  const out = [];
  const limit = Math.min(total, 60);
  for (let i = 0; i < limit; i++) {
    const loc = page.locator(SELECTOR).nth(i);
    try {
      if (await loc.evaluate((n) => {
        const root = n.getRootNode();
        return root instanceof ShadowRoot && /^NEXTJS-PORTAL$/i.test(root.host?.tagName || "");
      })) continue;
    } catch {}
    let visible = false;
    try { visible = await loc.isVisible(); } catch {}
    if (!visible) continue;
    const box = await loc.boundingBox().catch(() => null);
    if (!box || box.width < 1 || box.height < 1) continue;
    const read = () => loc.evaluate((n) => {
      const cs = getComputedStyle(n);
      return {
        shadow: cs.boxShadow,
        transform: cs.transform,
        duration: cs.transitionDuration,
        bg: cs.backgroundColor,
        el: `${n.tagName.toLowerCase()}${(n.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 2).map((c) => "." + c).join("")}`,
        label: (n.getAttribute("aria-label") || n.getAttribute("placeholder") ||
          n.closest("label")?.textContent || n.textContent || n.tagName).trim().replace(/\s+/g, " ").slice(0, 28),
      };
    });
    let before, after;
    try {
      before = await read();
      await loc.hover({ timeout: 2500 });
      await page.waitForTimeout(220); // let --dur-fast (120ms) finish
      after = await read();
    } catch {
      continue;
    }
    out.push({ before, after });
    await page.mouse.move(1, 1);
    await page.waitForTimeout(120);
  }
  return { total, sampled: out.length, truncated: total > limit, items: out };
}

// Real keyboard Tab, so :focus-visible is genuine. The first interactive element reached from a
// blurred body is the one measured; the base rule applies to it whatever its tag.
async function probeFocus(page) {
  await page.evaluate(() => {
    // Reset sequential focus navigation to the top of the document. Blurring alone leaves the
    // starting point on the autofocused input, so the "first" control would be the second one.
    document.body.tabIndex = -1;
    document.body.focus();
    document.body.removeAttribute("tabindex");
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.waitForTimeout(80);

  const read = () => page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const interactive = el.matches(
      "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab]",
    );
    if (!interactive) return null;
    const control = el.matches(
      "button, input:not([type=hidden]), select, textarea, [role=button]",
    );
    const cs = getComputedStyle(el);
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const toRgb = (value) => {
      if (!value || value === "transparent" || value.startsWith("rgb")) return value;
      try {
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = "#000";
        cx.fillStyle = value;
        cx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
        return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      } catch { return value; }
    };
    return {
      el: `${el.tagName.toLowerCase()}${(el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 2).map((c) => "." + c).join("")}`,
      label: (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 28),
      devChrome: (() => {
        const root = el.getRootNode();
        return root instanceof ShadowRoot && /^NEXTJS-PORTAL$/i.test(root.host?.tagName || "");
      })(),
      control,
      focusVisible: el.matches(":focus-visible"),
      outlineWidth: cs.outlineWidth,
      outlineOffset: cs.outlineOffset,
      outlineStyle: cs.outlineStyle,
      outlineColor: toRgb(cs.outlineColor),
      borderRadius: cs.borderTopLeftRadius,
    };
  });

  let fallback = null;
  for (let step = 0; step < 40; step++) {
    await page.keyboard.press("Tab");
    const hit = await read();
    if (!hit || hit.devChrome) continue;
    if (!hit.control) {
      // A link is focusable, but the contract asks for the first focusable *control*. Keep the
      // link as a fallback and keep tabbing.
      fallback ??= hit;
      continue;
    }
    // Let any colour transition settle: Tailwind's `transition-colors` can include outline-color,
    // and reading mid-transition reports a blended colour rather than the token.
    await page.waitForTimeout(220);
    return (await read()) ?? hit;
  }
  return fallback;
}

/* ── assertions ───────────────────────────────────────────────────────────── */

function assertPage(run) {
  const { tag, got, states, hover, focus } = run;
  const fails = [];
  const warns = [];

  // R10 — the app's controls sit on the canon's three heights: 28 (sm) / 32 (default) / 36 (lg).
  const DENSITY = [28, 32, 36];
  for (const c of got.controls ?? []) {
    if (!DENSITY.some((h) => Math.abs(h - c.h) <= 0.6)) {
      fails.push(`${tag}: R10 "${c.label}" height ${c.h} (controls are 28/32/36)`);
    }
  }
  if (!(got.controls ?? []).length) warns.push(`${tag}: no controls found`);

  // R1 — square corners, with the exhaustive circle whitelist.
  for (const r of got.radii) {
    if (r.marked) continue;
    const shape = r.max >= Math.min(r.w, r.h) / 2 - 0.5 ? "circle/pill" : `${r.radius}`;
    fails.push(`${tag}: R1 ${r.el} radius ${shape} (only avatar, status dot, slider thumb may round)`);
  }

  // R5 — meta label: 10.5px mono, uppercase, .1em, 500.
  for (const m of got.meta) {
    if (Math.abs(num(m.fontSize) - 10.5) > 0.2) fails.push(`${tag}: R5 "${m.text}" font-size ${m.fontSize} (10.5px)`);
    if (m.family !== "JetBrains Mono") fails.push(`${tag}: R5 "${m.text}" family ${m.family} (JetBrains Mono)`);
    if (m.transform !== "uppercase") fails.push(`${tag}: R5 "${m.text}" is not uppercase`);
    if (Math.abs(num(m.letterSpacing) - 1.05) > 0.12) fails.push(`${tag}: R5 "${m.text}" tracking ${m.letterSpacing} (0.1em)`);
    if (Math.abs(num(m.weight) - 500) > 50) fails.push(`${tag}: R5 "${m.text}" weight ${m.weight} (500)`);
  }

  // R6 — numeric/stat values are tabular.
  for (const n of got.numeric) {
    if (!n.tabular) fails.push(`${tag}: R6 "${n.text}" is not tabular-nums`);
  }

  // R4 — body copy is Golos at 14px.
  if (Math.abs(num(got.body.fontSize) - 14) > 0.2) fails.push(`${tag}: R4 body font-size ${got.body.fontSize} (14px)`);
  if (got.body.family !== "Golos Text") fails.push(`${tag}: R4 body family ${got.body.family} (Golos Text)`);

  // R3/R4 — headings: h1–h2 Golos, h3–h6 mono (applied globally by messer.base).
  for (const h of got.headings) {
    const want = /^h[12]$/.test(h.tag) ? "Golos Text" : "JetBrains Mono";
    if (h.family !== want) fails.push(`${tag}: R3 ${h.tag} "${h.text}" family ${h.family} (${want})`);
  }

  // Families must actually resolve, not just be named.
  if (!got.fonts.golosResolved) fails.push(`${tag}: Golos Text does not resolve (system fallback is painting)`);
  if (!got.fonts.monoResolved) fails.push(`${tag}: JetBrains Mono does not resolve (system fallback is painting)`);

  // §11 focus-visible — 2px ring at 2px offset on the first control reached by Tab.
  if (!focus) {
    fails.push(`${tag}: focus — no focusable control reached by Tab`);
  } else {
    if (!focus.focusVisible) fails.push(`${tag}: focus/${focus.el}: not :focus-visible`);
    if (Math.abs(num(focus.outlineWidth) - contract.focusVisible.outlineWidth) > 0.1) {
      fails.push(`${tag}: focus/${focus.el}: outline ${focus.outlineWidth} (${contract.focusVisible.outlineWidth}px)`);
    }
    if (Math.abs(num(focus.outlineOffset) - contract.focusVisible.outlineOffset) > 0.1) {
      fails.push(`${tag}: focus/${focus.el}: outline-offset ${focus.outlineOffset} (${contract.focusVisible.outlineOffset}px)`);
    }
    if (focus.outlineStyle === "none") fails.push(`${tag}: focus/${focus.el}: outline-style none`);
    if (states?.vars?.ring && !rgbClose(focus.outlineColor, states.vars.ring)) {
      fails.push(`${tag}: focus/${focus.el}: outline ${focus.outlineColor} ≠ --ring ${states.vars.ring}`);
    }
  }

  // §11 hover — no shadow, no movement, and nothing slower than the contract's max.
  if (!hover.sampled) warns.push(`${tag}: no hoverable elements found`);
  if (hover.truncated) warns.push(`${tag}: hover sampled ${hover.sampled}/${hover.total} interactive elements`);
  for (const h of hover.items) {
    if (h.after.shadow !== "none" && !/^rgba?\(0, 0, 0, 0\)/.test(h.after.shadow)) {
      fails.push(`${tag}: hover/${h.after.label}: shadow ${h.after.shadow}`);
    }
    if (h.before.transform !== h.after.transform) {
      fails.push(`${tag}: hover/${h.after.label}: transform ${h.before.transform} → ${h.after.transform}`);
    }
    const dur = msOf(h.after.duration);
    if (dur > contract.hover.durationMaxMs) {
      fails.push(`${tag}: hover/${h.after.label}: transition ${dur}ms > ${contract.hover.durationMaxMs}ms`);
    }
  }

  // §11 motion — every transition, not only the hovered element.
  const slowest = got.transitions.reduce((a, b) => (b.ms > a.ms ? b : a), { ms: 0, el: "—" });
  for (const t of got.transitions) {
    if (t.ms > contract.hover.durationMaxMs) {
      fails.push(`${tag}: motion ${t.el} transition ${t.ms}ms > ${contract.hover.durationMaxMs}ms`);
    }
  }

  // §11 selected — reuse states.mjs's fixture probe when the app marks a selected row. The rule is
  // 2px on the leading edge: a vertical bar in a sidebar (width 2, height auto/row) or a bottom
  // bar in a topbar (height 2, width auto/row). Both are legal; the probe cannot assume which.
  for (const s of states?.selected ?? []) {
    const a = alphaOf(s.bg);
    if (!(a > 0 && a <= contract.selected.accentMixMax)) {
      fails.push(`${tag}: selected/${s.key}: tint alpha ${a} (max ${contract.selected.accentMixMax})`);
    }
    const w = num(s.ruleWidth);
    const h = num(s.ruleHeight);
    const vertical = Number.isFinite(w) && Math.abs(w - contract.selected.ruleWidth) <= 0.1 &&
      (!Number.isFinite(h) || h > 4);
    const horizontal = Number.isFinite(h) && Math.abs(h - contract.selected.ruleWidth) <= 0.1 &&
      (!Number.isFinite(w) || w > 4);
    if (!vertical && !horizontal) {
      fails.push(`${tag}: selected/${s.key}: accent rule ${s.ruleWidth}×${s.ruleHeight} (2px)`);
    }
  }

  return { fails, warns, slowest };
}

/* ── run ──────────────────────────────────────────────────────────────────── */

const playwright = loadPlaywright();
const browser = await playwright.chromium.launch();
const runs = [];
const allFails = [];
const allWarns = [];

for (const theme of themes) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: theme,
    // No reduced-motion emulation: transitions are part of what is being measured.
    reducedMotion: "no-preference",
    storageState: storageState ?? undefined,
  });

  // The canon switches on localStorage 'messer-theme' plus .dark at <html>. Set both before the app
  // boots; the inline theme script in the page reads the same key.
  await context.addInitScript(({ theme }) => {
    try { localStorage.setItem("messer-theme", theme); } catch {}
    const apply = () => document.documentElement?.classList.toggle("dark", theme === "dark");
    apply();
    document.addEventListener("DOMContentLoaded", apply, { once: true });
  }, { theme });

  for (const url of urls) {
    const tag = `${pageName(url)} · ${theme}`;
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

    const run = { url, theme, tag, got: null, states: null, hover: null, focus: null, fails: [], warns: [], errors };
    try {
      await page.goto(url, { waitUntil: "load", timeout: 30_000 });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
      // The page's own theme script may have raced the storage state; the measurement needs the
      // requested theme, so make it true rather than measure a half-applied palette.
      const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
      if (dark !== (theme === "dark")) {
        await page.evaluate((d) => document.documentElement.classList.toggle("dark", d), theme === "dark");
        await page.waitForTimeout(120);
      }

      run.got = { ...(await measure(page)), ...(await probeApp(page)) };
      run.states = await probeStates(page, contract);
      run.focus = await probeFocus(page);
      run.hover = await probeHover(page);
      const verdict = assertPage(run);
      run.fails = verdict.fails;
      run.warns = verdict.warns;
      run.slowest = verdict.slowest;
      // A page error is not a design violation, but it means the measured DOM may be an error state.
      if (errors.length) run.warns.push(`${tag}: ${errors.length} console/page error(s) — ${errors[0].slice(0, 120)}`);
    } catch (cause) {
      run.fails.push(`${tag}: load failed — ${String(cause).split("\n")[0]}`);
    } finally {
      await page.close().catch(() => {});
    }

    runs.push(run);
    allFails.push(...run.fails);
    allWarns.push(...run.warns);
  }
  await context.close();
}

await browser.close();

/* ── output ───────────────────────────────────────────────────────────────── */

const pad = (v, n) => String(v).padEnd(n);
const padL = (v, n) => String(v).padStart(n);

const summary = (run) => {
  if (!run.got) return { cells: ["✗ load", "—", "—", "—", "—", "—", "—", "—", "—"], ok: false };
  const c = run.got.controls ?? [];
  const badControls = c.filter((x) => ![28, 32, 36].some((h) => Math.abs(h - x.h) <= 0.6)).length;
  const circles = run.got.radii.filter((r) => r.marked).length;
  const badRadii = run.got.radii.filter((r) => !r.marked).length;
  const badMeta = run.got.meta.filter((m) =>
    Math.abs(num(m.fontSize) - 10.5) > 0.2 || m.family !== "JetBrains Mono" ||
    m.transform !== "uppercase" || Math.abs(num(m.letterSpacing) - 1.05) > 0.12 ||
    Math.abs(num(m.weight) - 500) > 50).length;
  const badNums = run.got.numeric.filter((n) => !n.tabular).length;
  const focusOk = run.focus && run.focus.focusVisible &&
    Math.abs(num(run.focus.outlineWidth) - 2) <= 0.1 && Math.abs(num(run.focus.outlineOffset) - 2) <= 0.1;
  const bodyOk = Math.abs(num(run.got.body.fontSize) - 14) <= 0.2 && run.got.body.family === "Golos Text";
  const fontsOk = run.got.fonts.golosResolved && run.got.fonts.monoResolved;
  const badHover = (run.hover?.items ?? []).filter((h) =>
    (h.after.shadow !== "none" && !/^rgba?\(0, 0, 0, 0\)/.test(h.after.shadow)) ||
    h.before.transform !== h.after.transform).length;
  const maxMs = (run.got.transitions ?? []).reduce((a, t) => Math.max(a, t.ms), 0);
  return {
    cells: [
      badControls ? `✗ ${badControls}` : `${c.length} ok`,
      badRadii ? `✗ ${badRadii}` : `0/${run.got.radiusChecked ?? "?"}${circles ? ` ○${circles}` : ""}`,
      focusOk ? "2 / 2" : "✗",
      badMeta ? `✗ ${badMeta}` : `${run.got.meta.length}`,
      badNums ? `✗ ${badNums}` : `${run.got.numeric.length} tab`,
      bodyOk ? "14px" : "✗",
      fontsOk ? "G / M" : "✗",
      badHover ? `✗ ${badHover}` : `${run.hover?.sampled ?? 0} ok`,
      maxMs > contract.hover.durationMaxMs ? `✗ ${maxMs}ms` : `${maxMs}ms`,
    ],
    ok: !run.fails.length,
  };
};

console.log(`\napp-conformance  ${urls.join("  ")}  ·  ${themes.join("+")}  ·  ${runs.length} page-theme(s)\n`);
console.log(
  "  " + pad("page", 26) + pad("theme", 7) + padL("controls", 11) + padL("radius", 11) +
  padL("focus", 8) + padL("meta", 6) + padL("nums", 7) + padL("body", 7) + padL("fonts", 8) +
  padL("hover", 8) + padL("motion", 9),
);
for (const run of runs) {
  const { cells } = summary(run);
  console.log(
    "  " + pad(pageName(run.url), 26) + pad(run.theme, 7) +
    cells.map((v, i) => padL(v, [11, 11, 8, 6, 7, 7, 8, 8, 9][i])).join(""),
  );
}

if (allWarns.length) {
  console.log("");
  for (const w of allWarns.slice(0, 12)) console.log("  ! " + w);
  if (allWarns.length > 12) console.log(`  ! … ${allWarns.length - 12} more warnings`);
}

if (allFails.length) {
  console.log("");
  for (const f of allFails) console.error("  ✗ " + f);
}

console.log(
  `\napp-conformance  ${allFails.length ? "FAILED" : "green ✓"} · ${allFails.length} failure(s) · ` +
  `${allWarns.length} warning(s) · ${runs.length} page-theme(s)\n`,
);

if (jsonOut) {
  const payload = {
    at: new Date().toISOString(),
    urls,
    themes,
    storageState: storageState ?? null,
    runs: runs.map((r) => ({
      url: r.url,
      theme: r.theme,
      measured: r.got ? {
        body: r.got.body,
        fonts: r.got.fonts,
        controls: r.got.controls,
        radii: r.got.radii,
        radiusChecked: r.got.radiusChecked,
        meta: r.got.meta,
        numeric: r.got.numeric,
        headings: r.got.headings,
        transitions: r.got.transitions,
        slowest: r.slowest,
        hover: r.hover,
        focus: r.focus,
        states: r.states,
      } : null,
      fails: r.fails,
      warns: r.warns,
    })),
    fails: allFails,
    warns: allWarns,
  };
  fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
  fs.writeFileSync(path.resolve(jsonOut), JSON.stringify(payload, null, 2) + "\n");
  console.log(`  json → ${path.resolve(jsonOut)}`);
}

/* ── rules that are not objectively measurable from the DOM ───────────────── */

// Printed so the gap between "what check measured" and "what canon says" is explicit rather than
// silently assumed green.
const NOT_MEASURED = [
  ["R2", "1px hairline borders", "border widths are not asserted by this gate"],
  ["R2", "shadows only on floating overlays", "the DOM cannot say whether a shadowed element is a dialog or a card"],
  ["R2", "no gradients / glass / backdrop-filter", "not requested by this gate; check.mjs covers the fixture sink"],
  ["R4", "no italic / <em> in UI copy", "computed style cannot tell intent; a source scan is better"],
  ["R5", "field label: sentence-case sans 14/500", "this gate asserts the meta label only"],
  ["R6", "right-alignment of numeric table columns", "no numeric table on the measured pages; alignment is layout intent"],
  ["R7", "one accent, used only for the primary action", "needs a per-page intent model; accent budget lives in check.mjs"],
  ["R8", "status is icon + label", "only measurable where the app marks status; not asserted from arbitrary text"],
  ["R9", "Phosphor icon family and weights", "a source scan (check.mjs --app), not a computed style"],
  ["R12", "copy voice, sentence case, error wording", "natural-language judgement"],
  ["R13", "the mark: glyph, box, 75%", "asset/geometry inspection, not page typography"],
  ["R15", "declared deviations", "lives in the app's MESSER.md"],
  ["§11", "hover is exactly one surface step", "shadow, movement and duration are asserted; the exact surface pair needs a fixture"],
  ["§11", "disabled (aria-disabled + 40–50% opacity)", "no stable marker on the measured pages; states.mjs covers fixtures"],
  ["§11", "active and loading", "no stable marker; loading is a timing state"],
  ["§16", "one container stop, header shares the page box", "needs [data-shell-row]/[data-page-container] hooks; check.mjs measures the sink"],
];
if (!process.env.APP_CONFORMANCE_QUIET) {
  console.log("  not measured by this gate:");
  for (const [rule, what, why] of NOT_MEASURED) console.log(`    · ${pad(rule, 5)} ${pad(what, 52)} ${why}`);
  console.log("");
}

process.exit(allFails.length ? 1 : 0);
