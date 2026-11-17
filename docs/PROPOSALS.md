# Proposals — changing the canon from an app

The canon is written by building apps with it. This file is for the moment an app discovers that the
canon is wrong, silent, or impossible to satisfy — which is the useful moment, and the one most easily
wasted.

## What arrives from an app

Three kinds, and they are not the same change:

| What the app found | What it becomes | Where |
|---|---|---|
| The canon says something, and the app cannot comply | a **sentence** — sharper, narrower, or an explicit override precedent | `canon/rules.md` §17 |
| The canon is silent on a surface every app builds | a **block** (and usually a sentence that names it) | `registry/<name>/` + `canon/rules.md` |
| The canon is right and a machine could prove it | a **rule** in the gate | `scripts/check.mjs` + `scripts/check-selftest.mjs` |

A proposal that is only a sentence ("we should use less mono") will be declined. A proposal that shows
the failing surface, the count, and the shape that was hand-rolled instead can be merged the same day.

## What a proposal must contain

1. **The surface.** A file and a line, or a route and a screenshot. Not a feeling.
2. **The measured cost.** "R5 failed five assertions per page on three pages" is a proposal. "The labels
   feel heavy" is a conversation.
3. **Why the canon, not the app.** What makes this general: a second app would hit it by construction.
4. **The shape.** The markup, the props, the class names — enough to build the block from.
5. **The rule id**, if a static check can see it. If it cannot, say so; that is how it becomes a
   selftest or a judgement rule instead of a dead sentence.

## The mechanics

```bash
# 1. the rule
edit canon/rules.md                      # the sentence, in its section; a cross-reference to the app pattern

# 2. the block, if the rule has a shape
registry/<name>/<name>.tsx               # the component, tokens only, no hex, no radius
registry/<name>/registry-item.json       # shadcn item: files + target
edit scripts/build-registry.mjs          # the item list is hand-maintained; registry.json is generated

# 3. the gate, if it is static
edit scripts/check.mjs                   # fail() for a real defect, warns.push() for a smell
edit scripts/check-selftest.mjs          # prove it fires — a gate that cannot be shown failing is not a gate

# 4. ship it
npm version minor --no-git-tag-version
npm run build                            # registry.json + packages/css/*
npm run check                            # brand, build, sink, conformance, selftest

# 5. the apps that copy the canon
for app in …; do node scripts/install.mjs --app "$app" --brand <brand> --dir <dir>; done
node scripts/blocks.mjs                  # divergences: an installed copy that no longer matches
```

Step 5 is the one that is forgotten. `theme.css` carries the canon version in its header, and the gate
compares it to `package.json`: a bump without a re-install warns in every app. That warning is the
alarm, not noise.

## The three enforcement levels

- **Static** (`check.mjs --app`): imports, hex literals, `<select>`, radius, a control inside a
  `<label>`. Cheap, and it runs in CI on every app.
- **Runtime** (`check.mjs --url`, `app-conformance`): measured type, spacing, contrast, states, per route
  and per theme. Expensive, and it catches what markup cannot say.
- **Judgement** (canon prose): whether a page reads as an instrument. No check, and that is fine — but
  the sentence must be specific enough that two people would agree on a violation.

Put the rule at the cheapest level that can see it. A rule that needs a browser to catch a regex problem
makes the suite slow and the failure confusing.

## What the first full round taught

From a project that shipped a settings system, an installable surface and a public release in one pass:

- **A canon rule can be unsatisfiable in app chrome.** The meta-label recipe (mono caps) is right for
  eyebrows and table heads, and wrong for a form's field labels, which the canon already said were sat
  in prose. A UI built on the recipe drifted into using it for both. The fix was not to relax R5 — it was
  to add a sentence about *which* labels are meta (canon §5 now carries it, and a `form-field` block
  exists so the right shape is the easy one).
- **A block can block the shape a page needs.** `settings-section` rendered a save bar whenever it had an
  action, which made a page-level bar impossible — so the app hand-rolled the page. The block gained
  `bar={false}` and a `settings-page` block appeared. Lesson: a block that owns a *page* concern should
  accept that the page owns it.
- **A bug that only exists on a phone will not be caught by Chromium automation.** A `<button>` inside a
  `<label>` fired on any tap in the row; every desktop click looked right. That is now R16, static and
  proven by a throwaway fixture.
- **Registry blocks have no typecheck.** `blocks.mjs` compares installed copies; nothing compiles a block
  that no app has installed. New blocks were proven by copying them into an app and running `tsc` by
  hand. Until `npm run check` compiles the registry, treat a new block as untested.
- **Copies drift.** A one-line comment change in a block reached three apps and was then edited in one.
  The gate caught it, but only when someone ran `blocks.mjs` — run it after any install, not only before
  a release.

## Checklist

- [ ] The surface is named, with a file and a line.
- [ ] The cost is measured.
- [ ] The rule sits at the cheapest enforcement level that can see it.
- [ ] A block exists if the rule has a shape — and it compiles (copy it into an app and run `tsc`).
- [ ] The selftest proves a new static rule fires.
- [ ] `canon/rules.md` names the block or the standard section it pairs with.
- [ ] Version bumped, `npm run build` run, `npm run check` green.
- [ ] `install.mjs` run in every app; `blocks.mjs` reports no divergence.
