# messer-ui v2 — Family Identity at the Page Level

> **For Hermes:** execute phase by phase. Each phase ends at a gate; paste the gate's *measured*
> output into a `rev` note at the bottom of this file before starting the next phase. Read
> `~/Artifacts/_plans/messer-ui/PLAN.md` (the v1 program) first — this plan assumes everything in it
> landed. Never run manual `docker compose`; deploys go through Komodo (`messer-server-services`).

**Goal:** make four React apps and one Go app read as one product with five accents — by
standardising the shell, the page recipes and the interaction states, and by collapsing to a single
rendering port.

**Architecture:** the canon stays the authority (tokens + rules); shadcn stays the vehicle. Add two
layers above atoms — **blocks** (composed, installed from the registry) and **pages** (recipes,
forked) — plus a **state contract** that `check` measures. Port 2 is frozen now and deleted when
request-games becomes a React app.

**Tech stack:** shadcn CLI v4 (registry, `add`, `--diff`), Tailwind v4, React 19 / Next 16 / Vite /
Astro, Go `html/template` (until Phase 8), Playwright 1.64 (already a devDependency — used for
measurement *and* rasterising marks, so no new native dependency).

---

## 1. Why this plan (measured 2026-11-09)

| # | Finding | Evidence | Consequence |
|---|---|---|---|
| F1 | Request-games passes its own gate and still reads foreign | `check --profile atoms` green; shell is 622 lines of `web/styles/_legacy.css`; port 2 ships atoms with no page recipes | Identity lives at page level; the gate only sees atoms |
| F2 | Four of ten rules have no check | `scripts/check.mjs` compares type, colour, radius and height against a pinned snapshot, and greps for lucide imports — nothing else | R2 (shadows), R6 (tabular), R7 (accent), R8 (status) are prose |
| F3 | `hybrid-tooltip.tsx` is byte-identical in swiparr and portal, and unregistered | md5 scan of 287 `.tsx` files across five repos: 15 exact duplicate pairs, 12 are vendored shadcn/animate-ui atoms, **3 are ours** (`hybrid-tooltip`, `status-badge`, `page-header`) | It is already the family standard; only the registry is missing it |
| F4 | The patch loop works | `page-header` and `status-badge` are identical in registry, portal and ai-router; swiparr differs only by its local `paused` status | Duplication is atoms, not blocks — do not extract more atoms |
| F5 | Request-games' favicon is an inline **circle** | `web/templates/base.html:7` (data-URI SVG, green circle) | Rule 1 violation no gate can see; marks must be generated and hashed |
| F6 | Every app invents its own shell | portal = `NavigationBar` with underline active; request-games = fixed 240px sidebar; swiparr = none (immersive deck) | This, not atoms, is why the family does not read as one |

**The thesis:** a design system that ships only atoms is a component library. Familiarity comes from
the shell, the page composition, the state behaviour and the restraint — all of which are currently
per-app decisions.

## 2. Decisions (settled — these are the spec)

| # | Decision | Answer |
|---|---|---|
| D1 | Ports | **One port.** Port 2 is frozen now, deleted in Phase 8. Port 3 stays a token export. |
| D2 | Shell | `AppShell` with three variants: `sidebar`, `topbar`, `none`. Mobile is CSS-only — no drawer inside the block. |
| D3 | Mark | Monochrome ink box + paper glyph, never the accent. Light and dark assets, both generated from tokens. |
| D4 | Canon version | `package.json.version` **is** the canon version; stamped into generated `theme.css`; repo tag equals it. |
| D5 | Chart palette | Keep the 5-step sequential ramp; add a 6-step **monochrome** categorical set (accent + neutral steps). No rainbow. |
| D6 | Auth | `auth-card` + `login-form` blocks, framework-free; a Next `registry:page` composes them; Vite/Astro wiring documented. |
| D7 | Request-games | Convert to React, Go stays as the API — Phase 8 after a go/no-go gate. Until then: marks only, no port-2 shell work. |
| D8 | Enforcement | Every rule gets a check. Snapshot diffs stay for type; new checks assert **constraints and deltas**, not pixels. |

## 3. The model change

| Tier | What | Source | Install | Drift policy |
|---|---|---|---|---|
| 1. Atoms | button, input, dialog, table… | shadcn | `shadcn add` (vendored) | Patch only via `add --diff`; never hand-edit silently |
| 2. Blocks | AppShell, HybridTooltip, EmptyState, Stat, PageToolbar, Time, CopyButton, AuthCard, LoginForm, ErrorState, SettingsSection | `registry/<item>/` | `shadcn add jakobbjelver/messer-ui/<item>` | Local patches allowed; `--diff` must show only the patch |
| 3. Pages | login, not-found, (later settings) | `registry/page-*/` | forked copy | Drift expected; recipes are starting points, not dependencies |

**Promotion rule:** the first copy is fine, the second copy goes into the registry, and a third copy
fails CI (`scripts/dupes.mjs --fail-on new`).

**Port 2, frozen** means: no new `.m-*` recipes, no new templates, no shell work, no new fixtures.
Security and correctness fixes only. The capability matrix in `canon/rules.md` says so, with the exit
condition "deleted when request-games is a React app".

---

## 4. Phases

### Phase 0 — Baseline, inventory, freeze (gate A) · S · ~1 h

**Objective:** know exactly where every app stands and stop port 2 from growing before anything moves.

#### Task 0.1 — App manifest

**Create:** `scripts/apps.json`

```json
{
  "apps": [
    { "id": "swiparr",     "path": "~/Repos/messer-swipe",             "brand": "swiparr",     "sink": null, "shell": "none" },
    { "id": "portal",      "path": "~/Repos/messer-portal",       "brand": "portal",      "sink": null, "shell": "topbar" },
    { "id": "ai-router",   "path": "~/Repos/messer-ai-router",           "brand": "ai-router",   "sink": null, "shell": "topbar" },
    { "id": "studio",      "path": "~/Repos/site",                "brand": "studio",      "sink": null, "shell": "topbar" },
    { "id": "request-games","path": "~/Repos/messer-request-games","brand": "request-games","sink": null, "shell": "sidebar" }
  ]
}
```

Fill `sink` with the real local URL at execution time (`swiparr /_ui`, `portal /ui`,
`ai-router ui.html`, `studio ?__sink=1`, `request-games /ui`). Expand `~` in the script, not in JSON.

#### Task 0.2 — Duplicate scanner

**Create:** `scripts/dupes.mjs`

- Walk each `apps[].path`, skip `node_modules`, `.next`, `dist`, `out`, `.astro`, `.git`.
- Collect `*.tsx`, hash content (sha256), group exact matches.
- For same-basename files with different hashes, compute Jaccard similarity on normalised line sets;
  report ≥ 0.80 as "near".
- Write `canon/duplicates.json`; print a table sorted by count.
- `--update` rewrites `canon/duplicates.baseline.json`; `--fail-on new` exits 1 when a pair appears
  that is not in the baseline. CI runs `--fail-on new`.

**Verify:** `node scripts/dupes.mjs` prints 15 exact pairs today (12 vendored, 3 ours) and exits 0.

#### Task 0.3 — Baseline

Run and record in §7:

```bash
cd ~/Repos/messer-ui && npm run check
node scripts/check.mjs --app ~/Repos/messer-swipe --static
node scripts/check.mjs --app ~/Repos/messer-portal --static
node scripts/check.mjs --app ~/Repos/messer-ai-router --static
node scripts/check.mjs --app ~/Repos/site --static
node scripts/check.mjs --app ~/Repos/messer-request-games --static
```

#### Task 0.4 — Freeze port 2 in writing

**Modify:** `canon/rules.md` (capability matrix), `README.md`, `registry/messer-agent/MESSER.md`,
header comment of `packages/css/recipes.css`.

Add to each: "Port 2 is frozen: atoms only, no new recipes or templates. Exit condition: request-games
converted to port 1."

**Gate A:** `node scripts/dupes.mjs` exits 0 with the 15-pair table; baseline table in §7 filled;
`npm run build` still green.

---

### Phase 1 — Canon 2.0: states, copy, mark (gate B) · M · ~3 h

**Objective:** the rules stop being about geometry only. Three new normative sections, one of them
machine-readable.

#### Task 1.1 — Restructure `canon/rules.md`

Insert **§11 States**, **§12 Copy**, **§13 The mark**; move "What a project may choose" to §14 and
"Deviations" to §15. Update the intro sentence that points at §11 and every `§11` reference:

```bash
grep -rn "§11" canon/ registry/ README.md
```

§11 table (normative):

| State | Spec |
|---|---|
| hover | exactly one surface step (`surface` → `surface-2`), 120 ms, no shadow, no scale, no movement. **Only if the element is clickable** — hover is a promise |
| focus-visible | 2px `--ring`, 2px offset, square. Never removed, never replaced by a border |
| active | the hover step, no press animation, no transform |
| selected | 8–10 % accent tint + 2px accent rule (left in a sidebar, bottom in a topbar). Never a filled accent row |
| disabled | text at 40–50 % opacity, no hover, `aria-disabled` — not `pointer-events: none` |
| loading | skeleton for content, spinner for an action, never both in one region |

§12 Copy: one verb set (`Save`, `Cancel`, `Delete`, `Create` — never `Update`/`Apply`); empty state =
what this is + why it is empty + one action; error = what happened + what to do; confirmation names
the object ("Delete 3 requests?"); no exclamation marks; no "Oops".

§13 The mark: square, monochrome, ink box + paper glyph, glyph = 62.5 % of the box, never the accent,
never rounded, never a gradient. The glyph is a Phosphor regular icon; each project picks one.

#### Task 1.2 — Machine-readable state contract

**Create:** `canon/states.json`

```json
{
  "$description": "Interaction contract. Prose is rules.md §11; check.mjs measures these deltas.",
  "hover":         { "surfaceStep": 1, "durationMaxMs": 200, "forbid": ["box-shadow", "transform"] },
  "focusVisible":  { "outlineWidth": 2, "outlineOffset": 2, "outlineToken": "--ring" },
  "disabled":      { "textOpacityMax": 0.55, "forbidCursor": "pointer" },
  "selected":      { "accentMixMax": 0.14, "ruleWidth": 2 },
  "loading":       { "skeletonFor": "content", "spinnerFor": "action" }
}
```

#### Task 1.3 — Stamp the canon version

**Modify:** `scripts/build-registry.mjs`

Read `package.json.version`; prepend to `packages/css/theme.css`, `packages/css/type.css`,
`packages/css/recipes.css` and each `packages/css/brand/<project>.css`:

```
/* messer-ui canon 2.0.0 — generated from canon/ and brand/; do not edit */
```

**Modify:** `scripts/check.mjs` — in the `--app` branch, read the first line of
`<app>/**/styles/messer/theme.css`; warn (not fail) when missing or different from the local canon.

**Modify:** `registry/messer-agent/MESSER.md` — add `canon: <version>` next to the deviations table.

#### Task 1.4 — Categorical chart tokens (D5)

**Modify:** `scripts/build-registry.mjs` → `brandVars()` gains `--chart-cat-1..6`:

- 1 = accent, 2 = accent at the same hue with L shifted 0.12 (towards the theme's readable direction),
- 3–6 = neutral steps at L .78 / .62 / .46 / .30, hue 260, chroma 0.006.

**Modify:** `scripts/brand-check.mjs` — assert adjacent categorical steps differ by ΔL ≥ 0.10 and
that steps 1–2 share the accent hue.

**Modify:** `showcase/build.mjs` — a categorical strip beside the sequential ramp.

**Gate B:**

```bash
npm run brand:check          # 5 brands × 2 modes, cat ramp ΔL reported
npm run build                # registry + css + sprite
npm run showcase             # builds with the new section
grep -cE "^#{1,2} [0-9]+\." canon/rules.md   # 15 numbered sections, no dangling § references
```

Paste the brand-check table and the section list into the rev note.

---

### Phase 2 — Marks (gate C) · M · ~3 h

**Objective:** every project gets the same mark, generated, not hand-drawn — and a gate that notices
when one is missing.

#### Task 2.1 — Brand schema

**Modify:** `brand/{swiparr,portal,ai-router,studio,request-games}.json`

```json
"mark": { "glyph": "Cards" }
```

Recommended glyphs (change any before execution; one line each):

| Project | Glyph | Why |
|---|---|---|
| swiparr | `Stack` | the swipe deck — layers |
| portal | `SquaresFour` | the dashboard |
| ai-router | `ArrowsSplit` | routing |
| studio | `PenNib` | authoring |
| request-games | `GameController` | games |

`Cards` and `HardDrives` were the first picks and failed the 32 px read: the first looks like a copy
icon, the second like a letter B. Glyphs are checked by eye at 32 px before they are accepted.

#### Task 2.2 — Shared static server

**Create:** `scripts/lib/serve.mjs` — extract the tiny MIME server currently inlined in
`scripts/sink-check.mjs`; both `sink-check.mjs` and `mark.mjs` import it. Re-run `npm run sink` to
prove no behaviour change.

#### Task 2.3 — Mark generator

**Create:** `scripts/mark.mjs`

Reads `brand/*.json` + `canon/tokens.json`, resolves the light theme's `--foreground` / `--background`
to hex, and writes per project:

| File | Size | Content |
|---|---|---|
| `marks/<project>/favicon.svg` | 32 | ink box, paper glyph |
| `marks/<project>/favicon-dark.svg` | 32 | inverse |
| `marks/<project>/favicon-32.png` | 32 | rasterised light |
| `marks/<project>/apple-touch-icon.png` | 180 | ink box, no transparency |
| `marks/<project>/og.png` | 1200×630 | ink box, mark 96px, wordmark in JetBrains Mono, tagline in Golos |
| `marks/manifest.json` | — | `{ project: { file: sha256 } }` |

Geometry: box 32, glyph 24 centred (4 px padding) = 75 %. Phosphor source is
`node_modules/@phosphor-icons/core/assets/fill/<kebab>-fill.svg`, viewBox `0 0 256 256`, so
`translate(4 4) scale(0.09375)`.

Weight: **fill**, not regular. The first cut used `regular` at 62.5 % and every glyph lost its interior
detail at 32 px — `Cards` read as a copy icon, `HardDrives` as a letter B. A mark is a silhouette.

Colour: `oklchToHex()` in `scripts/lib/color.mjs` — the lib already had the oklch→linear→sRGB maths, so
the browser probe the plan first suggested is unnecessary. The mark cannot drift from the palette.

Rasterise with Playwright (already installed): serve `marks/` through `lib/serve.mjs`, load the SVG in
an HTML page sized to the target, `page.screenshot({ clip })`. Load Golos + JetBrains from
`node_modules/@fontsource-variable/*/files/*.woff2` via `@font-face` — never system fonts, or the OG
image drifts per machine.

#### Task 2.4 — Enforce

**Modify:** `scripts/brand-check.mjs`

- fail when `mark.glyph` is missing or the Phosphor file does not exist;
- fail when any generated asset is missing;
- fail when a sha256 in `marks/manifest.json` does not match the file on disk;
- `--write` regenerates the manifest (so a deliberate change is one command, not a silent pass).

**Modify:** `package.json` — `"marks": "node scripts/mark.mjs"`; CI runs `npm run marks && npm run brand:check`.

**Gate C:** `npm run marks && npm run brand:check` green; `marks/manifest.json` lists 5 projects × 5
files; visually confirm each glyph is legible at 32 px (vision check on the contact strip).

---

### Phase 3 — The gate gets teeth (gate D) · L · ~5 h

**Objective:** four unguarded rules become measured, and interaction states get a delta test. This is
the phase that makes every later phase enforceable.

#### Task 3.1 — Extend measurement

**Modify:** `scripts/lib/measure.mjs`

Add to each fixture record: `boxShadow`, `fontVariantNumeric`, `outlineWidth`, `opacity`, `cursor`,
`transitionDuration`, `transform`.

Add to the return value:

- `primaryBgCount` — elements whose computed `background-color` resolves to `--primary`;
- `hues` — distinct hues (> 12° apart) among fixture `color`/`background-color`, ignoring neutrals
  (chroma < 0.03);
- `controlHeights` — heights of every `button`, `[role=button]`, `input`, `select`, `textarea`,
  `[data-fixture^=btn]`.

#### Task 3.2 — State probes

**Create:** `scripts/lib/states.mjs`

```js
export async function probeStates(page, contract) { /* hover, focus, disabled, selected */ }
```

- **hover** — for each `[data-state-hover]`: read rest styles, `await locator.hover()`, read again;
  assert background moved exactly one surface step (compare against the resolved `--surface-2`),
  `box-shadow` still `none`, `transform` still `none`, `transition-duration ≤ 200ms`.
- **focus** — press `Tab` from `document.body` until `document.activeElement` is a
  `[data-state-focus]`; assert `matches(':focus-visible')`, `outline-width: 2px`,
  `outline-offset: 2px`, `outline-color` == resolved `--ring`.
- **disabled** — `[data-state-disabled]`: text opacity ≤ 0.55, cursor not `pointer`.
- **selected** — `[data-state-selected]`: background is the accent tint (alpha ≤ 0.14) and the
  `::after` rule is 2 px.

#### Task 3.3 — Assertions

**Modify:** `scripts/check.mjs`

New `assertConstraints(got, theme)` — runs on **both** profiles:

| Rule | Assertion |
|---|---|
| R2 | every measured `[data-fixture]` that is not inside `[data-overlay]` has `box-shadow: none` (portaled overlays are never fixtures) |
| R6 | `[data-fixture="data"]`, `table-num`, numeric cells carry `tabular-nums` |
| R7 | inside each `[data-page]` composition: ≤ 1 primary-filled control and accent area ≤ 5 %; page-wide distinct hues ≤ 4 (accent + danger/warning/success) |
| R8 | every `[data-status]` has an `svg` child **and** a non-empty text node |
| R10 | every control height ∈ {28, 32, 36} ± 0.5 |

New `assertStates(page, contract)` — `--profile full` only (port 2 has no overlays).

#### Task 3.4 — Fixtures

**Modify:** `fixtures/kitchen-sink.html` — add a `data-section="states"` block with:
`data-state-hover` (a clickable card and a table row), `data-state-focus` (button, input),
`data-state-disabled` (button), `data-state-selected` (nav row), `data-overlay` (dialog + tooltip),
and one `data-page` composition (PageHeader + toolbar + table + exactly one primary action) for the
accent budget.

**Modify the five app sinks** with the same `data-*` hooks:
`swiparr/src/app/_ui/page.tsx`, `messer-portal/web/app/ui/page.tsx`,
`ai-router/packages/dashboard/ui.html`, `site/src/studio/client/dev/Sink.tsx`,
`messer-request-games/web/templates/ui.html`.

#### Task 3.5 — Prove the gate bites

**Create:** `fixtures/violations.html` + `scripts/check-selftest.mjs`

The fixture breaks each new check once (a shadowed card, a proportional number, a fifth hue, a
status badge without an icon, a 30 px button, a hover with a shadow). The selftest runs the checker
against it and asserts **exactly** those failures, by message prefix. `npm run check` includes it;
`ci.yml` runs it.

**Gate D:**

```bash
npm run check          # green on messer-ui's own sink
npm run selftest       # N expected failures, 0 unexpected
```

Then break one thing by hand (add `shadow-sm` to a scratch fixture) and paste the exact failure line
into the rev note. A gate that cannot be shown failing is not a gate.

---

### Phase 4 — Family blocks (gate E) · L · ~6 h

**Objective:** promote the things every app rebuilds, starting with the one that decides whether the
apps look related at all.

#### Task 4.1 — `app-shell` (the keystone)

**Create:** `registry/app-shell/{app-shell.tsx,registry-item.json}`

```tsx
export type NavItem = { href: string; label: string; icon?: ReactNode; badge?: ReactNode; external?: boolean };

export type AppShellProps = {
  brand: { name: string; mark?: ReactNode; href?: string };
  nav?: NavItem[];
  active?: string;                 // the app passes the pathname — no next/navigation import
  variant?: "sidebar" | "topbar" | "none";
  user?: { name: string; role?: string };
  footer?: ReactNode;
  linkComponent?: ComponentType<{ href: string; className?: string; children: ReactNode }>;
  children: ReactNode;
};
```

Rules the implementation must hold:

- **No framework imports.** No `next/link`, no `usePathname` — `linkComponent` defaults to `"a"`, and
  `active` is a string comparison (`active === href || active.startsWith(href + "/")`). This is what
  makes one block work in Next, Vite and Astro.
- **No `@/lib/utils`.** Compose class lists directly (the `cn`-package pitfall, rev 8).
- Sidebar: 240 px, `border-r`, `--surface`, nav rows 32 px, icons 20 px, meta label for the group
  caption, user block at the bottom (avatar circle 24 px is whitelisted by rule 1), `footer` slot for
  the version string.
- Topbar: 48 px, `border-b`, nav inline, active = 2 px bottom rule.
- Active state: `bg-primary/10` + `after:` 2 px accent rule, `aria-current="page"`. No layout shift —
  the rule is a pseudo-element, not a border.
- Mobile: CSS only — sidebar `hidden md:flex`, a topbar `flex md:hidden` with `overflow-x-auto`. No
  drawer inside the block (a drawer would drag in `sheet` and its `@/lib/utils` import).
- `variant="none"` renders children only, for immersive apps (swiparr's deck).

`registry-item.json`: `type: "registry:block"`, `dependencies: []`, `registryDependencies: []`.

#### Task 4.2 — `hybrid-tooltip`

**Create:** `registry/hybrid-tooltip/{hybrid-tooltip.tsx,registry-item.json}`

Copy `swiparr/src/components/ui/hybrid-tooltip.tsx` **and** replace the two `@radix-ui/*` type
imports with types derived from the local components:

```tsx
type TooltipProps = React.ComponentProps<typeof Tooltip>;
type PopoverProps = React.ComponentProps<typeof Popover>;
```

That is the only change: it makes the block work on Radix *and* Base UI apps, as long as the app has
`tooltip` and `popover` (relative imports `./tooltip`, `./popover` — the proven pattern). Declare no
`registryDependency` on `tooltip`/`popover`: `add` would offer to overwrite the app's copies (the
`badge` pitfall). Say the requirement in the item description instead.

#### Task 4.3–4.7 — The small blocks

| Item | Props | Notes |
|---|---|---|
| `empty-state` | `icon`, `title`, `description`, `action`, `variant="panel"\|"bare"` | mirrors port 2's `.m-empty` |
| `stat` | `label`, `value`, `delta?`, `hint?` | label mono-caps, value tabular, delta = status icon + word |
| `page-toolbar` | `left`, `right` | 32 px row: search, filters left; primary action right |
| `time` | `value`, `mode="relative"\|"absolute"\|"both"` | `<time dateTime>`; `Intl.RelativeTimeFormat`; tabular |
| `copy-button` | `value`, `label?` | 28/32 px icon button, `Check` for 1.5 s, hybrid tooltip |

Each gets: `registry-item.json`, a `data-fixture` in `fixtures/kitchen-sink.html`, and a showcase
entry. Run `npm run build:registry && npm run validate` after each.

#### Task 4.8 — Pilot install

Install all seven into `messer-portal` (`npx shadcn@latest add jakobbjelver/messer-ui/<item>`), render
them in `/ui`, and run `messer check`. **Fix the block, never the app** — the pilot's job is to find
the block's missing affordance.

**Gate E:** `npx shadcn@latest view jakobbjelver/messer-ui/app-shell` lists the files; portal's `/ui`
renders all seven; `messer check --profile full` green on portal; patching one block and running
`add --diff` prints only the patch.

---

### Phase 5 — Page recipes (gate F) · M · ~4 h

**Objective:** the screens every app has, as code you fork rather than rebuild.

#### Task 5.1–5.2 — Auth

**Create:** `registry/auth-card/` — `{ brand, title, description, children, footer, error?, loading? }`.
No shell, `min-h-screen` grid, 380 px card on `--surface`, hairline border, mark at top, h1 in Golos,
footer link row. Error renders as an `Alert` with `role="alert"`.

**Create:** `registry/login-form/` — email + password, password visibility toggle (`Eye`/`EyeSlash`),
submit with spinner, `autoComplete="username"` / `"current-password"`, Enter submits, first field
focused, error text is **"Invalid email or password"** (no user enumeration). Dependency-free: an
`onSubmit(values) => Promise<{ error?: string }>` prop, internal pending state. No react-hook-form —
a recipe you fork should not drag a form library into the app.

#### Task 5.3 — Next page recipe

**Create:** `registry/page-login/` — `type: "registry:page"`, target `app/login/page.tsx`, composing
`auth-card` + `login-form`. The item description documents the Vite wiring (`<Route path="/login">`)
and the Astro wiring (island mount), since `registry:page` itself assumes Next's file routing.

#### Task 5.4 — Error page

**Create:** `registry/error-state/` — `{ code, title, description, actions }`, mono code at 64 px in
`--text-3`, h1 in Golos.
**Create:** `registry/page-not-found/` — Next `app/not-found.tsx` + `error.tsx` wiring documented.

#### Task 5.5 — Settings section

**Create:** `registry/settings-section/` — `{ title, description, children, footer? }`, footer is a
sticky save bar with dirty state. No page recipe yet; settings pages differ too much per app.

**Gate F:** install `page-login` into **swiparr** — it is the only app with an auth screen today
(`src/app/login`, `src/components/login/AuthView.tsx`); portal and ai-router sit behind Cloudflare
Access and have no login route, so neither is an auth pilot. Screenshot the 380 px card at 1280 and
390, both themes; `messer check` green.

---

### Phase 6 — Adoption (gate G) · L · ~8 h

**Objective:** the family actually looks like one. One app per commit, one deploy per app.

#### Task 6.1 — portal

Replace `NavigationBar` in `web/app/layout.tsx` with `AppShell variant="topbar"`; nav items move into
the layout; active becomes `aria-current` + the accent rule (today it is an underline). Delete
`web/components/navigation-bar.tsx`. Copy `marks/portal/*` into `web/public/res/` and point
`metadata.icons` at them.

#### Task 6.2 — ai-router

`AppShell variant="topbar"` in `packages/dashboard/src`; create `packages/dashboard/public/` for the
marks (it has none today) and wire `index.html` + `ui.html`.

#### Task 6.3 — Studio

`AppShell variant="topbar"` inside `src/studio/client` only. It must not import `theme.css` or
`studio.css` from outside the seam; run the site's 35 suites and the boundary tests before the build.

#### Task 6.4 — swiparr

No shell (D2: `variant="none"` — the deck is the product). Adopt the marks in `public/` and
`auth-card`/`login-form` in `src/components/login`. Keep the local `paused` status as a dated
deviation in `MESSER.md`.

#### Task 6.5 — request-games

Marks only: replace the inline circular favicon with `marks/request-games/favicon.svg` +
`apple-touch-icon.png` + `og.png` in `web/static/`. No other port-2 change — that is the freeze.

#### Task 6.6 — Per app, before the gate

- `MESSER.md` gains `canon: 2.0.0` and any new dated deviations;
- `node scripts/check.mjs --app <app> --static` green in CI;
- deploy through the app's existing pipeline (Komodo / its own workflow);
- visual confirmation at 1280 / 768 / 390, both themes.

**Gate G:** a table of app × (shell variant, mark installed, canon version, check result, deployed) in
the rev note; the three screenshots per app reviewed.

---

### Phase 7 — Contact sheet, release (gate H) · M · ~3 h

#### Task 7.1 — Contact sheet

**Create:** `scripts/contact-sheet.mjs`

Renders three canonical screens per app (home, list/index, detail) at 1280×900, light and dark, and
composites them into one PNG per theme in `screenshots/`. Auth-gated apps take a Playwright
`storageState` (`--storage-state <file>`); when absent, fall back to the app's `/ui` sink and label the
tile "sink". The point is the **logo-off test**: with the marks cropped out, would these read as one
product with five accents?

#### Task 7.2 — Showcase

**Modify:** `showcase/build.mjs` — add a marks section (5 × 2 modes at 32/64 px), a states section
(rendered from `canon/states.json`), a blocks section, and the canon version in the footer.

#### Task 7.3 — Docs and release

- `README.md`: the three tiers, the promotion rule, the port-2 freeze, the new commands.
- `canon/rules.md` final read-through; every § cross-reference resolves.
- Update the `messer-ui` skill (`skill_manage`) with the new commands and the new pitfalls.
- `package.json` → `2.0.0`; commit; tag `v2.0.0`; push.

**Gate H:** contact sheet produced and reviewed; `npm run showcase` green; tag exists on the remote
(`git ls-remote --tags origin v2.0.0`); skill updated.

---

### Phase 8 — Request-games conversion (decision-gated) · XL · ~2–3 days

**Gate 8.0 — go/no-go.** After Phase 7, review the contact sheet. Recommended: **go**. If no-go, port 2
stays frozen and the plan ends at Phase 7.

Shape (Go keeps the API and the session; React takes the UI):

1. **Inventory** — 10 templates → routes; handlers → JSON endpoints (today only
   `/api/requests/stats` exists; the rest are form posts). Record the parity list.
2. **Scaffold** `web/app` (Vite + React + TS), `shadcn init` (radix base), install
   `messer-style`, `messer-fonts`, `brand-request-games`, `app-shell`, `page-login`,
   `empty-state`, `stat`, `page-toolbar`.
3. **Routes** — login, home, search, discover, requests, reports, game detail, request detail.
   `AppShell variant="sidebar"` (the shape request-games already has, now canon).
4. **Go** — `//go:embed dist`, SPA fallback, keep `/api/*` and the cookie session; delete the
   template handlers.
5. **Delete** — templates, `_legacy.css`, htmx, the sprite, `build:css`.
6. **messer-ui** — delete port 2's *pipeline*, not its vocabulary: remove `scripts/build-css.mjs`,
   `scripts/sprite.mjs`, `--profile atoms`, the capability-matrix rows and the frozen note.
   **Keep `packages/css/recipes.css`** — `showcase/build.mjs` renders the showcase in `.m-*` classes,
   so after conversion it is the showcase's markup vocabulary, not a port.

**Gate I:** parity checklist complete; login/session/logout work; `messer check --profile full` green;
image size before/after; deployed through Komodo; the contact sheet re-run with request-games as a
React app.

---

## 5. Files likely to change

**messer-ui (new)**
`canon/states.json` · `scripts/{dupes,mark,check-selftest,contact-sheet}.mjs` · `scripts/lib/serve.mjs`
· `scripts/lib/states.mjs` · `scripts/apps.json` · `registry/{app-shell,hybrid-tooltip,empty-state,stat,page-toolbar,time,copy-button,auth-card,login-form,error-state,settings-section}/` ·
`registry/{page-login,page-not-found}/` · `fixtures/violations.html` · `marks/`

**messer-ui (modified)**
`canon/rules.md` · `canon/tokens.json` (only if a token is added) · `brand/*.json` ·
`scripts/{build-registry,brand-check,check,measure?}.mjs` · `scripts/lib/measure.mjs` ·
`packages/css/recipes.css` (header only) · `registry.json` · `showcase/build.mjs` · `README.md` ·
`package.json` · `.github/workflows/ci.yml` · `registry/messer-agent/MESSER.md`

**Apps**
`swiparr/src/app/layout.tsx`, `src/app/_ui/page.tsx`, `src/components/login/*`, `public/*`, `MESSER.md`
`messer-portal/web/app/layout.tsx`, `web/app/ui/page.tsx`, `web/components/navigation-bar.tsx` (delete), `web/public/res/*`, `MESSER.md`
`ai-router/packages/dashboard/{src,ui.html,public/}`, `MESSER.md`
`site/src/studio/client/{dev/Sink.tsx,shell?}`, `MESSER.md`
`messer-request-games/web/templates/{base,ui}.html`, `web/static/*`, `MESSER.md`

## 6. Risks and rollback

| Risk | Mitigation |
|---|---|
| New checks fail on legitimate app code (custom focus rings, third-party widgets) | Land checks warn-only per app, fix, then flip to fail in the same PR; the sink is the reference, not the app |
| AppShell adoption is a visible regression risk in four apps | One app per commit; old shell stays until the new one passes check + screenshots; revert is one file |
| `shadcn add` corrupts tokens (known) | Blocks carry no `cssVars`; tokens only via `install.mjs` |
| Playwright rasterisation is slow or font-dependent | Fonts from `@fontsource-variable` over the local server, never system fonts; marks run in CI only, not on every build |
| Studio's boundary tests reject the shell | AppShell lives inside `src/studio/client`, imports nothing outside the seam; suites run before build |
| Contact sheet needs auth | `--storage-state` per app; fall back to the sink tile and label it |
| Request-games conversion overruns | Gate 8.0; branch preserved; rollback = keep port 2 frozen |
| A block is adopted before it is right | Pilot is one app (portal); "fix the block, never the app" |

## 7. Baseline (measured 2026-11-09, Phase 0)

| App | Sink | check (profile) | Static pass | Notes |
|---|---|---|---|---|
| messer-ui | `fixtures/kitchen-sink.html` | sink clean ✓ · 51 fixtures | — | css 25.7 KB raw / 5.7 KB gzip |
| swiparr | `/_ui` | not run (no dev server) | 0 fails · 12 warns | full run in Phase 6 |
| portal | `/ui` | not run (no dev server) | 0 fails · 8 warns | full run in Phase 6 |
| ai-router | `ui.html` | not run (no dev server) | 0 fails · 3 warns | full run in Phase 6 |
| studio | `?__sink=1` | not run (auth-gated) | 0 fails · 196 warns | site is exempt by decision; the warnings are legitimate there |
| request-games | `/ui` | not run (no dev server) | 0 fails · 5 warns | profile atoms, frozen |

## 8. Open questions

1. **Mark glyphs** — the five in Task 2.1 are my pick. Say so before Phase 2 if one is wrong; each is
   one line in `brand/<project>.json`. If you say nothing, I use them.
2. **Deploy cadence** — one deploy per app as it adopts the shell (recommended; smaller blast radius)
   vs one release window for all four. If you say nothing, per-app.
3. **Request-games go/no-go** — decided at Gate 8.0, after the contact sheet exists. Not before.

## 9. Definition of done

- [ ] `canon/rules.md` has states, copy and mark as normative sections; no dangling § references.
- [ ] `check` asserts all ten rules plus the state contract; `npm run selftest` proves each new check
      can fail.
- [ ] Seven blocks + two page recipes in the registry; portal installs and renders all of them.
- [ ] Four apps adopt `AppShell` (swiparr `none` by decision); five apps carry generated marks.
- [ ] `canon: 2.0.0` recorded in every `MESSER.md`; `check --app` warns when an app is behind.
- [ ] Contact sheet reviewed against the logo-off test.
- [ ] `v2.0.0` tagged; showcase rebuilt; skill updated.
- [ ] Port 2 frozen and documented, with Phase 8 as its exit condition.

---

## Rev notes

### rev 0 — 2026-11-09 23:19 (planning)

Written after the brainstorm. Evidence gathered read-only: md5 scan of 287 `.tsx` across five repos
(15 exact pairs, 3 ours); `check.mjs` read in full (asserts font/radius/height/lucide only);
`canon/rules.md` read in full; `_legacy.css` measured at 622 lines; request-games' inline circular
favicon located at `web/templates/base.html:7`; `hybrid-tooltip.tsx` confirmed byte-identical in
swiparr and portal; registry `page-header`/`status-badge` confirmed identical to portal and ai-router,
differing in swiparr only by its `paused` patch.

No files changed outside this plan. Nothing executed.

### rev 1 — 2026-11-09 (Phase 0 executed, gate A passed)

**Scanner.** `scripts/dupes.mjs` + `scripts/apps.json` + `scripts/atoms.json` (43 vendored names,
exempt from the gate). Scan: **287 `.tsx` across 5 apps · 15 exact pairs · 18 near pairs ≥ 0.80**.
The exact pairs split 12 vendored / 3 ours — `hybrid-tooltip` (swiparr ⇄ portal), `status-badge`
(portal ⇄ ai-router), `page-header` (portal ⇄ ai-router). `canon/duplicates.baseline.json` committed.

Gate proven, not assumed: deleting the `hybrid-tooltip` key from the baseline made
`--fail-on new` exit **1** with `✗ 1 new custom duplicate(s): hybrid-tooltip.tsx: swiparr:… ⇄ portal:…`;
restored, it prints `dupes  no new custom duplicates ✓` and exits 0.

**Baseline (static pass).** swiparr `0 fails · 12 warns` · portal `0 · 8` · ai-router `0 · 3` ·
site `0 · 196` (exempt) · request-games `0 · 5`. messer-ui's own sink: `sink clean ✓ · 51 fixtures`,
css 25.7 KB raw / 5.7 KB gzip.

**Freeze.** Port 2 is frozen in `canon/rules.md` (capability matrix), `README.md`, `MESSER.md` and the
`recipes.css` header: atoms only, no new recipes, exit = request-games becomes port 1.

### rev 2 — 2026-11-09 (Phase 1 executed, gate B passed)

**Rules.** `canon/rules.md` now has **15 numbered sections**: §11 States, §12 Copy, §13 The mark;
"What a project may choose" moved to §14, "Deviations" to §15. The intro cross-reference was updated;
`grep -rn "§11\|§12"` finds no dangling reference. `canon/states.json` is the machine copy of §11.

**Version.** `package.json` → **2.0.0**; `build-registry.mjs` stamps
`/* messer-ui canon 2.0.0 — generated… */` into `theme.css`, `type.css` and every
`brand/<project>.css`. `check --app` reads the installed `styles/messer/theme.css` and warns when the
header is missing or behind. Swiparr currently reports
`src/styles/messer/theme.css: no canon version header — re-run scripts/install.mjs` — the expected
state until Phase 6 reinstalls tokens.

**Categorical ramp.** `categoricalRamp()` in `scripts/lib/color.mjs`: six steps, the accent followed by
five neutrals, or six neutrals for achromatic brands. Emitted as `--chart-cat-1..6` in theme, brand CSS
and registry `cssVars`; `brand:check` asserts every pair differs by ΔL ≥ 0.10, ΔC ≥ 0.02 or ΔH ≥ 12°;
the showcase has a Categorical panel.

**A real drift found and fixed.** `showcase/build.mjs` re-implemented the chart ramp instead of
importing it: `max(0.008, …)` chroma against the canon's `max(0.04, …)`, and dark-mode chroma × 0.6.
The page claimed "values are computed at build time, so they cannot drift" while drifting. It now
imports `accentFg`, `chartRamp` and `categoricalRamp` from `scripts/lib/color.mjs`, and the local
`parseColor`/`inkFor`/`ramp` copies are deleted.

**Gate B, measured:**

```
brand  5 brands × 2 modes ✓  AA + lightness band + categorical passed
registry validate  ✔ Registry is valid.  ✔ Checked 1 registry file and 11 items.
sink  4 runs · 51 fixtures · sink clean ✓
css   26.3 KB raw · 5.8 KB gzip
showcase  brands 5 · css 31.0 KB · html 23.8 KB
sections  15
```

### rev 3 — 2026-11-09 (Phase 2 executed, gate C passed)

**Marks.** `scripts/mark.mjs` + `scripts/lib/mark.mjs` generate five files per project —
`favicon.svg`, `favicon-dark.svg`, `favicon-32.png`, `apple-touch-icon.png`, `og.png` — plus
`marks/manifest.json` (sha256 per file). Colours come from `oklchToHex()` on the canon's
`--foreground`/`--background`, so the box is `#141414` in light and the glyph is the page colour.

**The first cut failed the 32 px read, and the fix was two spec changes.** At Phosphor `regular` and
62.5 %, `Cards` (swiparr) read as a *copy* icon and `HardDrives` (portal) as a letter *B* — vision
checks on the rendered PNGs, not guesses. The mark is now **`fill` weight at 75 %** (24 px glyph in a
32 px box), and the glyphs are `Stack` (swiparr) and `SquaresFour` (portal). All five now read at 32 px:
stack/layers, 2×2 grid, split/fork, pen nib, gamepad. §13 of `rules.md` records both changes.

**Enforcement.** `brand:check` fails on a missing `mark.glyph`, a glyph that is not in Phosphor, a
missing asset, or a hash mismatch. Proven: appending one comment line to `marks/swiparr/favicon.svg`
made it exit **1** with `✗ swiparr: marks/swiparr/favicon.svg is stale — run npm run marks`; restored,
exit 0. CI runs `npm run marks && git diff --exit-code -- marks/` after Playwright installs.

**Shared server.** `scripts/lib/serve.mjs` now holds the static server `sink-check` used to inline;
`sink` is still `4 runs · 51 fixtures · clean ✓`.

**Showcase.** A "Marks" section renders every project's light, dark and 64 px mark; `marks/` is copied
into `showcase/dist/` so the page is self-contained. `showcase` → `brands 5 · css 31.0 KB · html 27.2 KB`.

**Gate C, measured:**

```
marks  5 projects → marks/ · manifest.json
brand  5 brands × 2 modes ✓  AA + lightness band + categorical passed
marks  5 projects ✓  glyph + assets + hashes current
sink   4 runs · 51 fixtures · clean ✓
```

### rev 4 — 2026-11-09 (Phase 3 executed, gate D passed)

**Measurement.** `measure()` now returns `controls` (height + label), `pages` (primary fills and accent
area per `[data-page]`) and `statuses` (icon + label per `[data-status]`), alongside the existing
fixture props plus `boxShadow`, `fontVariantNumeric`, `opacity`, `cursor`, `transitionDuration`,
`transform` and the outline props. `scripts/lib/states.mjs` probes hover, focus (Tab, so
`:focus-visible` is real), disabled and selected.

**Three mechanisms found by measuring, not by reading:**

1. **Reading a probe element's computed background goes stale.** Setting `backgroundColor` to
   `var(--surface)` then `var(--surface-2)` and reading `getComputedStyle` in the same evaluate returns
   the *previous* value for every read after the first (Chromium does not flush style between var()
   writes; `offsetWidth` does not help). Every var read as `--background`. Fixed by reading the custom
   properties off `document.documentElement` and resolving them through the canvas.
2. **A just-focused element's computed style lags the pseudo-class change** by one style pass: the
   input reported Chrome's UA ring (`outline: auto`, colour `rgb(0, 95, 204)`) instead of the canon's.
   Fixed with two `requestAnimationFrame`s, paid only when a fixture is focused.
3. **The file-based install had no focus ring at all.** `:focus-visible` lived only in the
   `messer-fingerprint` registry item; `messer.css` (the sink and every `install.mjs` consumer) never
   had it, so the portal/kitchen-sink focus was the browser default. `build-registry.mjs` now emits
   `baseShellRules` (`*`, `::selection`, `:focus-visible`) into `theme.css` **and** spreads the same
   object into the fingerprint item — one definition, two outputs.

**One recipe bug the gate caught:** `.m-input/.m-textarea/.m-select:focus-visible` used
`outline-offset: 1px`; rule §11 says 2px. Fixed in `recipes.css`.

**Checks.** `assertConstraints` (both profiles): R2 shadow, R6 tabular, R7 hue count ≤ 4 and ≤ 1
primary fill / ≤ 5 % accent area per `[data-page]`, R8 icon+label, R10 heights ∈ {28,32,36}.
`assertStates` (full profile): hover must move exactly one surface step (or `primary → primary-hover`,
or transparent → surface-2) in ≤ 200 ms with no shadow and no transform; focus needs 2px ring at 2px
offset in `--ring`; disabled ≤ 0.55 opacity and not `cursor:pointer`; selected needs a tint ≤ 0.14 and
a 2px rule. Missing fixtures warn, so app sinks that have not adopted the hooks yet still run.

**Fixtures.** The kitchen sink gained a States block (hover/primary-hover/disabled/focus), a full-width
page composition with exactly one primary action, `data-status` on all four status badges, and a
hoverable table row. `sink` now reports `56 fixtures` (was 51).

**Selftest.** `fixtures/violations.html` breaks each rule once; `scripts/check-selftest.mjs` runs the
checker against it and asserts nine expected failures by message prefix. It caught a harness bug in
itself — `hover/` was the wrong prefix (`light/hover#0`) — which is the kind of thing the gate exists
to expose. Also: `spawnSync` deadlocks here (the child fetches from the parent's own HTTP server), so
the runner uses async `spawn`.

**Deliberate sequencing change:** the five app sinks did **not** get `data-state-*` hooks in this phase.
They need a running dev server to validate, and their CI is static-only; each app gets the hooks in its
own Phase 6 adoption commit, next to the shell change. `assertStates` warns (not fails) until then.

**Gate D, measured:**

```
conformance  check  green ✓ · 0 failures · 2 warnings · profile full   (selected fixture lands with AppShell)
selftest     9/9 checks fired as expected ✓
sink         4 runs · 56 fixtures · clean ✓
```

The two warnings are `no [data-state-selected] fixture` in each theme — by design until Phase 4 ships
`AppShell` with a selected nav row.

### rev 5 — Phase 4 (blocks), 2026-11-10

**Seven blocks, one shape each.** `app-shell` (sidebar / topbar / none), `hybrid-tooltip`,
`empty-state`, `stat`, `page-toolbar`, `time`, `copy-button`. The registry is 18 items and
`shadcn registry validate` passes.

**Why the shell takes `active` instead of `usePathname`.** swiparr and portal use `next/link`,
ai-router is Vite + React Router, Studio is Astro. A component that imports a router works in one of
them; `linkComponent` + `active` works in all four. The component is presentational, so it also
stays a server component.

**Typecheck was the pilot.** Each block was copied into the two apps that differ most and compiled
with their own tsconfig: messer-portal (Next, Radix) — 0 errors; messer-ai-router (Vite, Base UI) —
0 errors. Two real defects came out of that:

1. `HybridTooltipProvider` hardcoded `delayDuration={0}`. Base UI's provider has no such prop
   (`delay` / `timeout` instead) and the block did not compile. The provider now passes props
   through; the app sets its own timing.
2. ai-router already had a `hybrid-tooltip.tsx` (a Base UI port) that the dupes scan does not flag
   because it differs from the Radix pair. It tracks `matchMedia` changes — a tablet that gains a
   mouse flips pointer type mid-session — and the block now does the same.

**Repos were renamed mid-phase:** `server-portal` → `messer-portal`, `ai-router` →
`messer-ai-router`. `scripts/apps.json` and this plan were updated. `dupes.mjs` now **fails** when a
configured app path is missing (`--allow-missing` is the escape hatch) instead of skipping it: a
renamed repo would otherwise shrink the scan and keep CI green.

**Selected fixture.** The kitchen sink gained a fixture-only nav row mirroring `AppShell`'s geometry
(10% tint + 2 px rule), so the selected rule is exercised now; conformance is **0 failures ·
0 warnings**. `AppShell` also emits `data-state-selected` on its active row, so app sinks get the
fixture for free.

**Showcase.** A Blocks section (shell, stat, empty state, toolbar) at the real geometry, vision-checked.

**Gate E, measured:**

```
registry   ✔ Checked 1 registry file and 18 items
portal     tsc --noEmit  0 errors
ai-router  tsc -b        0 errors
conformance green · 0 failures · 0 warnings
selftest   9/9
```

**Not provable here:** `npx shadcn view jakobbjelver/messer-ui/app-shell` and `add --diff` read the
registry from GitHub, so they need the branch on main. That proof belongs to the release step; the
per-app install (portal's sink renders all seven) is Phase 6's adoption commit.

### rev 6 — Phase 5 (page recipes), 2026-11-10

**Six items, 24 total.** `auth-card`, `login-form`, `page-login` (`registry:page` →
`app/login/page.tsx`), `error-state`, `page-not-found` (`app/not-found.tsx`), `settings-section`.

**Rendered, not imagined.** The login page was mounted in messer-swipe (the renamed swiparr) at a
temporary `/login-preview` route, served by its own `next dev` with its own globals and fonts, and
screenshotted at 1280×900 and 390×844 in both themes, plus the failed-submit state. The route and the
middleware entry that made it public were removed afterwards; the worktree is clean.

**Measured contrast** (canvas-resolved tokens, card surface):

| Pair | Light | Dark |
|---|---|---|
| label `--text-3` on `--surface` | 5.02 | 5.34 |
| input text | 18.42 | 16.46 |
| **input border `--border-strong`** | **1.48** | **1.62** |

Labels pass AA; the field border does not pass the 3:1 non-text rule. It is a canon/token decision,
not a block defect: `--border-strong` is `#d4d4d4` / `#3a3a3a`. Two options, not chosen here —
add a `--border-field` token at ~#8f8f8f / ~#666666 used only by controls, or accept the hairline as
a known deviation. Changing it would visibly darken every input in every app.

**One defect found by looking:** the form's own error was plain red text with no icon (rule §8), and
`AuthCard` rendered a different alert row for its `error` prop. The form now renders the same row —
2px destructive rule, warning icon, text — so a failed sign-in looks the same wherever the message
comes from.

**Touch target:** controls stay 32px at 390px. The canon's control height is 32 and a taller mobile
variant would break the rhythm; recorded as a deliberate choice, not an oversight.

**Rename, again:** `swiparr` → `messer-swipe`. `apps.json` and this plan now point at the new path;
the scan is 287 `.tsx` across 5 apps again. The id stays `swiparr` because the dupe baseline and the
brand are keyed by product name, not repo name.

**Gate F, measured:**

```
registry   ✔ Checked 1 registry file and 24 items
tsc        messer-swipe: 0 errors in the new files
render     1280 / 390 × light / dark, error state — screenshots reviewed
contrast   labels 5.02 / 5.34; border 1.48 / 1.62 (open)
check      green · 0 failures · 0 warnings; selftest 9/9
```

**Not done here:** messer-swipe's real `/login` is signup + join + 2FA, so the recipe was not wired
into it — replacing that flow is a product decision for Phase 6, not a block decision.

### rev 7 — registry published, CI made honest, 2026-11-10

**Published.** `feat/v2-family-identity` was pushed and fast-forwarded to `main` (24 items). main was
a clean fast-forward, and the phase gates had already run.

**CI failed on main, correctly.** The mark step regenerates assets and diffs them. Every SVG and 32 px
icon matched; all five `og.png` cards differed, because the runner rasterises the 1200×630 card with
different font hinting. A gate that fails depending on the machine running it is a false gate, so
`og.png` is now generated but not hashed: `MARK_HASHED` excludes it, `brand:check` still requires all
five files to exist, and CI diffs `marks/` with `:(exclude)marks/*/og.png`. CI is green (ci and
Showcase image).

**Registry proof, from main:**

```
shadcn view jakobbjelver/messer-ui/app-shell   → item JSON with the file content embedded
shadcn add  jakobbjelver/messer-ui/app-shell   → Created 1 file: components/ui/app-shell.tsx (6792 bytes)
add ... --diff components/ui/app-shell.tsx     → only the two locally added lines, nothing else
```

The raw item URL alone did **not** work: without a registry base the CLI cannot resolve
`files[].path`, and it reports "No files updated" instead of an error. The GitHub shorthand resolves
file content through the index — that is the install path the docs must use.

**Still open:** the input-border contrast (1.48 / 1.62) awaits a decision; Phase 6 does not depend on it.

### rev 8 — Phase 6, portal adopted, 2026-11-10

**Installed, not copied.** `shadcn add jakobbjelver/messer-ui/app-shell` into `web/` — the registry
path from main. `navigation-bar.tsx` is deleted; the five nav items live in
`components/app-chrome.tsx`, the only client part of the layout (`usePathname` → `active`,
`linkComponent={Link}`).

**Two shell changes came from using it:**

1. `actions` slot — portal's theme toggle had been floating at `absolute right-4 top-2`; it now sits in
   the bar. Without the slot every app would need a second absolutely positioned element.
2. At 390px the wordmark, five items and the toggle crowded each other. The wordmark is now hidden
   below `sm`, the nav takes the free space and scrolls; the re-shot screenshot shows clear gaps.

**Marks and canon.** `marks/portal/*` → `web/public/res/`; `metadata.icons` points at `favicon.svg`
(any), `favicon-32.png` (32) and `apple-touch-icon.png`. Tokens were reinstalled with `install.mjs`,
so `styles/messer/theme.css` carries the 2.0.0 header and the check warning about it is gone.

**Measured:**

```
build      ✔ static export, 10 routes including /ui
eslint     0
check      green · 0 failures · 9 warnings (8 pre-existing + avatar circle)
screens    1280 / 768 / 390 × light, 1280 / 390 × dark — no page errors
```

The one warning this adoption added is `app-shell.tsx: rounded-full outside the whitelist` — the
avatar circle, which §1 allows; recorded as a dated deviation in portal's `MESSER.md`. The static scan
sees a class, not the element.

The local static export shows "Error loading configuration" in the content area: the page fetches
`/api/...`, which only exists behind the deployed Caddy route. Not a shell defect; the header and
footer render correctly around it.

**Not done:** portal has not been deployed, and the other four apps are untouched.
