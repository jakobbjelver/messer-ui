// canon/tokens.json + brand/*.json → packages/css/{theme,type}.css and the shadcn registry.
// Everything it writes is generated; edit canon/ or brand/ instead.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { accentFg, chartRamp } from "./lib/color.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const write = (p, body) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, p), body);
};

const tokens = read("canon/tokens.json");
const brands = fs
  .readdirSync(path.join(ROOT, "brand"))
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => read(`brand/${f}`));

const DEFAULT_BRAND = "portal";
const RADIUS = ["sm", "md", "lg", "xl", "2xl", "3xl", "4xl"];
const T = tokens.type;

// ── colours ─────────────────────────────────────────────────────────────────
function brandVars(brand, mode) {
  const accent = brand.accent[mode];
  return {
    "--primary": accent,
    "--primary-foreground": accentFg(accent),
    "--primary-hover": `color-mix(in oklab, ${accent} 86%, ${mode === "dark" ? "#ffffff" : "#000000"})`,
    "--ring": accent,
    ...Object.fromEntries(chartRamp(accent, mode).map((step, i) => [`--chart-${i + 1}`, step])),
  };
}

function baseVars(mode, brand) {
  const c = tokens.color[mode];
  const v = (k) => c[k].$value;
  return {
    "--background": v("bg"),
    "--foreground": v("text"),
    "--surface": v("surface"),
    "--surface-2": v("surface-2"),
    "--card": v("surface"),
    "--card-foreground": v("text"),
    "--popover": v("surface"),
    "--popover-foreground": v("text"),
    "--secondary": v("surface-2"),
    "--secondary-foreground": v("text"),
    "--muted": v("surface-2"),
    "--muted-foreground": v("text-3"),
    "--accent": v("surface-2"),
    "--accent-foreground": v("text"),
    "--destructive": v("danger"),
    "--destructive-foreground": v("on-status"),
    "--success": v("success"),
    "--warning": v("warning"),
    "--text-2": v("text-2"),
    "--text-3": v("text-3"),
    "--border": v("border"),
    "--border-strong": v("border-strong"),
    "--input": v("border"),
    ...brandVars(brand, mode),
  };
}

const ink = {
  "--radius": "0px",
  ...Object.fromEntries(RADIUS.map((k) => [`--radius-${k}`, "0px"])),
  "--font-sans": `var(--font-golos, ${tokens.font.sans.$value})`,
  "--font-mono": `var(--font-jetbrains, ${tokens.font.mono.$value})`,
  "--ctl-sm": tokens.size["ctl-sm"].$value,
  "--ctl": tokens.size.ctl.$value,
  "--ctl-lg": tokens.size["ctl-lg"].$value,
  "--row-sm": tokens.size["row-sm"].$value,
  "--row": tokens.size.row.$value,
  "--page-pad": tokens.size.page.$value,
  "--shell": tokens.size.shell.$value,
  "--dur-fast": tokens.motion.duration.fast.$value,
  "--dur-mid": tokens.motion.duration.mid.$value,
  "--dur-slow": tokens.motion.duration.slow.$value,
  "--ease": `cubic-bezier(${tokens.motion.easing.standard.$value.join(",")})`,
  "--shadow-pop": "0 8px 24px rgb(0 0 0 / 0.12)",
  ...Object.fromEntries(
    Object.entries(tokens.space)
      .filter(([k]) => !k.startsWith("$"))
      .map(([k, v]) => [`--space-${k}`, v.$value]),
  ),
  ...Object.fromEntries(
    Object.entries(T)
      .filter(([k]) => !k.startsWith("$"))
      .map(([k, v]) => [`--text-${k}`, v.$value.fontSize]),
  ),
  "--tracking-label": T.label.$value.letterSpacing,
};

const colorTheme = {
  "--color-background": "var(--background)",
  "--color-foreground": "var(--foreground)",
  "--color-card": "var(--card)",
  "--color-card-foreground": "var(--card-foreground)",
  "--color-popover": "var(--popover)",
  "--color-popover-foreground": "var(--popover-foreground)",
  "--color-primary": "var(--primary)",
  "--color-primary-foreground": "var(--primary-foreground)",
  "--color-secondary": "var(--secondary)",
  "--color-secondary-foreground": "var(--secondary-foreground)",
  "--color-muted": "var(--muted)",
  "--color-muted-foreground": "var(--muted-foreground)",
  "--color-accent": "var(--accent)",
  "--color-accent-foreground": "var(--accent-foreground)",
  "--color-destructive": "var(--destructive)",
  "--color-destructive-foreground": "var(--destructive-foreground)",
  "--color-success": "var(--success)",
  "--color-warning": "var(--warning)",
  "--color-border": "var(--border)",
  "--color-input": "var(--input)",
  "--color-ring": "var(--ring)",
  ...Object.fromEntries([1, 2, 3, 4, 5].map((i) => [`--color-chart-${i}`, `var(--chart-${i})`])),
  ...Object.fromEntries(RADIUS.map((k) => [`--radius-${k}`, "0px"])),
};

// ── type ────────────────────────────────────────────────────────────────────
const family = (v) => (String(v).includes("mono") ? "var(--font-mono)" : "var(--font-sans)");
const typeDecl = (t) => {
  const d = {
    "font-family": family(t.fontFamily),
    "font-size": t.fontSize,
    "font-weight": String(t.fontWeight),
    "line-height": t.lineHeight,
  };
  if (t.letterSpacing && t.letterSpacing !== "0") d["letter-spacing"] = t.letterSpacing;
  return d;
};

const typeRules = {
  html: { "font-family": "var(--font-sans)" },
  body: {
    "background-color": "var(--background)",
    color: "var(--foreground)",
    ...typeDecl(T.body.$value),
    "font-variant-numeric": "tabular-nums",
  },
  h1: typeDecl(T.h1.$value),
  h2: typeDecl(T.h2.$value),
  h3: typeDecl(T.h3.$value),
  h4: typeDecl(T.h4.$value),
  "h5, h6": typeDecl(T.h4.$value),
  ".prose": typeDecl(T.prose.$value),
  ".m-small, small": typeDecl(T.small.$value),
  ".m-label": { ...typeDecl(T.label.$value), "text-transform": "uppercase", color: "var(--text-3)" },
  ".m-data": { ...typeDecl(T.data.$value), "font-variant-numeric": "tabular-nums" },
  "code, kbd, pre, samp": typeDecl(T.code.$value),
  table: { "font-variant-numeric": "tabular-nums" },
};

const decl = (obj, indent) =>
  Object.entries(obj).map(([k, v]) => `${indent}${k}: ${v};`).join("\n");
const rulesToCss = (rules, indent = "  ") =>
  Object.entries(rules).map(([sel, d]) => `${indent}${sel} {\n${decl(d, indent + "  ")}\n${indent}}`).join("\n\n");

write(
  "packages/css/type.css",
  `/* messer-ui — generated by scripts/build-registry.mjs from canon/tokens.json. Do not edit. */\n\n@layer base {\n${rulesToCss(typeRules)}\n}\n`,
);

// ── theme.css ───────────────────────────────────────────────────────────────
const def = brands.find((b) => b.project === DEFAULT_BRAND);
write(
  "packages/css/theme.css",
  `/* messer-ui — generated by scripts/build-registry.mjs. Do not edit.
   Values come from canon/tokens.json and brand/${DEFAULT_BRAND}.json. */

:root {
  color-scheme: light;
${decl({ ...ink, ...baseVars("light", def) }, "  ")}
}

.dark {
  color-scheme: dark;
${decl(baseVars("dark", def), "  ")}
}

@theme inline {
${decl(colorTheme, "  ")}
}
`,
);

// ── brand css (file-based install; the CLI's cssVars merge mangles extra keys) ─
const brandCss = (b) => `/* messer-ui — brand ${b.project}. Generated; do not edit. */
:root {
${decl(brandVars(b, "light"), "  ")}
}

.dark {
${decl(brandVars(b, "dark"), "  ")}
}
`;
for (const b of brands) write(`packages/css/brand/${b.project}.css`, brandCss(b));

// ── registry ────────────────────────────────────────────────────────────────
const SCHEMA = "https://ui.shadcn.com/schema/registry-item.json";
const SHADCN_KEYS = new Set([
  "--background", "--foreground", "--card", "--card-foreground", "--popover", "--popover-foreground",
  "--primary", "--primary-foreground", "--secondary", "--secondary-foreground", "--muted",
  "--muted-foreground", "--accent", "--accent-foreground", "--destructive", "--destructive-foreground",
  "--border", "--input", "--ring", "--radius",
  "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5",
]);
const shadcnOnly = (vars) => Object.fromEntries(Object.entries(vars).filter(([k]) => SHADCN_KEYS.has(k)));
const base = { $schema: SCHEMA };

const styleItem = {
  ...base,
  name: "messer-style",
  type: "registry:style",
  title: "Messer UI — style",
  description:
    "The fixed frame: Lyra geometry, neutral surfaces, zero radius, Golos Text + JetBrains Mono, Phosphor icons. Install first, then a brand.",
  cssVars: {
    theme: { ...colorTheme, "--font-sans": ink["--font-sans"], "--font-mono": ink["--font-mono"] },
    light: shadcnOnly({ "--radius": "0px", ...baseVars("light", def) }),
    dark: shadcnOnly({ "--radius": "0px", ...baseVars("dark", def) }),
  },
};

const fontsItem = {
  ...base,
  name: "messer-fonts",
  type: "registry:theme",
  title: "Messer UI — fonts",
  description:
    "Golos Text (human voice) and JetBrains Mono (machine voice). With next/font, keep this item and expose --font-golos / --font-jetbrains; the stack picks them up.",
  cssVars: {
    theme: {
      "--font-sans": `var(--font-golos, ${tokens.font.sans.$value})`,
      "--font-mono": `var(--font-jetbrains, ${tokens.font.mono.$value})`,
    },
  },
};

const fingerprintItem = {
  ...base,
  name: "messer-fingerprint",
  type: "registry:style",
  title: "Messer UI — fingerprint",
  description:
    "The ten rules as CSS: heading voices, one label style, tabular numbers, hairline borders, square focus, reduced motion. No colours.",
  css: {
    "*": { "border-color": "var(--border)" },
    html: { "-webkit-font-smoothing": "antialiased", "-moz-osx-font-smoothing": "grayscale" },
    ...typeRules,
    "::selection": { "background-color": "var(--primary)", "color": "var(--primary-foreground)" },
    ":focus-visible": { outline: "2px solid var(--ring)", "outline-offset": "2px", "border-radius": "0" },
  },
};

const componentItems = [
  {
    name: "status-badge",
    title: "Messer UI — status badge",
    description:
      "Rule 8 as a component: icon + label, colour reinforcing only. Four statuses, one shape.",
    files: [{ path: "registry/status-badge/status-badge.tsx", type: "registry:ui", target: "components/ui/status-badge.tsx" }],
    // declared, never inferred: inference reads `cn` out of `import { cn } from "@/lib/utils"`
    // and installs a package called cn. The badge is the app's own component, not ours to rewrite.
    dependencies: ["@phosphor-icons/react"],
  },
  {
    name: "page-header",
    title: "Messer UI — page header",
    description:
      "Eyebrow (mono), title (h1, human voice), optional description and right-aligned actions.",
    files: [{ path: "registry/page-header/page-header.tsx", type: "registry:ui", target: "components/ui/page-header.tsx" }],
    dependencies: [],
  },
].map((c) => ({ ...base, type: "registry:ui", ...c }));

const agentItem = {
  ...base,
  name: "messer-agent",
  type: "registry:item",
  title: "Messer UI — agent files",
  description:
    "AGENTS.md and MESSER.md for a consuming project: the rules an agent must follow, the commands it must run, and where deviations are recorded.",
  files: [
    { path: "registry/messer-agent/AGENTS.md", type: "registry:file", target: "~/AGENTS.md" },
    { path: "registry/messer-agent/MESSER.md", type: "registry:file", target: "~/MESSER.md" },
  ],
};

const brandItems = brands.map((b) => ({
  ...base,
  name: `brand-${b.project}`,
  type: "registry:theme",
  title: `Messer UI — ${b.title}`,
  description: `Accent and chart ramp for ${b.title}. Nothing else: radii, type and geometry come from messer-style.`,
  cssVars: { light: shadcnOnly(brandVars(b, "light")), dark: shadcnOnly(brandVars(b, "dark")) },
}));

const items = [styleItem, fontsItem, fingerprintItem, ...componentItems, agentItem, ...brandItems];

write(
  "registry.json",
  JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: "messer-ui",
      homepage: "https://github.com/jakobbjelver/messer-ui",
      items,
    },
    null,
    2,
  ) + "\n",
);

for (const item of items) write(`registry/${item.name}/registry-item.json`, JSON.stringify(item, null, 2) + "\n");

console.log(`theme.css + type.css written`);
console.log(`registry  ${items.length} items: ${items.map((i) => i.name).join(", ")}`);
for (const b of brands) {
  const l = b.accent.light, d = b.accent.dark;
  console.log(`  ${b.project.padEnd(14)} light ${l} fg ${accentFg(l)} · dark ${d} fg ${accentFg(d)}`);
}
