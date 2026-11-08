# AGENTS.md — messer-ui

Messer UI is a design system, not an app. Read `canon/rules.md` before changing anything visual.

## Invariants

- `canon/tokens.json` is the only hand-authored value source. `brand/*.json` holds only the accent.
- `packages/css/theme.css`, `registry/**` and `registry.json` are **generated**. Never edit them by
  hand — edit `canon/` or `brand/`, then `npm run build`.
- `recipes.css` is hand-written CSS on tokens. Do not convert it to `@apply`; port 2 must consume the
  built file with no Tailwind toolchain.
- Radius is zero. If you find yourself writing a non-zero radius, you are outside the whitelist
  (avatar, status dot, slider thumb).
- One accent. Nothing else in the palette.

## Commands

```bash
npm install
npm run build          # canon + brands → theme.css, registry items, dist/messer.css
npm run brand:check    # exits 1 on AA failure or hue collision
npm run sink           # kitchen sink: fonts, overflow, console errors, screenshots
npm run validate       # registry validate (needs the repo pushed)
```

## Adding a brand

1. `brand/<project>.json` with `project`, `title`, and `accent.light` / `accent.dark` (OKLCH).
2. `npm run build` → `registry/brand-<project>/` appears.
3. `npm run brand:check` → must pass; the computed `accentFg` and chart ramp are printed.
4. Commit both the brand file and the generated item.

## Adding an atom

1. Add the `.m-*` recipe to `packages/css/recipes.css` using tokens only (no literals, no `@apply`).
2. Add it to `fixtures/kitchen-sink.html` with a `data-fixture="<name>"` attribute and both themes.
3. `npm run build && npm run sink`; the sink must stay clean at 1280 / 390.
4. If it needs behaviour (open/close, focus trap, keyboard), it is **port 1 only**: add a shadcn
   component and record it in the capability matrix in `canon/rules.md`.

## Definition of a good change

`npm run check` green (brand check, build, sink) with the evidence pasted into the commit or PR. No
new hex outside `canon/tokens.json` and `brand/`. No new font. No second icon family.
