// Renders fixtures/kitchen-sink.html over HTTP at two widths and both themes, then asserts
// the fingerprint: fonts, square corners, no overflow, no console errors. Screenshots + report.json.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

function loadPlaywright() {
  const roots = [path.join(ROOT, "node_modules"), process.env.PLAYWRIGHT_PATH,
    path.join(process.env.HOME ?? "", "Repos/hermes-agent/node_modules")].filter((p) => p && fs.existsSync(p));
  for (const root of roots) {
    try {
      return require(require.resolve("playwright", { paths: [root] }));
    } catch {}
  }
  throw new Error("playwright not found — npm install, or set PLAYWRIGHT_PATH");
}

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript",
  ".woff2": "font/woff2", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png",
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "fixtures/kitchen-sink.html";
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

const MUST_MONO = ["h3", "h4", "label", "data", "table-th", "table-num", "code", "kbd", "panel-title"];
const MUST_SANS = ["h1", "h2", "body", "btn-primary", "btn-secondary", "input", "textarea", "select", "tab-active"];
const CIRCLE = /^(avatar|dot)/;

const { chromium } = loadPlaywright();
const port = await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const url = `http://127.0.0.1:${port}/fixtures/kitchen-sink.html`;

const browser = await chromium.launch();
const failures = [];
const report = { url, runs: [] };

for (const theme of ["light", "dark"]) {
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, colorScheme: "light" });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
    page.on("pageerror", (e) => consoleErrors.push(String(e)));
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate((dark) => document.documentElement.classList.toggle("dark", dark), theme === "dark");
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ reducedMotion: "reduce" });

    const data = await page.evaluate(() => {
      const read = (el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          name: el.dataset.fixture, tag: el.tagName.toLowerCase(),
          fontFamily: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
          fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing, borderRadius: cs.borderRadius, borderWidth: cs.borderTopWidth,
          height: Math.round(r.height * 100) / 100, color: cs.color, background: cs.backgroundColor,
          overflow: el.scrollWidth - el.clientWidth,
        };
      };
      return {
        fixtures: [...document.querySelectorAll("[data-fixture]")].map(read),
        bodyFont: getComputedStyle(document.body).fontFamily.split(",")[0].replace(/["']/g, "").trim(),
        fontsLoaded: {
          golos: document.fonts.check('14px "Golos Text"'),
          mono: document.fonts.check('12px "JetBrains Mono"'),
        },
        docWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        title: document.title,
      };
    });

    const shot = path.join(ROOT, "screenshots", `sink-${theme}-${width}.png`);
    fs.mkdirSync(path.dirname(shot), { recursive: true });
    await page.screenshot({ path: shot, fullPage: true });
    await context.close();

    const run = { theme, width, ...data, shot: path.relative(ROOT, shot), consoleErrors };
    report.runs.push(run);

    const tag = `${theme}/${width}`;
    if (!data.fontsLoaded.golos || !data.fontsLoaded.mono) failures.push(`${tag}: fonts not loaded`);
    if (data.bodyFont !== "Golos Text") failures.push(`${tag}: body font is ${data.bodyFont}`);
    if (data.docWidth > data.viewport + 1) failures.push(`${tag}: page overflows (${data.docWidth} > ${data.viewport})`);
    if (consoleErrors.length) failures.push(`${tag}: ${consoleErrors.length} console error(s): ${consoleErrors[0]}`);
    for (const f of data.fixtures) {
      const radius = parseFloat(f.borderRadius);
      if (!CIRCLE.test(f.name) && radius !== 0) failures.push(`${tag}: ${f.name} has radius ${f.borderRadius}`);
      if (f.overflow > 1) failures.push(`${tag}: ${f.name} overflows by ${f.overflow}px`);
      if (MUST_MONO.includes(f.name) && f.fontFamily !== "JetBrains Mono")
        failures.push(`${tag}: ${f.name} should be mono, is ${f.fontFamily}`);
      if (MUST_SANS.includes(f.name) && f.fontFamily !== "Golos Text")
        failures.push(`${tag}: ${f.name} should be Golos, is ${f.fontFamily}`);
    }
  }
}

await browser.close();
server.close();
fs.writeFileSync(path.join(ROOT, "report.json"), JSON.stringify(report, null, 2) + "\n");

const first = report.runs[0];
console.log(`sink  ${report.runs.length} runs · ${first.fixtures.length} fixtures · ${first.title}`);
console.log(`fonts ${first.bodyFont} / ${first.fixtures.find((f) => f.name === "h3")?.fontFamily}`);
const sample = first.fixtures.slice(0, 6).map((f) => `${f.name}(${f.fontSize}/${f.fontFamily.split(" ")[0]})`);
console.log(`sample ${sample.join(" ")}`);
if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures.slice(0, 25)) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("sink  clean ✓  (screenshots/ + report.json)");
