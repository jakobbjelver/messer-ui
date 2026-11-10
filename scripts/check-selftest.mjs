// Proves the conformance gate bites: renders fixtures/violations.html, runs check.mjs against it,
// and asserts that every new rule check fails with the expected message prefix.
//
//   node scripts/check-selftest.mjs
//
// A gate that cannot be shown failing is not a gate.

import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { serve } from "./lib/serve.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXPECT = [
  ["R2 shadow", "a static panel with a shadow"],
  ["R6 tabular", "a proportional data number"],
  ["R7", "five hues and two primary actions"],
  ["R8 status", "a status badge without an icon"],
  ["R10", "a 30px control"],
  ["hover#", "a shadow and accent swap on hover"],
  ["focus/", "an input with no focus ring"],
  ["disabled/", "a disabled control that still looks clickable"],
  ["selected/", "an opaque selected row with no accent rule"],
  ["§16 header row", "a topbar row wider than the page container"],
  ["R3 h1", "an h1 set in mono"],
];

const server = await serve(ROOT);
const url = `${server.url}/fixtures/violations.html`;

// Spawn, not spawnSync: the child fetches over HTTP from this process, so the event loop must stay
// free to answer it. spawnSync deadlocks exactly here (page.goto timeout).
const child = spawn(
  process.execPath,
  [path.join(ROOT, "scripts/check.mjs"), "--url", url, "--no-reference", "--json"],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let stdout = "";
let stderr = "";
child.stdout.on("data", (d) => (stdout += d));
child.stderr.on("data", (d) => (stderr += d));
await new Promise((resolve) => child.on("close", resolve));
server.close();

let result;
try {
  result = JSON.parse(stdout);
} catch {
  console.error("selftest: check.mjs did not return JSON");
  console.error(stdout || stderr);
  process.exit(1);
}

const pad = (s, n) => String(s).padEnd(n);
const missing = [];
const seen = [];

for (const [prefix, what] of EXPECT) {
  const hit = result.fails.find((f) => f.includes(prefix));
  if (hit) seen.push([prefix, hit]);
  else missing.push([prefix, what]);
}

for (const [prefix, message] of seen) {
  console.log(`  ✓ ${pad(prefix, 12)} ${message}`);
}

if (missing.length) {
  console.error(`\nselftest FAILED — ${missing.length} check(s) did not fire:`);
  for (const [prefix, what] of missing) console.error(`  ✗ ${prefix} — ${what}`);
  console.error(`\n${result.fails.length} failure(s) reported in total:`);
  for (const f of result.fails) console.error("    " + f);
  process.exit(1);
}

console.log(`\nselftest  ${seen.length}/${EXPECT.length} checks fired as expected ✓`);
