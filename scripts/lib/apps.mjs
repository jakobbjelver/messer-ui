// The estate ledger: which apps exist, their brands, sinks and declared block deviations.
//
// It is *not* part of the public design system — it is a list of Jakob's own projects and their
// status, so it lives in the private `messer-ui-site` checkout. This resolver finds it on this
// machine and returns an empty list anywhere else (a CI runner, a fresh clone, another person's
// laptop), so every gate still runs: the cross-repo scans simply have nothing to scan.
//
// Order: $MESSER_APPS, the private checkout, then the historical scripts/apps.json (a public clone
// that still carries one). Never throw on absence.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const candidates = [
  process.env.MESSER_APPS,
  path.join(process.env.HOME ?? "", "Repos/messer-ui-site/apps.json"),
  path.join(ROOT, "scripts/apps.json"),
].filter(Boolean);

export const LEDGER = candidates.find((p) => fs.existsSync(p)) ?? null;

/** `{ apps, ledger }`; `apps` is empty and `ledger` null when no ledger is on this machine. */
export function readApps() {
  if (!LEDGER) return { apps: [], ledger: null };
  try {
    const raw = JSON.parse(fs.readFileSync(LEDGER, "utf8"));
    return { apps: raw.apps ?? [], ledger: LEDGER, description: raw.$description ?? "" };
  } catch (err) {
    console.warn(`apps ledger ${LEDGER} does not parse: ${err.message}`);
    return { apps: [], ledger: LEDGER, description: "" };
  }
}

/** The one line a script prints when it found nothing to look at, so a skip never reads as a pass. */
export function ledgerNote() {
  return LEDGER
    ? `estate ledger: ${LEDGER}`
    : "estate ledger not found (set MESSER_APPS or check out messer-ui-site) — no cross-repo scan";
}
