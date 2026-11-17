// Generates every project's mark from brand/<project>.json:
//   marks/<project>/{favicon.svg,favicon-dark.svg,favicon-32.png,apple-touch-icon.png,og.png}
//   marks/manifest.json   (sha256 per file; brand:check fails when these are stale)
//
//   node scripts/mark.mjs
//
// The mark is an ink box with a paper glyph — monochrome, square, never the accent (rules §13).
// Colours come from canon/tokens.json, so the mark cannot drift from the palette. Rasterisation
// uses Playwright, already a devDependency, so there is no native image dependency.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { oklchToHex } from "./lib/color.mjs";
import { serve } from "./lib/serve.mjs";
import { MARK_HASHED, markSvg, glyphSvg, bannerFingerprint } from "./lib/mark.mjs";
import { readApps } from "./lib/apps.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ICONS = path.join(ROOT, "node_modules/@phosphor-icons/core/assets");
const MARKS = path.join(ROOT, "marks");

function loadPlaywright() {
  const roots = [
    path.join(ROOT, "node_modules"),
    process.env.PLAYWRIGHT_PATH,
    path.join(process.env.HOME ?? "", "Repos/messer-agent/node_modules"),
    path.join(process.env.HOME ?? "", "Repos/hermes-agent/node_modules"),
  ].filter((p) => p && fs.existsSync(p));
  for (const root of roots) {
    try {
      return require(require.resolve("playwright", { paths: [root] }));
    } catch {}
  }
  throw new Error("playwright not found");
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const tokens = JSON.parse(fs.readFileSync(path.join(ROOT, "canon/tokens.json"), "utf8"));
const brands = fs
  .readdirSync(path.join(ROOT, "brand"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "brand", f), "utf8")));

const inkLight = oklchToHex(tokens.color.light.text.$value);
const paperLight = oklchToHex(tokens.color.light.bg.$value);
const inkDark = oklchToHex(tokens.color.dark.text.$value);
const paperDark = oklchToHex(tokens.color.dark.bg.$value);

const frame = (inner, w, h, bg) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>
   html,body{margin:0;padding:0;width:${w}px;height:${h}px;background:${bg};overflow:hidden}
   </style></head><body>${inner}</body></html>`;

const ogHtml = (brand, glyph, ink, paper, fontBase, source = "phosphor", rotate = 0) => {
  const sub = brand.title && brand.title.toLowerCase() !== brand.project.toLowerCase()
    ? `<div class="sub">${brand.title}</div>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:"Golos Text";src:url("${fontBase}/node_modules/@fontsource-variable/golos-text/files/golos-text-latin-wght-normal.woff2") format("woff2");font-weight:400 900}
  @font-face{font-family:"JetBrains Mono";src:url("${fontBase}/node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2") format("woff2");font-weight:100 800}
  html,body{margin:0;padding:0;width:1200px;height:630px;background:${ink};overflow:hidden}
  body{display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;padding:64px;color:${paper};font-family:"Golos Text",sans-serif}
  .top{display:flex;align-items:center;gap:32px}
  .name{font-family:"JetBrains Mono",monospace;font-size:44px;letter-spacing:.08em;text-transform:uppercase;line-height:1}
  .sub{font-size:20px;opacity:.62;margin-top:10px}
  .foot{display:flex;justify-content:space-between;font-family:"JetBrains Mono",monospace;font-size:14px;letter-spacing:.1em;text-transform:uppercase;opacity:.5}
</style></head><body>
  <div class="top">
    <div style="width:96px;height:96px">${glyphSvg(glyph, { fill: paper, size: 96, source, rotate }, ICONS)}</div>
    <div><div class="name">${brand.project}</div>${sub}</div>
  </div>
  <div class="foot"><span>messer.wtf</span><span>messer-ui canon ${pkg.version}</span></div>
</body></html>`;
};

/**
 * The README hero (STANDARD §11.2.1): mark, wordmark, pitch — nothing else. No accent (canon §13: the
 * mark is never the accent), no gradient, no second tagline. Drawn at 1200×300 CSS in a 2× page, so the
 * PNG is 2400×600. It is raster on purpose: a repo-relative SVG in a README cannot load the brand's
 * woff2, and the wordmark would silently render in the viewer's fallback face.
 */
const bannerHtml = (brand, glyph, { bg, fg, markInk, markPaper }, fontBase, source, rotate) => {
  const name = (brand.title || brand.project).toUpperCase();
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:"Golos Text";src:url("${fontBase}/node_modules/@fontsource-variable/golos-text/files/golos-text-latin-wght-normal.woff2") format("woff2");font-weight:400 900}
  @font-face{font-family:"JetBrains Mono";src:url("${fontBase}/node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2") format("woff2");font-weight:100 800}
  html,body{margin:0;padding:0;width:1200px;height:300px;background:${bg};overflow:hidden}
  body{display:flex;align-items:center;gap:44px;box-sizing:border-box;padding:0 64px;color:${fg};font-family:"Golos Text",sans-serif}
  .mark{width:112px;height:112px;flex:0 0 112px}
  .name{font-family:"JetBrains Mono",monospace;font-size:38px;letter-spacing:.1em;line-height:1.1;text-transform:uppercase}
  .pitch{font-size:26px;opacity:.72;margin-top:12px;max-width:800px}
</style></head><body>
  <div class="mark">${markSvg(glyph, { ink: markInk, paper: markPaper, size: 112, source, rotate }, ICONS)}</div>
  <div><div class="name">${name}</div><div class="pitch">${brand.pitch}</div></div>
</body></html>`;
};

const sha = (buf) => "sha256:" + crypto.createHash("sha256").update(buf).digest("hex");
const server = await serve(ROOT);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const hiPage = await browser.newPage({ deviceScaleFactor: 2 });
const manifest = {};

try {
  for (const brand of brands) {
    const glyph = brand.mark?.glyph;
    if (!glyph) {
      console.warn(`  ! ${brand.project}: no mark.glyph — skipped`);
      continue;
    }
    const dir = path.join(MARKS, brand.project);
    fs.mkdirSync(dir, { recursive: true });

    const source = brand.mark?.source ?? "phosphor";
    const rotate = Number(brand.mark?.rotate ?? 0);
    const light = markSvg(glyph, { ink: inkLight, paper: paperLight, size: 32, source, rotate }, ICONS);
    const dark = markSvg(glyph, { ink: inkDark, paper: paperDark, size: 32, source, rotate }, ICONS);
    fs.writeFileSync(path.join(dir, "favicon.svg"), light);
    fs.writeFileSync(path.join(dir, "favicon-dark.svg"), dark);

    const shots = [
      {
        file: "favicon-32.png", w: 32, h: 32,
        html: frame(markSvg(glyph, { ink: inkLight, paper: paperLight, size: 32, source, rotate }, ICONS), 32, 32, inkLight),
      },
      {
        file: "apple-touch-icon.png", w: 180, h: 180,
        html: frame(markSvg(glyph, { ink: inkLight, paper: paperLight, size: 180, source, rotate }, ICONS), 180, 180, inkLight),
      },
      {
        file: "og.png", w: 1200, h: 630,
        html: ogHtml(brand, glyph, inkLight, paperLight, server.url, source, rotate),
      },
    ];

    for (const shot of shots) {
      await page.setViewportSize({ width: shot.w, height: shot.h });
      await page.setContent(shot.html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(dir, shot.file) });
    }

    // The title-page banner. Only a brand that declares `pitch` gets one: a private project has no
    // README hero, and inventing a sentence for it would be a pitch nobody wrote.
    let banner = null;
    if (brand.pitch) {
      const variants = [
        { file: "banner-light.png", bg: paperLight, fg: inkLight, markInk: inkLight, markPaper: paperLight },
        { file: "banner-dark.png", bg: paperDark, fg: inkDark, markInk: inkDark, markPaper: paperDark },
      ];
      for (const variant of variants) {
        await hiPage.setViewportSize({ width: 1200, height: 300 });
        await hiPage.setContent(bannerHtml(brand, glyph, variant, server.url, source, rotate), { waitUntil: "load" });
        await hiPage.evaluate(() => document.fonts.ready);
        await hiPage.screenshot({ path: path.join(dir, variant.file) });
      }
      banner = {
        hash: bannerFingerprint({
          pitch: brand.pitch, glyph, source, rotate,
          colors: [inkLight, paperLight, inkDark, paperDark],
        }),
        pitch: brand.pitch,
      };
    }

    manifest[brand.project] = {
      ...Object.fromEntries(MARK_HASHED.map((f) => [f, sha(fs.readFileSync(path.join(dir, f)))])),
      banner,
    };
    console.log(`  ${brand.project.padEnd(14)} ${glyph.padEnd(15)} 32 · 180 · 1200×630${brand.pitch ? " · banner 1200×300" : ""}`);
  }
} finally {
  await browser.close();
  server.close();
}

fs.writeFileSync(path.join(MARKS, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

// An app that serves its own icons declares `marksTarget` (its public dir) in apps.json: the files
// there are a copy of marks/<brand>/, so regenerating them by hand is how a mark goes stale in the
// repo while the canon says it is current.
// og.png is rasterised per machine (font hinting), so it is not copied: the app keeps its own share
// card and only the byte-stable icons are synced.
const FILES = MARK_HASHED;
const apps = readApps().apps;
for (const app of apps) {
  if (!app.marksTarget) continue;
  const target = app.marksTarget.replace("~", process.env.HOME ?? "~");
  if (!fs.existsSync(target)) {
    console.log(`  ${app.id.padEnd(14)} marksTarget missing — ${target}`);
    continue;
  }
  for (const file of FILES) fs.copyFileSync(path.join(MARKS, app.brand ?? app.id, file), path.join(target, file));
  console.log(`  ${app.id.padEnd(14)} ${FILES.length} files → ${target}`);
}

console.log(`\nmarks  ${Object.keys(manifest).length} projects → marks/ · manifest.json`);
