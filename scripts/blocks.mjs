// Block drift gate: every, installed copy of a messer-ui block must be byte-identical to the
// registry source. `npm run check` measures tokens and states; it cannot see a stale copy of a block,
// which is how portal, ai-router and the front door sat on three different app-shells at once.
//
//   node scripts/blocks.mjs            # every app in apps.json that exists on this machine
//   node scripts/blocks.mjs --json     # machine-readable
//   node scripts/blocks.mjs --allow-missing
//
// A block is identified by its file's basename (`app-shell.tsx`); the app's copy may live under any
// directory (web/, packages/*/src/, src/), because the registry target is a shadcn alias, not a path.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_OUT = process.argv.includes("--json");
const ALLOW_MISSING = process.argv.includes("--allow-missing");

const SKIP = new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".astro", ".studio", ".messer-ui", ".turbo"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name) || /^dist-/.test(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const items = fs
  .readdirSync(path.join(ROOT, "registry"))
  .map((name) => {
    const itemFile = path.join(ROOT, "registry", name, "registry-item.json");
    if (!fs.existsSync(itemFile)) return null;
    const item = JSON.parse(fs.readFileSync(itemFile, "utf8"));
    const src = (item.files ?? []).find((f) => f.path.endsWith(".tsx"));
    if (!src) return null;
    return { name: item.name, basename: path.basename(src.path), source: path.join(ROOT, src.path) };
  })
  .filter(Boolean);

const apps = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/apps.json"), "utf8")).apps ?? [];

const rows = [];
for (const app of apps) {
  const dir = app.path.replace("~", process.env.HOME ?? "~");
  if (!fs.existsSync(dir)) continue;
  // Only `components/ui/**` holds installed blocks: an app's own `components/theme-toggle.tsx` is
  // not our block and must not be measured against it.
  const files = walk(dir).filter((f) => f.endsWith(".tsx") && f.includes(`${path.sep}ui${path.sep}`));
  for (const item of items) {
    const hits = files.filter((f) => path.basename(f) === item.basename);
    if (!hits.length) {
      // Not every app installs every block; absence is information, not a failure.
      rows.push({ app: app.id, block: item.name, status: "not-installed" });
      continue;
    }
    const want = fs.readFileSync(item.source, "utf8").replace(/\r\n/g, "\n").trimEnd();
    // A declared deviation is not drift: `blockDeviations` in apps.json carries the reason, the same
    // way `MESSER.md` carries a rule deviation. A WIP app is reported but not gated.
    const declared = app.blockDeviations?.[item.name] ?? null;
    for (const hit of hits) {
      const got = fs.readFileSync(hit, "utf8").replace(/\r\n/g, "\n").trimEnd();
      const file = path.relative(dir, hit);
      if (got === want) rows.push({ app: app.id, block: item.name, status: "match", file });
      else if (declared) rows.push({ app: app.id, block: item.name, status: "deviation", file, reason: declared });
      else if (app.wip) rows.push({ app: app.id, block: item.name, status: "wip", file });
      else rows.push({ app: app.id, block: item.name, status: "differs", file });
    }
  }
}

const bad = rows.filter((r) => r.status === "differs");
const skipped = rows.filter((r) => r.status === "deviation" || r.status === "wip");

if (JSON_OUT) {
  console.log(JSON.stringify({ apps: apps.length, blocks: items.length, rows }, null, 2));
} else {
  for (const r of rows.filter((r) => r.status !== "not-installed")) {
    const mark = r.status === "match" ? "✓" : r.status === "differs" ? "✗" : "·";
    const why = r.reason ? `  (${r.reason})` : "";
    console.log(`  ${mark} ${r.app.padEnd(16)} ${r.block.padEnd(18)} ${r.status}${r.file ? `  ${r.file}` : ""}${why}`);
  }
  const installed = rows.filter((r) => r.status !== "not-installed");
  const matched = installed.filter((r) => r.status === "match").length;
  const tail = skipped.length ? ` · ${skipped.length} declared deviation/wip` : "";
  console.log(`\nblocks  ${matched}/${installed.length} installed copies identical to the registry${tail}`);
  if (bad.length) {
    console.error(`\n${bad.length} divergent block(s). A local patch on a block is a registry bug:`);
    console.error(`fix registry/<item>/, run npm run build, copy the file back, then prove it with diff -q.`);
  }
}

process.exit(bad.length ? 1 : 0);
