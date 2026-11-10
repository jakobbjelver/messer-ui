# The ten rules

The fingerprint. A project may look like itself; it may not look like a different family. Anything a
project is allowed to choose is listed under §14. Everything here is fixed.

## 1. Square corners

`border-radius: 0` on every surface, control, chip, panel and overlay. The whitelist is short and
exhaustive: avatars, status dots, slider thumbs, and the dot on a toggle. There is no "slightly
rounded" — the scale is zeroed, so `rounded-lg` and `var(--radius)` both resolve to 0.

*Forbids:* pills, lozenges, rounded cards, rounded inputs, rounded badges, "soft" anything.

## 2. Hairline borders, no depth except overlays

1px `--border` separates things. Shadows exist only for things that float above the page: dialog,
drawer, popover, dropdown, tooltip (`--shadow-pop`). No gradients, no glass, no backdrop-filter except
an overlay scrim.

*Forbids:* `shadow-sm` on cards, neumorphism, glow, coloured borders as emphasis (use weight,
placement or an icon instead).

## 3. Mono is the machine voice

JetBrains Mono for h3–h6, labels, numbers, IDs, timestamps, table headers, code, keyboard hints.
Machine-generated or machine-consumed text is monospaced; that is how a glance tells data from prose.

## 4. Golos is the human voice

Golos Text for h1–h2, body copy, buttons, form values, descriptions, empty states. If a human writes
it or reads it as language, it is Golos.

Golos has **no italic** (variable 400–900). Do not use `<em>` in UI copy; use weight or a leading
marker. Heading voices are applied globally in `messer.base`, not per component:

```css
h1, h2 { font-family: var(--font-sans); letter-spacing: -.02em }
h3, h4, h5, h6 { font-family: var(--font-mono) }
```

## 5. One label style — for meta, not for fields

**Meta label:** 10.5px mono, uppercase, `letter-spacing: .1em`, weight 500, `--text-3`. Used for
section eyebrows, table headers, stat captions, column heads, breadcrumbs. There is exactly one of
these — no second size, no sentence-case variant.

**Field label:** sentence-case sans, 14px/500, `--text`. A field label is read immediately before
typing, so it stays in the human voice and keeps its case; all-caps there measurably slows scanning
and shouts in a form with a dozen rows.

The distinction is the rule: *meta* text is mono-caps, *form* text is prose. Both are fixed — a
project may not invent a third label style.

## 6. Tabular numbers

`font-variant-numeric: tabular-nums` on all data text, and right-alignment for numeric table columns.
Numbers that do not line up are a bug, not a preference.

## 7. One accent per project

Exactly one accent, supplied by `brand-<project>`. Everything else is neutral. The accent is used
for: primary action, active nav, focus ring, selection, the "current" state, chart series 1.
It is not used for: status, decoration, headings, large backgrounds, or a second brand colour.

If you need a second colour you need either a status colour (§8) or a neutral step.

## 8. Status is icon + label

Success, warning, danger and info always render as an icon **and** a word. Colour reinforces; it never
carries the meaning alone. This is why an accent may sit near a status hue without breaking anything
(request-games' green is 5° from success — allowed, because status is never colour-only).

Status hues are fixed and independent of the accent: danger 25°, warning 75°, success 150°.

## 9. Phosphor icons

`@phosphor-icons/react` (port 1) or the generated SVG sprite (port 2), `weight="regular"`,
`currentColor`, 16px default, 14px in compact rows, 20px in navigation. No mixing icon families, no
filled/duotone as decoration, no emoji as icons.

**One declared exception: `messer-swipe` uses Lucide.** The product is a poster deck — its own mark
is a Lucide glyph, and the family's stroke weight reads as one voice with it where Phosphor's solid
weight competes with artwork. The exception is declared once, per app, in `scripts/apps.json`
(`iconFamily: "lucide"`); it is not a precedent and it does not travel to another brand. `check`
enforces it in both directions, so the app cannot drift back to a mixed set.

| Lucide | Phosphor | | Lucide | Phosphor |
|---|---|---|---|---|
| `Trash2` | `Trash` | | `Loader2` | `CircleNotch` |
| `Settings` | `Gear` | | `RefreshCw` | `ArrowsClockwise` |
| `Search` | `MagnifyingGlass` | | `Check` | `Check` |
| `X` | `X` | | `Plus` | `Plus` |
| `AlertTriangle` | `Warning` | | `ChevronDown` | `CaretDown` |
| `Cloud` | `Cloud` | | `Save` | `FloppyDisk` |
| `Sun` / `Moon` | `Sun` / `Moon` | | `MoreHorizontal` | `DotsThree` |
| `Play` / `Pause` | `Play` / `Pause` | | `ExternalLink` | `ArrowSquareOut` |
| `ChevronRight` | `CaretRight` | | `Circle` | `Circle` |
| `Clock` | `Clock` | | `Calendar` | `CalendarBlank` |
| `Download` | `DownloadSimple` | | `Upload` | `UploadSimple` |
| `Info` | `Info` | | `LogOut` | `SignOut` |
| `ArrowUpDown` | `ArrowsDownUp` | | `Filter` | `Funnel` |
| `Menu` | `List` | | `Home` | `House` |
| `User` | `User` | | `Users` | `Users` |
| `Eye` / `EyeOff` | `Eye` / `EyeSlash` | | `Copy` | `Copy` |
| `Link` | `Link` | | `Lock` | `Lock` |
| `Star` | `Star` | | `Heart` | `Heart` |
| `Music` | `MusicNotes` | | `Film` | `FilmStrip` |
| `Image` | `Image` | | `File` | `File` |
| `Folder` | `Folder` | | `Server` | `HardDrives` |
| `Zap` | `Lightning` | | `Wifi` | `WifiHigh` |
| `Volume2` | `SpeakerHigh` | | `VolumeX` | `SpeakerSlash` |

Extend the table when you hit a new icon; do not invent a second family.

## 10. Three control heights

28 (`sm`) / 32 (default) / 36 (`lg`). Row heights 32 (`row-sm`) / 36 (`row`). Density is chosen per
surface from these three values — not by inventing a fourth height or by scaling padding ad hoc.

Toggles sit outside the scale: a switch is an 18 px track (32 px wide), a checkbox 16 px, in every
port. They are geometry, not density, and `check` excludes `role=switch|checkbox|radio|slider` from
the control-height sweep.

Width is not density — the page's measure and gutter live in §16.

---

# 11. States

Rules 1–10 fix how a surface *looks at rest*. These fix what it does when touched. Every port measures
them; `canon/states.json` is the machine copy of this table.

| State | Spec |
|---|---|
| hover | exactly one surface step (`surface` → `surface-2`), `--dur-fast` (120 ms), no shadow, no scale, no movement. **Only on an element that is clickable — hover is a promise.** |
| focus-visible | 2 px `--ring`, 2 px offset, square. Never removed, never replaced by a border. |
| active | the hover step. No press animation, no transform, no colour change. |
| selected | 8–10 % accent tint + a 2 px accent rule (left in a sidebar, bottom in a topbar). Never a filled accent row. |
| disabled | text at 40–50 % opacity, no hover state, `aria-disabled` — not `pointer-events: none`, so it stays focusable and announced. |
| loading | skeleton for content, spinner for an action. Never both in one region. |

Transitions use `--dur-fast` and `--ease`; only `background-color`, `border-color`, `color`, `opacity`
and `transform` may animate. `prefers-reduced-motion: reduce` removes all of it. A hover that changes
layout is a bug, not a flourish.

# 12. Copy

The system does not own a voice, but it owns the small words that appear in every app.

- **Verbs.** `Save`, `Cancel`, `Delete`, `Create`, `Retry`. Not `Update` for a save, not `Apply`, not
  `Submit`, not `OK` in a destructive dialog.
- **Empty state.** What this is, why it is empty, one action. No illustration required.
- **Error.** What happened, then what to do. No blame, no "Oops", no exclamation marks.
- **Confirmation.** Name the object and the count — "Delete 3 requests?", never "Are you sure?".
- **Dates and numbers.** Absolute date in `title`, relative in the label; numbers are tabular (rule 6).
- **Case.** Sentence case everywhere except the meta label (rule 5).

# 13. The mark

Every project has one mark, generated from its brand file — never drawn by hand.

- Square, monochrome: an ink box with a paper glyph. The box is `--foreground`, the glyph is
  `--background`; inverted for dark surfaces.
- Glyph = 75 % of the box (24 px in 32, 48 px in 64), centred. The mark is a silhouette: Phosphor
  **`fill`**, or Lucide **`stroke`** at the app's declared icon family (§9). Rule 9's UI weight is
  not the mark's weight.
- Never the accent (rule 7: the accent is a signal, not decoration), never a gradient, never rounded.
- One glyph per project, chosen in `brand/<project>.json`. `npm run marks` emits favicon, dark
  favicon, apple-touch icon, OG image and a hash manifest; `brand:check` fails when they are stale.

The mark is the only place a project's identity may be a picture. Everything else is type, space and
one accent.

# 14. What a project may choose

| Variable | Fixed | Chosen |
|---|---|---|
| Type families | ✓ Golos + JetBrains Mono | |
| Corner radius | ✓ 0 | |
| Icon family | ✓ Phosphor (declared exception: `messer-swipe` → Lucide, §9) | |
| Label style, density, motion | ✓ | |
| Accent hue | | ✓ `brand-<project>.json` |
| Chart ramp | derived from the accent | ✓ derived |
| Logo, illustration, imagery | | ✓ must read as a mark, not a UI colour |
| Layout, shell, navigation shape | | ✓ within §1–§10 |
| Copy voice | | ✓ (this is not a voice-and-tone system) |

## 11. Interaction states

- **Hover** is one surface step (`--surface` → `--surface-2`), 120 ms, no shadow and no movement. Only
  on things that are clickable.
- **Focus-visible** is a 2 px `--ring` outline at 2 px offset, radius 0.
- **Active** is the hover step; it adds nothing.
- **Selected** is an 8–10% accent tint plus a 2 px accent rule (left in a sidebar, bottom in a topbar).
  Never a filled accent row.
- **Disabled** is 40–50% text with `aria-disabled`; not `pointer-events: none` (that hides the reason
  from keyboards and screen readers).
- **Loading**: a skeleton only where the layout's shape is known; a control shows a spinner at its own
  size. No skeleton cards in app pages.

## 12. Copy

- Sentence case for humans, mono caps for machine labels.
- Errors say what happened and what to do next. Auth never enumerates accounts: "Invalid email or
  password" for both a wrong address and a wrong password.
- Relative time in the label, absolute in `title`.
- Empty states: what this is, why it is empty, one action.

## 13. The mark

- An ink box (the foreground colour) with the page-colour glyph. Never the accent, never a gradient.
- `fill` glyph (Phosphor) or `stroke` glyph (Lucide, the messer-swipe exception) at 75 % — 24 px
  inside a 32 px box.
- Square. The only circles in the system are the avatar, the status dot and the slider thumb.
- Generated by `npm run marks`; `brand:check` fails when a committed hash is stale.

## 14. What a project may choose

The accent hue (one — a neutral accent is a valid choice and is what `messer-swipe`, `portal` and
`studio` use), its mark glyph and glyph source, the shell variant (`sidebar` / `topbar` / `none`) and
its own layout inside the page. Everything in §1–§13 is fixed, including the icon family unless §9
records the exception.

Two shell-less shapes are sanctioned, and neither is drift: an **overlay** mounted inside another
app's page (Studio — no shell, no topbar, its own scoped sheet) and an **immersive** surface that has
no chrome of its own (swipe's deck, `variant: none`), which carries the theme control in its settings
instead of in an `actions` slot. Every other surface takes a shell, and its header row follows §16.

## The accent contract

- Light mode accent: `L ≤ 0.55` (white or near-black foreground must clear 4.5:1).
- Dark mode accent: `L ≥ 0.62` (it must read against a near-black surface).
- `accentFg` is **computed** (white vs `#0a0a0a`, whichever contrasts more) — never hand-picked.
- Chart ramp: five steps of the accent's hue at L .82/.70/.58/.46/.34 (light) and .86/.74/.62/.50/.38
  (dark). Achromatic brands borrow hue 205 (the family signal hue) at low chroma.
- Categorical ramp: six steps — the accent followed by five neutrals, or six neutrals when the accent
  is achromatic. Series are told apart by chroma and hue first, lightness second; never a rainbow.
- `npm run brand:check` asserts all of it and exits 1 on failure.

## Capability matrix

| Component | Port 1 (React) | Port 2 (atoms) | Notes |
|---|---|---|---|
| Button, Input, Textarea, Checkbox, Radio, Switch | ✓ | ✓ | |
| Select | ✓ | ✓ native only | port 2 uses a styled `<select>` |
| Field / label / hint / error | ✓ | ✓ | |
| Badge, StatusBadge | ✓ | ✓ | icon + label, always |
| Card / panel, PageHeader, EmptyState | ✓ | ✓ | |
| Table, DataRow, Pagination | ✓ | ✓ | |
| Tabs | ✓ | ✓ link-based | no JS tab widget, use navigation |
| Alert, Kbd, Avatar, Progress, Skeleton, Separator | ✓ | ✓ | avatar is the one circle |
| Dialog / AlertDialog | ✓ | ✗ | port 2 may use native `<dialog>` if it must |
| Drawer / Sheet | ✓ | ✗ | this is the line: a project that needs a drawer becomes port 1 |
| Popover, Dropdown, Tooltip, HoverCard | ✓ | ✗ | native `popover` attribute allowed for simple cases |
| Command palette, Combobox, DatePicker, DataTable | ✓ | ✗ | |

**Port 2 is frozen.** It ships atoms only — no new `.m-*` recipes, no new templates, no shell work and
no new fixtures. Security and correctness fixes only. The exit condition is the one line that ends the
port: request-games becomes a port-1 app, and port 2's build pipeline is deleted. Until then the port
is kept alive, not developed.

Port 3 (SwiftUI/Flutter) is a lookalike: it consumes `canon/tokens.json` and must match
`fixtures/kitchen-sink.html` visually. No component code is shared and none is expected to be.

---

# 15. Deviations

A project may deviate. It must say so, in its own `MESSER.md`, dated, with the rule number and the
exit condition:

```md
| 2026-11-08 | R2 | Swiparr's player bar keeps a 1px top border + blur | Blur is the only way to read
lyrics over artwork; drop when the artwork column becomes opaque |
```

Maximum five open deviations per project. The sixth is a design conversation, not a commit.

---

# 16. Layout — one width, one gutter

Every screen picks **one** container stop. A page never hand-writes a `max-w-*`, and never carries two
widths at once (a nested narrower strip under a wider container is a bug, not a hierarchy).

| stop | token | width | use |
|---|---|---|---|
| `default` | `--shell` | 1152 px | app screens and dashboards |
| `narrow` | `--shell-narrow` | 896 px | single-column reading and forms |
| `wide` | `--shell-wide` | 1440 px | data tables and boards only |

- **Gutter** `--page-pad` (32 px) at `md` and up, 16 px below; vertical rhythm `py-6 md:py-10`.
- **The header sits in the page's box.** The topbar's inner row is constrained to the same stop as the
  page container and shares its gutter; the bar's own border still spans the viewport, so the surface
  is full-bleed and the content is not. A wordmark that does not line up with the content below it is
  the defect this section exists to prevent.
- `AppShell` takes `container` (`default` | `narrow` | `wide` | `none`) and a page renders
  `PageContainer` with the same value. The shell and the page must not disagree — hence both read the
  same prop/token rather than each carrying a number.
- **Body copy** inside any stop caps at `72ch`. A table or a board may use the full stop.
- `check` measures the header row against the page container at 1280 px and fails on a mismatch.

