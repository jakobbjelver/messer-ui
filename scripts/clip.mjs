// Capture a short looping demo for a public README (STANDARD §11.2): Playwright records the page,
// ffmpeg turns the recording into a paletted GIF.
//
//   node scripts/clip.mjs --url https://swipe.messer.wtf --out ../messer-swipe/docs/brand \
//     --name demo --fill 'input[placeholder="Display name"]=Messer' --click "button=Start" --hold 3
//
// Why a script and not a screen recorder: a clip has to be regenerable when the shell changes, it must
// be captured from a seeded instance (the same rule as shot.mjs — pixels are not scanned for leaks),
// and GitHub plays a repo-relative GIF but not a repo-relative <video>, so the GIF is the medium.
//
// A stateful flow (an onboarding wizard, a session that needs a name) has to be scripted: --click and
// --fill run in the order given, before --scroll and before --hold.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : fallback;
};
const all = (name) => args.flatMap((a, i) => (a === `--${name}` && args[i + 1] ? [args[i + 1]] : []));

const url = flag("url");
if (!url) {
  console.error("clip: --url is required (a seeded dev server or a public demo)");
  process.exit(1);
}
const out = path.resolve(flag("out", path.join(ROOT, "screenshots")));
const name = flag("name", "demo");
const width = Number(flag("width", 1200));
const height = Number(flag("height", 750));
const wait = Number(flag("wait", 1500));
const hold = Number(flag("hold", 3));          // seconds of motion after the flow
const scroll = Number(flag("scroll", 220));    // px per step; 0 disables the drift
const theme = flag("theme", "light");
const fps = Number(flag("fps", 8));
const colors = Number(flag("colors", 256));
const maxMB = Number(flag("max", 3));
const fills = all("fill");
const clicks = all("click");
const keys = all("key");       // e.g. --key ArrowRight, for a deck that answers the keyboard

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

fs.mkdirSync(out, { recursive: true });
const work = fs.mkdtempSync(path.join(out, ".clip-"));
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const written = [];

try {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    colorScheme: theme,
    recordVideo: { dir: work, size: { width, height } },
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(wait);

  for (const spec of fills) {
    // Split on the LAST `=`: a selector may carry one itself (`input[placeholder="Display name"]`).
    const cut = spec.lastIndexOf("=");
    const selector = cut > 0 ? spec.slice(0, cut) : spec;
    const value = cut > 0 ? spec.slice(cut + 1) : "";
    await page.locator(selector).first().fill(value, { timeout: 8000 })
      .catch((e) => console.error(`fill ${spec}: ${e.message.split("\n")[0]}`));
    await page.waitForTimeout(500);
  }
  for (const spec of clicks) {
    const cut = spec.lastIndexOf("=");
    const selector = cut > 0 ? spec.slice(0, cut) : spec;
    const text = cut > 0 ? spec.slice(cut + 1) : "";
    const el = page.locator(text ? `${selector}:has-text("${text}")` : selector).first();
    await el.click({ timeout: 8000 }).catch((e) => console.error(`click ${spec}: ${e.message.split("\n")[0]}`));
    await page.waitForTimeout(1200);
  }

  await page.mouse.move(width / 2, height / 2);
  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(1400);
  }
  const steps = Math.round((hold * 1000) / 1200);
  let dir = 1;
  for (let i = 0; i < steps && scroll; i++) {
    await page.mouse.wheel(0, scroll * dir);
    await page.waitForTimeout(1200);
    dir = -dir;
  }
  await page.waitForTimeout(Math.max(0, hold * 1000 - steps * 1200) + 400);

  const video = page.video();
  await context.close();
  const src = await video.path();

  const target = path.join(out, `${name}.gif`);
  // One palette per clip, sierra dithering, no audio: the shape GitHub renders inline.
  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-i", src,
    "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${colors}[p];[b][p]paletteuse=dither=sierra2_4a`,
    "-loop", "0", target,
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const kb = Math.round(fs.statSync(target).size / 1024);
  written.push({ target, kb });
  console.log(`clip  ${path.relative(process.cwd(), target)}  ${width}×${Math.round((height * width) / width)}  ${kb} KB`);
  if (kb > maxMB * 1024) {
    console.error(`clip: ${name}.gif is ${kb} KB — over the ${maxMB} MB ceiling; lower --width, --fps or --colors`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  fs.rmSync(work, { recursive: true, force: true });
}

export { written };
