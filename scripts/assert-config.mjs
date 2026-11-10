// Sanity-checks a consuming project's shadcn config before any screenshot is taken.
//   node scripts/assert-config.mjs --app ~/Repos/messer-swipe

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const app = arg("--app", process.cwd());
const candidates = [app, path.join(app, "web"), path.join(app, "src")];
const configPath = candidates.map((p) => path.join(p, "components.json")).find((p) => fs.existsSync(p));
const fails = [];
const warns = [];

if (!configPath) {
  console.error(`no components.json under ${app}`);
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
const root = path.dirname(configPath);

if (!(cfg.style ?? "").includes("lyra")) fails.push(`style is "${cfg.style}" — expected a Lyra style`);
if (cfg.iconLibrary !== "phosphor") fails.push(`iconLibrary is "${cfg.iconLibrary}" — expected "phosphor"`);
if (cfg.cssVariables !== true) warns.push("cssVariables is not true — CSS variables will not be used");
if (!cfg.registries?.["@messer"]) warns.push('no "@messer" namespace in registries — add jakobbjelver/messer-ui');

const pkgPath = path.join(root, "package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps["lucide-react"]) fails.push("lucide-react is still installed — icons must be Phosphor");
  if (!deps["@phosphor-icons/react"]) fails.push("@phosphor-icons/react is missing");
}

const cssPath = cfg.tailwind?.css ? path.join(root, cfg.tailwind.css) : null;
if (cssPath && fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, "utf8");
  if (/--radius:\s*(?!0)/.test(css)) fails.push(`${path.basename(cssPath)} sets a non-zero --radius`);
  const hex = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
  if (hex.length) warns.push(`${hex.length} hex literal(s) in ${path.basename(cssPath)}: ${[...new Set(hex)].slice(0, 5).join(", ")}`);
}

for (const w of warns) console.log("  ! " + w);
if (fails.length) {
  for (const f of fails) console.error("  ✗ " + f);
  process.exit(1);
}
console.log(`config ${path.relative(app, configPath) || "components.json"} ✓  lyra · phosphor · tokens`);
