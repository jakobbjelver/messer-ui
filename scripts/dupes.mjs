// Duplicate scanner across the family.
//
//   node scripts/dupes.mjs                 report + write canon/duplicates.json
//   node scripts/dupes.mjs --update        accept today's pairs as the baseline
//   node scripts/dupes.mjs --fail-on new   exit 1 when a *custom* duplicate appears (CI)
//
// Vendored shadcn/animate-ui atoms are expected to be duplicated: they are copies of the same
// upstream file. The names in scripts/atoms.json are therefore exempt from --fail-on new.
// Everything else — our own components — is promoted on the second copy, and a third copy fails.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { readApps } from "./lib/apps.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i > -1 ? process.argv[i + 1] : d;
};
const has = (n) => process.argv.includes(n);
const failOn = arg("--fail-on"); // "new" gates CI; absent means report only

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const writeJson = (p, body) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, p), JSON.stringify(body, null, 2) + "\n");
};

const { apps } = readApps();
const atoms = new Set(readJson("scripts/atoms.json"));
const expand = (p) => p.replace(/^~/, os.homedir());

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", ".messer-ui", "dist", "build", "out", "coverage",
  "vendor", "__pycache__", ".turbo", ".astro", "playwright-report",
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() ? SKIP_DIRS.has(e.name) : !e.name.endsWith(".tsx")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
const norm = (src) =>
  src.split("\n").map((l) => l.trim()).filter(Boolean);

function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

/* ── collect ─────────────────────────────────────────────────────────────── */
const files = [];
const missing = [];
for (const app of apps) {
  const base = expand(app.path);
  if (!fs.existsSync(base)) {
    console.error(`  ! ${app.id}: ${base} not found — skipped`);
    missing.push(app.id);
    continue;
  }
  for (const abs of walk(base)) {
    const src = fs.readFileSync(abs, "utf8");
    files.push({
      app: app.id,
      rel: path.relative(base, abs),
      name: path.basename(abs),
      hash: sha(src),
      lines: norm(src),
    });
  }
}

const byName = (f) => f.name.replace(/\.tsx$/, "");
const isAtom = (f) => atoms.has(byName(f));

/* ── exact ───────────────────────────────────────────────────────────────── */
const groups = new Map();
for (const f of files) {
  if (!groups.has(f.hash)) groups.set(f.hash, []);
  groups.get(f.hash).push(f);
}

const exact = [];
for (const [, group] of groups) {
  if (group.length < 2) continue;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const [a, b] = [group[i], group[j]];
      if (a.app === b.app) continue;
      const key = [`${a.app}:${a.rel}`, `${b.app}:${b.rel}`].sort().join("|");
      exact.push({
        key,
        name: a.name,
        vendored: isAtom(a) || isAtom(b),
        files: [`${a.app}:${a.rel}`, `${b.app}:${b.rel}`],
      });
    }
  }
}
exact.sort((a, b) => a.key.localeCompare(b.key));

/* ── near (same basename, different content) ─────────────────────────────── */
const near = [];
const names = new Map();
for (const f of files) {
  if (!names.has(f.name)) names.set(f.name, []);
  names.get(f.name).push(f);
}
for (const [, group] of names) {
  if (group.length < 2) continue;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const [a, b] = [group[i], group[j]];
      if (a.app === b.app || a.hash === b.hash) continue;
      const score = jaccard(a.lines, b.lines);
      if (score < 0.8) continue;
      near.push({
        key: [`${a.app}:${a.rel}`, `${b.app}:${b.rel}`].sort().join("|"),
        name: a.name,
        score: +score.toFixed(2),
        vendored: isAtom(a) || isAtom(b),
        files: [`${a.app}:${a.rel}`, `${b.app}:${b.rel}`],
      });
    }
  }
}
near.sort((a, b) => b.score - a.score);

/* ── report ──────────────────────────────────────────────────────────────── */
const report = {
  generatedAt: new Date().toISOString(),
  scanned: files.length,
  missing,
  exact,
  near,
};
writeJson("canon/duplicates.json", report);

if (missing.length && !has("--allow-missing")) {
  console.error(`\n✗ ${missing.length} app path(s) missing: ${missing.join(", ")}`);
  console.error("  Fix scripts/apps.json — repos get renamed. Use --allow-missing to scan the rest.");
  process.exit(1);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`scanned ${files.length} .tsx across ${apps.length} apps`);
console.log(`\nexact ${exact.length} pair(s)`);
for (const e of exact) {
  console.log(`  ${e.vendored ? "vendored" : "OURS    "}  ${pad(e.name, 24)} ${e.files.join("  ⇄  ")}`);
}
if (near.length) {
  console.log(`\nnear ${near.length} pair(s) ≥ 0.80 similarity`);
  for (const n of near.slice(0, 15)) {
    console.log(`  ${n.score.toFixed(2)}  ${pad(n.name, 24)} ${n.files.join("  ⇄  ")}`);
  }
  if (near.length > 15) console.log(`  … ${near.length - 15} more`);
}

/* ── baseline / gate ─────────────────────────────────────────────────────── */
if (has("--update")) {
  writeJson("canon/duplicates.baseline.json", {
    generatedAt: report.generatedAt,
    exact: exact.map((e) => e.key),
  });
  console.log(`\nbaseline  ${exact.length} exact pair(s) accepted`);
}

if (failOn === "new") {
  const baselinePath = path.join(ROOT, "canon/duplicates.baseline.json");
  if (!fs.existsSync(baselinePath)) {
    console.error("\n✗ --fail-on new needs canon/duplicates.baseline.json (run --update once)");
    process.exit(1);
  }
  const baseline = new Set(readJson("canon/duplicates.baseline.json").exact);
  const fresh = exact.filter((e) => !baseline.has(e.key) && !e.vendored);
  if (fresh.length) {
    console.error(`\n✗ ${fresh.length} new custom duplicate(s):`);
    for (const f of fresh) console.error(`  ✗ ${f.name}: ${f.files.join(" ⇄ ")}`);
    console.error("  Promote it to registry/<item>/ (second copy) or delete one (rule: no third copy).");
    process.exit(1);
  }
  console.log(`\ndupes  no new custom duplicates ✓`);
}
