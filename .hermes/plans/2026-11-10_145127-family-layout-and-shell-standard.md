# Family layout standard + shell conformance — implementation plan

> **rev 2 — executed 2026-11-10 (Phase 0–3).** D1 = 1152/896/1440 with the 32px gutter; D4 = portal
> titles move to Golos h1; D6 = execute Phase 0–3 now. Status: canon §16 + tokens, app-shell 2.1,
> `page-container`, `theme-toggle`, the two new harness rules and the block-drift gate are in and
> green; portal, ai-router and messer.wtf adopt them. **Phase 4 (hygiene) not started** — see §12.
>
> **A concurrent session was committing in these repos throughout.** Its blanket `git add` swept my
> in-progress files into commits whose messages describe other work (`69dacc5`, `aaf5320`,
> `68e3ae8`), and it bumped `package.json` back to 2.0.2 mid-run; the real 2.1.0 bump is inside
> `aaf5320`. Nothing was lost, but the history under-describes these changes — read the file list,
> not the subject line. Everything below is committed under an accurate message.

**Goal:** give messer-ui a written and *enforced* layout rule (one page width, one gutter, one header
alignment, one theme button), promote the messer.wtf topbar patch into the registry, and close the
conformance gaps the audit found in portal, ai-router, the front door, Studio and swipe.

**Architecture:** the width becomes a canon token (`--shell`, `--page-pad` already exist and are dead
code today), a `PageContainer` block becomes the only way a page declares a width, `AppShell` gains a
`container` prop so the header row always lines up with the page's container, and `check.mjs` measures
the alignment in Playwright instead of trusting prose. Theme toggle becomes one registry block instead
of three hand-rolled copies.

**Stack:** React/shadcn (port 1), Tailwind v4, registry blocks, Playwright conformance harness.

---

## 1. What the audit measured

Read-only probes run 2026-11-10 (Playwright 1.64, Chromium headless, 390/768/1280/1440 × light/dark;
`node scripts/install.mjs` into `/tmp`; live containers on loopback).

| # | Surface | Finding | Evidence | Verdict |
|---|---|---|---|---|
| A1 | ai-router | **Header mark exists** (Phosphor `ArrowsSplit`, 20 px, next to the wordmark) — the "missing logo" is the **browser tab / share card**: every declared icon 404s | `curl -s -o /dev/null -w '%{http_code}' 127.0.0.1:18905/favicon.svg` → `404` (also `favicon-32.png`, `apple-touch-icon.png`, `og.png`); files are present in `/app/packages/dashboard/dist` | real bug |
| A2 | ai-router | Static serving routes only `/` and `/assets/*`, and `notFound` answers JSON — icons and `ui.html` unreachable in the image | `packages/server/src/index.ts:15-18`, `:25-27` | real bug |
| A3 | all 5 apps | `theme.css` stamp is canon **2.0.0** vs package **2.0.1** | `check --static` warning on portal, ai-router, swipe, messer, request-games; `install.mjs` into `/tmp` diffs only the header comment | cosmetic (re-run install) |
| A4 | portal, ai-router, messer | **app-shell copies are stale** — missing the 2.0.1 actions row | `diff -u registry/app-shell/app-shell.tsx <app copy>` shows only the removed `{actions}` block | real drift, no gate |
| A5 | messer (front door) | **4 local deltas** on the block: constrained header row, `transition-[background-color,color]` instead of `transition-colors`, actions row removed, `data-avatar` on the avatar | same diff | registry bug (promote) |
| A6 | portal, ai-router, swipe, messer, request-games | `rounded-full outside the whitelist` fires on `app-shell.tsx` — the **legal avatar** | `scripts/check.mjs:298` matches the filename against `/avatar\|scroll-area\|slider/` | check bug |
| A7 | site (Studio) | static pass walks build output: **197 warnings** from `.studio/dist-*` | `check --static --app ~/Repos/site` | check bug + no gate in that repo |
| A8 | site | no `messer-ui.yml` workflow in `~/Repos/site` or `~/Repos/messer` — two surfaces have **no conformance gate at all** | `.github/workflows/` listing | real gap |
| A9 | messer-ui | `apps.json` lists `studio` with `shell: topbar`; site has **no AppShell** (Studio is an overlay). The front door is **absent** from `apps.json`, has **no `brand/messer.json`**, yet ships a generated `brand.css` | `grep -rn AppShell ~/Repos/site/src` → nothing; `ls brand/` | metadata gap |
| A10 | portal | page titles are `<h1 class="… font-mono uppercase">` — **10 of 12 h1s**; canon R3 says mono never rises above h3 | `grep -rn '<h1' web/app web/components` | R3 violation, unenforced |
| A11 | ai-router | **no h1 at all** on the dashboard; `page-header` block is installed but unused by any app | `grep -n '<h1' packages/dashboard/src/App.tsx` → none | a11y + adoption gap |
| A12 | ai-router | no pre-paint theme script in `index.html`; storage key `ai-router-theme` | `packages/dashboard/index.html` | flash + key drift |
| A13 | portal | theme storage key is next-themes' default `theme` | `ThemeProvider` in `web/app/layout.tsx` | key drift |
| A14 | portal | one screen carries **three widths**: container 1152, an inner `max-w-5xl` 1024 "Dashboard" bar, footer 896 | measured at 1440: left 144 / 208 / 272 | real, visible |
| A15 | ai-router vs portal | content box differs on a laptop: page gutter 12→24 px vs 16 px (8 px offset at 1440); vertical `py-5 sm:py-8` vs `py-6 md:py-10`; home is 896 vs 1152 | measured: portal 6xl `left 144`, ai-router `left 168` | real, visible |
| A16 | canon | **no layout rule exists.** `canon/tokens.json` declares `size.shell = 1200px` and `size.page = 32px`, emitted as `--shell` / `--page-pad` — **zero consumers in any repo**; `canon/rules.md` has no §on width | `grep -rn -- '--shell\|--page-pad'` over every app's *source* → no hits | root cause of A14/A15 |
| A17 | swipe | shell `none` by design (immersive deck); theme lives in Settings → General, no header | `apps.json`, `GeneralSettings.tsx` | acceptable per §14, document it |
| A18 | request-games | widths 1152 / 1024 / 896 / 768 / 672 with a uniform 24 px gutter | grep of `web/app/src/pages` | WIP — out of scope |

**Answer to "does AI Router have no logo?"** — it has a header mark and always did in the current
build (`ArrowsSplit`, 20 px, rendered and legible at 32 px crop). The *tab* icon is missing, and that
is a real server bug: A2.

## 2. The standard this plan introduces (canon §16)

Three container stops, exactly like the three control heights — a page picks one, never a raw `max-w-*`:

| stop | width | use |
|---|---|---|
| `default` | `--shell` = **1152px** | every app screen and dashboard (today's portal/ai-router width, so no visual regression) |
| `narrow` | `--shell-narrow` = **896px** | single-column reading/forms (login, settings, portal home hub) |
| `wide` | `--shell-wide` = **1440px** | data tables / boards only |

- Gutter: `--page-pad` = **32px** at `md+`, **16px** below (`px-4 md:px-8`), for every stop.
- Vertical rhythm: `py-6 md:py-10` on the page block.
- Body copy inside any stop: `max-w-[72ch]`.
- **The topbar's inner row uses the same stop and gutter as the page it decorates; the bar's border
  still spans the viewport.** AppShell takes `container` and both header and content read it from the
  same place, so they cannot drift.
- One width per screen. A nested, narrower block (portal's 1024 px "Dashboard" strip) is a bug.

If the user prefers 1200 or 1080 the only numbers that change are `size.shell` / `size.shell-narrow`
in `canon/tokens.json` — see Decisions.

---

## 3. Decisions (answered by the user, 2026-11-10)

| # | Question | Answer — as executed |
|---|---|---|
| D1 | Page width | **`default` 1152, `narrow` 896, `wide` 1440**, gutter 32 at `md+` / 16 below |
| D2 | Front door | adopts the same stops; its 1080/20 measure became 1152/16-32 |
| D3 | Theme button | portal's outlined 32 px control, promoted to the `theme-toggle` block and used by all three apps |
| D4 | Portal page titles | **fixed** — 10 mono-uppercase h1s became Golos h1s (the `PageHeader` block was not forced on the centred-title layout) |
| D5 | Theme storage key | `messer-theme` in ai-router and the front door; portal still uses next-themes' default (`theme`) — **left open**, see §12 |
| D6 | Execution scope | Phase 0–3 executed; Phase 4 hygiene deferred |

---

## 4. Phase 0 — canon (§16 + tokens)

### Task 0.1 — add the three widths to the canon

**Files:** `canon/tokens.json`

```jsonc
"size": {
  // …
  "shell":        { "$value": "1152px" },   // was 1200px — no consumer existed
  "shell-narrow": { "$value": "896px" },
  "shell-wide":   { "$value": "1440px" },
  "page":         { "$value": "32px" }      // unchanged; becomes the md+ gutter
}
```

**Files:** `scripts/build-registry.mjs` — extend `baseVars()`, next to `--page-pad`/`--shell` (line ~84):

```js
"--shell": tokens.size.shell.$value,
"--shell-narrow": tokens.size["shell-narrow"].$value,
"--shell-wide": tokens.size["shell-wide"].$value,
"--page-pad": tokens.size.page.$value,
```

**Gate:** `npm run build && npm run assert:config && grep -E -- '--shell(-narrow|-wide)?:' packages/css/theme.css`
Expected: three lines, `1152px`, `896px`, `1440px`.

### Task 0.2 — write §16 into `canon/rules.md`

Add after §10 (before `# 11. States`), as a numbered rule so it is peer to the control heights:

```md
## 11. One page width, and the header sits in it
A page uses one of three container stops — `default` (`--shell`), `narrow` (`--shell-narrow`),
`wide` (`--shell-wide`) — with `--page-pad` as its gutter (`16px` below `md`, `32px` above) and
`py-6 md:py-10` vertical rhythm. Never a hand-written `max-w-*` on a page wrapper, and never two
widths on one screen. The topbar's inner row is constrained to the same stop as the page's
container; the bar's border still spans the viewport. Body copy inside any stop caps at `72ch`.
```

Renumber the following sections (11→12 … 15→16) **in the same commit** and update `states.json`'
`$comment` if it cites a number; the skill and `canon/rules.md` must agree on the heading numbers
(the v2 release shipped a `§14` reference with no `## 14` heading — do not repeat that).

**Gate:** `grep -c '^## ' canon/rules.md` returns the same count as before +1; `grep -n 'One page width' canon/rules.md` hits.

---

## 5. Phase 1 — blocks

### Task 1.1 — `app-shell` 2.1.0 (promote the front-door patch)

**File:** `registry/app-shell/app-shell.tsx`

1. New prop `container?: "default" | "narrow" | "wide" | "none"` (default `"default"`), resolved to a class:

```tsx
const CONTAINER: Record<string, string> = {
  default: "max-w-[var(--shell)]",
  narrow: "max-w-[var(--shell-narrow)]",
  wide: "max-w-[var(--shell-wide)]",
  none: "",
};
```

2. Topbar: keep `h-12 border-b` on `<header>`; move the flex row into a wrapper:

```tsx
<header className={["h-12 shrink-0 border-b border-border bg-[var(--surface)]", variant === "sidebar" ? "md:hidden" : ""].join(" ")}>
  <div className={`mx-auto flex h-full w-full items-center gap-3 px-4 sm:gap-6 md:px-8 ${CONTAINER[container]}`.trim()}>
    {/* brand, nav, actions */}
  </div>
</header>
```

3. Sidebar variant: the aside keeps its 240 px width; the brand block's horizontal padding becomes
   `px-4 md:px-5` so the wordmark still lines up with a `default` container's gutter at `md`.
4. `rowBase` / nav rows: `transition-colors` → `transition-[background-color,color]` (the pitfall:
   `transition-colors` animates `outline-color`, so the focus ring fades in from `currentColor`).
5. Avatar span gets `data-avatar` (lets the harness whitelist the one legal circle).
6. **Keep** the actions row in the sidebar (2.0.1 fix). The front door deleted it because it passes
   `actions` only in the topbar; that deletion is the local patch, not an upstream fix.

Bump `registry/app-shell/registry-item.json` `version` to `2.1.0` and `package.json` to `2.1.0`.

**Prove on both bases:** copy into `messer-portal/web/components/ui/app-shell.tsx` and
`messer-ai-router/packages/dashboard/src/components/ui/app-shell.tsx`, run `tsc --noEmit` (portal) and
`tsc -b --force` (ai-router), grep for the filename. Restore with `git checkout -- <path>` after the
pilot; `git status --short` before you start.

### Task 1.2 — new block `page-container`

**Files:** `registry/page-container/page-container.tsx`, `registry/page-container/registry-item.json`

```tsx
import type { ReactNode } from "react";

const CONTAINER = {
  default: "max-w-[var(--shell)]",
  narrow: "max-w-[var(--shell-narrow)]",
  wide: "max-w-[var(--shell-wide)]",
} as const;

export function PageContainer({
  size = "default",
  className,
  children,
}: {
  size?: keyof typeof CONTAINER;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mx-auto w-full px-4 md:px-8 ${CONTAINER[size]} ${className ?? ""}`.trim()}>
      {children}
    </div>
  );
}
```

No `cn`, no framework import (registry rule). Register it in `registry.json` via `npm run build`.

**Gate:** `node scripts/validate.mjs` (or `npx shadcn@latest view jakobbjelver/messer-ui/page-container` after push) resolves the item and lists one file.

### Task 1.3 — new block `theme-toggle`

Reference rendering is **portal's**, the user's explicit choice: outlined 32 px icon button,
sun/moon cross-fade, no colour change on hover beyond the surface step.

**Files:** `registry/theme-toggle/theme-toggle.tsx`, `registry/theme-toggle/registry-item.json`

```tsx
import { Moon, Sun } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button"; // or the app's local button, passed in

export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <Button variant="outline" size="icon" onClick={onToggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}>
      <Sun className="size-[1.2rem] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

Presentational on purpose (`dark` + `onToggle`): next-themes and the Vite apps each keep their 20-line
theme hook, but every app renders identical geometry. The block must **not** import `next-themes`.
`registry-item.json` declares `registryDependencies: ["…/button"]`? **No** — never make `badge`/`button`
a registry dependency (it prompts to overwrite the app's own). Document the requirement in the item's
`description` instead.

**Gate:** rendered on `ui.messer.wtf` (showcase) in both themes; 32×32, border 1 px `--border`,
radius 0, focus ring 2 px `--ring` at 2 px offset.

---

## 6. Phase 2 — harness (make the rules measurable)

### Task 2.1 — `check.mjs` fixes

**File:** `scripts/check.mjs`

1. **Exclude build output** from the static walk: skip `dist/`, `out/`, `.next/`, `.studio/`,
   `build/`, `node_modules/` (A7 → 197 warnings to 0).
2. **rounded-full whitelist by marker, not filename** (A6): allow when the file contains `data-avatar`
   or the class is on a node carrying `data-avatar`; keep the filename heuristic for
   `scroll-area`/`slider`.
3. **New static rule:** a page wrapper carrying `max-w-(2xl|3xl|4xl|5xl|6xl|\[…)` outside
   `components/ui/**` is a failure (forces `PageContainer`). Warn during migration, fail after Phase 5.
4. **New browser probe (conformance):** on the sink, assert
   `header > div` width === `main > [data-page-container]` width at 1280 and container left edges
   are equal within 1 px. Add a `data-container` fixture to the kitchen sink and a violation to
   `fixtures/violations.html` + a row in `check-selftest.mjs` (a check that cannot be shown failing is
   not a check).
5. **New browser probe:** every `h1` computes `font-family` containing Golos and is not
   `text-transform: uppercase` on a mono face (R3, A10/A11). Fixture + violation + selftest row.
6. **Block-drift gate (new script `scripts/blocks.mjs`):** for every app in `apps.json`, hash each
   installed registry block against `registry/<item>` and exit 1 on a mismatch, printing the diverging
   lines (`shadcn add … --diff` semantics without the network). Wire into each `messer-ui.yml`.
   *This is the gate that would have caught A4/A5.*

**Gate:** `npm run check` green; `node scripts/check.mjs --app ~/Repos/site --static` → `0 warnings`
(build dirs ignored); `node scripts/blocks.mjs` → reports `portal: app-shell differs` **before** the
app tasks, `all blocks match` after them.

---

## 7. Phase 3 — apps

### Task 3.1 — portal

**Files:** `web/components/app-chrome.tsx`, `web/app/layout.tsx`, every `web/app/**/page.tsx`,
`web/components/theme-toggle.tsx`, `web/components/ui/app-shell.tsx`, `web/components/ui/page-container.tsx`.

1. `<AppShell container="default" … actions={<ThemeToggle dark={…} onToggle={…} />}>`; wrap the
   `children` block in `PageContainer size="default"`.
2. Replace every page wrapper `mx-auto max-w-6xl px-4 py-6 md:py-10` with
   `<PageContainer className="py-6 md:py-10">`; home → `size="narrow"`; delete the nested
   `max-w-5xl` "Dashboard" strip (A14) and make the build footer share the page container.
3. `ThemeToggle` → the block; `next-themes` `storageKey="messer-theme"` (D5).
4. Page titles → `PageHeader` (Golos h1) for the 10 mono ones (D4).
5. Re-run `node ~/Repos/messer-ui/scripts/install.mjs --app . --brand portal --dir web/styles/messer`
   for the 2.0.1 → 2.1.0 stamp (A3).

**Gate:** `node ~/Repos/messer-ui/scripts/check.mjs --app . --url http://127.0.0.1:8888/ui` green;
`node ~/Repos/messer-ui/scripts/blocks.mjs` all match; measured at 1440: header row and page content
left edges equal (144), container 1152.

### Task 3.2 — ai-router

**Files:** `packages/server/src/index.ts`, `packages/dashboard/index.html`,
`packages/dashboard/src/main.tsx`, `src/App.tsx`, `src/components/ThemeToggle.tsx`,
`src/components/ui/{app-shell,page-container,theme-toggle}.tsx`, `src/styles/messer/*`.

1. **A1/A2 fix:** serve the dashboard directory's top-level files, not just `/` and `/assets/*`:

```ts
if (config.dashboardDir) {
  router.app.get("/", serveStatic({ root: config.dashboardDir, index: "index.html" }));
  router.app.get("/assets/*", serveStatic({ root: config.dashboardDir }));
  router.app.get("/favicon.svg", serveStatic({ root: config.dashboardDir }));
  router.app.get("/favicon-dark.svg", serveStatic({ root: config.dashboardDir }));
  router.app.get("/favicon-32.png", serveStatic({ root: config.dashboardDir }));
  router.app.get("/apple-touch-icon.png", serveStatic({ root: config.dashboardDir }));
  router.app.get("/og.png", serveStatic({ root: config.dashboardDir }));
}
```

   (Explicit paths, not a catch-all: the router owns `/v1/*` and must keep answering 404 JSON for
   unknown API paths.) Add `<link rel="icon" media="(prefers-color-scheme: dark)" href="/favicon-dark.svg">`.
2. Pre-paint theme script in `index.html` reading `localStorage["messer-theme"]`, same block as the
   front door; `ThemeToggle` keeps its own hook but the key becomes `messer-theme` (D5).
3. `AppShell container="default"`, `<PageContainer>` around `App`'s content, drop the hand-written
   `mx-auto max-w-6xl px-3 …` (A15).
4. Add a `PageHeader` for the dashboard title (A11) — eyebrow `AI ROUTER`, h1 in Golos.
5. install.mjs re-run for the stamp.

**Gate:** `curl -s -o /dev/null -w '%{http_code}' 127.0.0.1:18905/favicon.svg` → `200` for all five
icon paths; `curl 127.0.0.1:18905/v1/models -H 'Authorization: Bearer …'` still answers; `check --app . //ui` green; blocks match.

### Task 3.3 — messer.wtf front door

**Files:** `src/components/ui/app-shell.tsx` (delete → registry copy), `src/components/ui/page-container.tsx`,
`src/components/ui/theme-toggle.tsx`, `src/App.tsx`, `src/theme.ts`, `src/pages/Ui.tsx`, `MESSER.md`.

1. Replace the local `app-shell.tsx` with the registry 2.1.0 copy (`container="default"`); the local
   patch row in `MESSER.md` is deleted once the installed file is byte-identical to the registry.
2. `MAX = "mx-auto w-full max-w-[1080px] px-5 sm:px-8"` → `<PageContainer>` (1152 per D1/D2), header
   follows through the `container` prop; section rules and the 96 px specimen keep their own widths.
3. `ThemeToggle` → block (borderless 32 px becomes outlined 32 px, per D3).
4. `canon/tokens` change means re-running `install.mjs --brand messer` — which requires
   `brand/messer.json` (Task 4.1).

**Gate:** `check --app . --url http://localhost:5173/ui` green; 1440 screenshot shows wordmark x =
content x; `node scripts/blocks.mjs` all match.

---

## 8. Phase 4 — hygiene

### Task 4.1 — bring the front door into the canon
- Create `brand/messer.json` (`project: messer`, `title: messer`, `mark.glyph: knife`, neutral accent
  `oklch(.30 .008 260)` / `oklch(.92 .004 260)` — copy the values already in the repo's generated
  `brand.css`), `npm run build && npm run marks`, add `messer` to `scripts/apps.json`.
- Copy `marks/messer/*` into `~/Repos/messer/public/` and reference them in `index.html`.
- Add the `messer-ui conformance` workflow (copy ai-router's `.github/workflows/messer-ui.yml`).

### Task 4.2 — Studio + swipe metadata
- `apps.json`: `studio.shell` → `"none"` (overlay) — or drop the field; record the overlay rule in
  canon §14 if it is not there ("Studio mounts as an island inside the site; no shell, no topbar").
- swipe: note in §14 that an immersive `variant="none"` app carries the theme control in its settings
  surface instead of `actions`.
- Add `messer-ui.yml` to `~/Repos/site`.

### Task 4.3 — README/AGENTS pointers
- `messer-ui` skill: add §16 to the ten-rule summary, add `page-container` + `theme-toggle` to the
  blocks table, and the new pitfalls (A2 static routes, A6 marker whitelist, A16 dead tokens).
- Each app's `MESSER.md`: one row for the container stop it uses.

### Task 4.4 — request-games (after it leaves WIP)
Adopt `PageContainer` + `AppShell container="default"`; its five widths collapse to two stops.

---

## 9. Validation (whole change)

```bash
cd ~/Repos/messer-ui && npm run check          # brand + build + sink + conformance + selftest
node scripts/check.mjs --app ~/Repos/messer-portal --url http://127.0.0.1:8888/ui
node scripts/check.mjs --app ~/Repos/messer-ai-router --url http://localhost:5173/ui.html
node scripts/check.mjs --app ~/Repos/messer --url http://localhost:5173/ui
node scripts/blocks.mjs --all                 # every installed block byte-identical
npm run sheet                                 # contact sheet: portal + ai-router tiles
```

Acceptance, measured not eyeballed (1440 × 900, both themes):

1. header row left edge === page container left edge, |Δ| ≤ 1 px, in portal, ai-router, messer;
2. page container width === 1152 in the three apps' default screens (896 on portal home);
3. theme button: 32×32, 1 px `--border`, radius 0, identical computed background in all three;
4. `curl` on `/favicon.svg`, `/favicon-32.png`, `/apple-touch-icon.png`, `/og.png` → 200 in the
   ai-router image;
5. `check --static` on site → 0 warnings;
6. `blocks.mjs` → no divergence; reverting one line in a copied block makes it fail (prove it).

## 10. Risks

- **Width change is visible.** 1152 + 32 px gutter narrows portal's content by 16 px per side and
  widens ai-router's padding. Both apps need a screenshot pass at 1280/1440 before deploy.
- **Portal's mono h1 → Golos h1** changes every page title's look; if the mono titles are wanted,
  that is D4's fallback (an explicit §14 exception) rather than a silent revert.
- **`check.mjs` new failures** will turn four green CIs red at once. Land Phase 2 with the new rules as
  *warnings*, flip to failures per app as Phase 3 completes.
- **Portal is Next + a running DB**; the conformance run needs its dev server, not the container.
- **Registry publishing:** blocks install by name from `main` — merge before any app can
  `shadcn add`; otherwise Task 3.x silently uses the old item.

## 11. Execution record (rev 2)

Gates run on the tree as committed, not paraphrased:

```
messer-ui    npm run check      → check green ✓ 0 failures 0 warnings · selftest 11/11
messer-ui    npm run blocks     → blocks 22/26 installed copies identical · 4 declared deviation/wip (exit 0)
portal       tsc --noEmit       → exit 0
portal       check --app … --url localhost:3000/ui   → green ✓ 0 failures · 19 warnings (pre-existing)
ai-router    npm run typecheck  → exit 0
ai-router    check --url localhost:5173/ui.html      → green ✓ 0 failures · 25 warnings (pre-existing)
ai-router    curl icons         → /favicon.svg 200 image/svg+xml · /favicon-32.png 200 · /apple-touch-icon.png 200 · /og.png 200 · /favicon-dark.svg 200
messer       tsc -b --force     → exit 0
messer       check --url localhost:5180/ui           → green ✓ 0 failures · 1 warning (theme-color hex in index.html)
```

Measured geometry at 1440×900 (Playwright, both themes): header row and page container are both
`left 144 / width 1152 / padding 32` in portal, ai-router and messer.wtf; the wordmark and the first
content child both land on `x 176`. Theme control in all three: `32×32`, `1px` border, radius `0`,
`aria-label` present, surface background that follows the theme.

Commits (each staged by path; a co-session's blanket adds also carried some of this work into
`69dacc5`, `aaf5320`, `68e3ae8`):

| repo | commit | what |
|---|---|---|
| messer-ui | `aaf5320` | canon 2.1.0 (tokens `--shell*`, §16 in `rules.md`) |
| messer-ui | `6407e28` | harness: §16 + R3 probes survive real apps; tab-track and bottom-rule fixes |
| messer-ui | (swept) | `app-shell` 2.1, `page-container`, `theme-toggle`, `blocks.mjs`, `apps.json`, `brand/messer.json` |
| messer-portal | `cf99e9e` | container contract, theme block, Golos h1s |
| messer-ai-router | `dabcd74` | header in the box, PageHeader, icons served, pre-paint theme |
| messer | `d7784bc` | local header patch deleted, measure 1152, theme block |
| messer-swipe | `45a6ec5` | hybrid-tooltip + page-header from the registry |

## 12. Still open

1. **Phase 4 hygiene** — `messer-ui.yml` is missing in `~/Repos/site` and `~/Repos/messer`; Studio's
   `apps.json` shell is now corrected to `none` but canon §14 does not yet *say* an overlay carries no
   shell; `marks/messer/*` are not copied into the front door's `public/` by a script.
2. **D5 storage key** — portal still stores under next-themes' default `theme`; switching it to
   `messer-theme` resets every user's choice once.
3. **PageHeader adoption in portal** — page titles are Golos now but six screens still hand-roll the
   centred-title-with-floating-actions bar; folding that shape into `PageHeader` is a design change,
   not a typo fix.
4. **request-games** stays WIP: it is reported by `blocks.mjs` but not gated (`wip: true`).
