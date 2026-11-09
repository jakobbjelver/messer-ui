# messer-ui

The design system for Messer and Jakob Bjelvér projects. One visual family, five surfaces, measured
rather than eyeballed.

**The idea:** a platform-neutral canon (`canon/`), a pinned React reference implementation
(shadcn/Lyra), and ports that are checked against the reference. shadcn is the vehicle — the
distribution and the measuring stick — not the authority. Identity lives in one accent per project.

```
canon/            tokens.json · rules.md · pinned reference snapshot     ← never changes shape
port 1  React     shadcn/Lyra components + behaviour   portal · swiparr · ai-router · studio
port 2  atoms     compiled .m-* recipes, no JS          request-games
port 3  lookalike SwiftUI / Flutter, tokens only        later
```

## The ten rules

| # | Rule | Why |
|---|---|---|
| 1 | Square corners; circles only for avatars, status dots, slider thumbs | The one shape signature that survives every platform |
| 2 | Hairline borders; no shadows except overlays; no gradients, glass or blur | Depth is not decoration, it means "this floats above" |
| 3 | Mono is the machine voice: h3–h6, labels, numbers, IDs, timestamps, table heads, code | Data should look like data at a glance |
| 4 | Golos is the human voice: h1–h2, body, buttons, form values, descriptions | Reading is not data entry |
| 5 | Meta labels: 10.5px mono uppercase, `.1em` tracking. Field labels: sentence-case 14/500 | Meta is machine voice, fields are human voice |
| 6 | Numbers are tabular and right-aligned in tables | Columns must line up |
| 7 | Exactly one accent per project; everything else neutral | Identity is a signal, not a palette |
| 8 | Status is always icon + label; colour reinforces, never carries meaning alone | Colour-blind safe by construction |
| 9 | Phosphor icons, 16px, `weight="regular"`, `currentColor` (14 compact, 20 nav) | One icon voice per surface |
| 10 | Density comes from three control heights: 28 / 32 / 36 | Consistency without a spacing argument |

Full rationale, the capability matrix and the deviation policy: [`canon/rules.md`](canon/rules.md).

## Commands

```bash
npm install
npm run build            # tokens + brands → theme.css, registry items, messer.css
npm run brand:check      # AA contrast + accent/status hue distance, exit 1 on failure
npm run sink             # kitchen sink: fonts, overflow, console errors, screenshots
npm run validate         # npx shadcn registry validate jakobbjelver/messer-ui
```

## Adopting it in a project

```bash
# 1. tokens as files (the CLI's cssVars merge mangles non-shadcn keys)
node scripts/install.mjs --app ~/Repos/<project> --brand <project> --dir src/styles/messer

# 2. import them in the global stylesheet, after the Tailwind import
#    @import "../styles/messer/theme.css";
#    @import "../styles/messer/type.css";
#    @import "../styles/messer/brand.css";

# 3. components (optional — existing shadcn components pick up the tokens automatically)
npx shadcn@latest add jakobbjelver/messer-ui/messer-style jakobbjelver/messer-ui/messer-fingerprint
```

Then render the sink at `/ui` and measure it:

```bash
node scripts/snapshot.mjs --url http://127.0.0.1:3001/ui     # capture a reference (once per port 1)
node scripts/check.mjs --url http://127.0.0.1:3001/ui --app ~/Repos/<project>
```

Port 2 (no React) loads `packages/css/messer.css` and its `fonts/` directory and uses `.m-*` classes.
A project's local decisions and its dated deviations live in its own `MESSER.md` — never here.

## What lives where

- `canon/tokens.json` — the only hand-authored values (DTCG).
- `packages/css/` — `theme.css` (tokens + Tailwind `@theme`), `recipes.css` (`.m-*` atoms),
  `fonts/` (self-hosted Golos Text + JetBrains Mono, OFL).
- `brand/*.json` — accent + chart ramp per project. Nothing else.
- `registry/` — generated shadcn registry items (`registry.json` uses `include`).
- `fixtures/kitchen-sink.html` — the visual oracle every port must render.
- `scripts/` — build, brand check, config assert, sink check, sprite/font copy.

Generated files (`packages/css/theme.css`, `registry/**`, `registry.json`) are committed so the
registry validates without a build step. Edit `canon/` or `brand/`, then `npm run build`.
