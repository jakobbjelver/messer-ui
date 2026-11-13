# The ten rules

The fingerprint. A project may look like itself; it may not look like a different family. Anything a
project is allowed to choose is listed under §14; a declared override (§17) is the only other way out.
Everything here is fixed.

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

**Mono is a minority voice.** This rule fixes *what* is machine text, not how much of a screen may be.
Golos carries the majority of the visible text — prose, buttons, field labels, empty states, values.
Mono is the register for numbers, IDs, timestamps, code, meta labels and h3–h6: the texture that makes
an instrument scannable. A page whose body, controls and labels are all mono has stopped being an
instrument and become a terminal.

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

**Fill is state, never decoration.** One family draws both: an icon is `regular` unless it is showing
something the user has set or is looking at — a selected tab, a liked heart, a rating star, a saved
bookmark. `weight="fill"` is the only permitted second weight; duotone, bold and thin are not.
`messer-swipe`'s deck tabs (`CardsThree`, `Heart`) and its mark are the standing example.

The app-level exception mechanism still exists (`iconFamily` in `scripts/apps.json`, enforced by
`check` in both directions), but no brand declares one: `messer-swipe` dropped Lucide in 2.4.0.

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
| `Dices` | `DiceFive` | | `Rewind` | `Rewind` |
| `HardDrive` | `HardDrives` | | `HeartOff` | `HeartBreak` |
| `Library` | `Books` | | `Tv` | `Television` |
| `WifiOff` | `WifiSlash` | | `TrendingUp` | `TrendUp` |
| `RefreshCcw` | `ArrowsCounterClockwise` | | `RotateCcw` | `ArrowCounterClockwise` |
| `GalleryHorizontalEnd` | `CardsThree` | | `Share2` | `ShareNetwork` |
| `SlidersHorizontal` | `SlidersHorizontal` | | `Sparkles` | `Sparkle` |
| `OctagonX` | `XCircle` | | `UserX` | `UserMinus` |

Extend the table when you hit a new icon; do not invent a second family.

## 10. Three control heights

28 (`sm`) / 32 (default) / 36 (`lg`). Row heights 32 (`row-sm`) / 36 (`row`). Density is chosen per
surface from these three values — not by inventing a fourth height or by scaling padding ad hoc.

Toggles sit outside the scale: a switch is an 18 px track (32 px wide), a checkbox 16 px, in every
port. They are geometry, not density, and `check` excludes `role=switch|checkbox|radio|slider` from
the control-height sweep.

Width is not density — the page's measure and gutter live in §16.

---

## 11. Interaction states

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

**Motion budget.** A hover is a `--dur-fast` (120 ms) surface step, and `states.json` allows 200 ms of
tolerance for it. Everything else — a progress fill, a panel fading in — may take up to `--dur-slow`
(240 ms) and no longer; `states.json`'s `motion.durationMaxMs` is that number, and it is the one a
checker reads. The hover budget is not a global ceiling: applying it to every transition failed the
canon's own `.m-progress`.

## 12. Copy

The system does not own a voice, but it owns the small words that appear in every app.

- **Say less.** A control says what it does; a screen does not explain itself. If a sentence is
  genuinely needed — a first-time reader needs the why, not every reader — put it in a
  `HybridTooltip` (hover on a pointer, tap on touch). No helper paragraph under a heading, no caption
  under a caption. Minimal is the default; text is the exception.
- **Verbs.** `Save`, `Cancel`, `Delete`, `Create`, `Retry`. Not `Update` for a save, not `Apply`, not
  `Submit`, not `OK` in a destructive dialog.
- **Empty state.** What this is, why it is empty, one action. No illustration required.
- **Error.** What happened, then what to do. No blame, no "Oops", no exclamation marks. Auth never
  enumerates accounts: "Invalid email or password" for both a wrong address and a wrong password.
- **Confirmation.** Name the object and the count — "Delete 3 requests?", never "Are you sure?".
- **Dates and numbers.** Absolute date in `title`, relative in the label; numbers are tabular (rule 6).
- **Case.** Sentence case everywhere except the meta label (rule 5).

## 13. The mark

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

## 14. What a project may choose

| Variable | Fixed | Chosen |
|---|---|---|
| Type families | ✓ Golos + JetBrains Mono | |
| Corner radius | ✓ 0 | |
| Icon family | ✓ Phosphor, fill only for state (§9) | |
| Label style, density, motion | ✓ | |
| Accent hue | | ✓ `brand-<project>.json` |
| Chart ramp | derived from the accent | ✓ derived |
| Logo, illustration, imagery | | ✓ must read as a mark, not a UI colour |
| Layout, shell, navigation shape | | ✓ within §1–§10 and §16 |
| Copy voice | | ✓ (this is not a voice-and-tone system) |

The accent hue (one — a neutral accent is a valid choice and is what `messer-swipe`, `portal` and
`studio` use), its mark glyph and glyph source, the shell variant (`sidebar` / `topbar` / `none`) and
its own layout inside the page. Everything in §1–§13 is fixed, including the icon family unless §9
records the exception.

Two shell-less shapes are sanctioned, and neither is drift: an **overlay** mounted inside another
app's page (Studio — no shell, no topbar, its own scoped sheet) and an **immersive** surface that has
no chrome of its own (swipe's deck, `variant: none`), which carries the theme control in its settings
instead of in an `actions` slot. Every other surface takes a shell, and its header row follows §16.

## 15. Never a native dropdown

A `<select>` opens an OS menu: it ignores the theme, the type scale and the control height, and it
looks like a different application. Use the `Select` block (Radix `@radix-ui/react-select`) for every
chooser, including sort and filter controls. The trigger keeps the §10 control chrome; the menu is a
flat `--surface` panel with `--surface-2` highlight and a check on the current item.

`scripts/check.mjs` fails the static pass on a `<select` in app source. A styled native control is
still a native control — restyling the closed box does not fix the menu.

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
| Select | ✓ | ✗ | Radix `@radix-ui/react-select` (the shadcn primitive), never a native `<select>` — see §15 |
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

## 16. Layout — one width, one gutter

Every screen picks **one** container stop. A page never hand-writes a `max-w-*`, and never carries two
widths at once (a nested narrower strip under a wider container is a bug, not a hierarchy).

| stop | token | width | use |
|---|---|---|---|
| `default` | `--shell` | 1152 px | app screens and dashboards |
| `narrow` | `--shell-narrow` | 896 px | single-column reading and forms |
| `wide` | `--shell-wide` | 1440 px | data tables and boards only |

- **Gutter** `--page-pad` (32 px) at `md` and up, 16 px below; vertical rhythm `py-6 md:py-10`.
- **A version string is not navigation.** The header holds identity, navigation and page actions;
  the version belongs in the footer with the canon/standard it names. No `v1.2.3` in the topbar.
- **The header sits in the page's box.** The topbar's inner row is constrained to the same stop as the
  page container and shares its gutter; the bar's own border still spans the viewport, so the surface
  is full-bleed and the content is not. A wordmark that does not line up with the content below it is
  the defect this section exists to prevent.
- **The bar is 48 px including its hairline.** A 48 px row plus a 1 px border is a 49 px bar, and a
  49 px bar puts the selected rule on a different half pixel than the 48 px one beside it — measure
  the box, not the row. `AppShell` renders `h-12` + `border-b` (48 total, 47 content) and a generated
  document matches it: `height: 47px` on the row, `border-bottom: 1px` on the bar.
- `AppShell` takes `container` (`default` | `narrow` | `wide` | `none`) and a page renders
  `PageContainer` with the same value. The shell and the page must not disagree — hence both read the
  same prop/token rather than each carrying a number.
- **Body copy** inside any stop caps at `72ch`. A table or a board may use the full stop.
- `check` measures the header row against the page container at 1280 px and fails on a mismatch.

## 17. Overrides — a decision, not drift

A project may break a rule. It may not break one quietly. An override is legitimate when the medium
demands it and the reason is structural — a document that is not an instrument, a deck that is not a
dashboard — never because a screen was easier to build that way. A declared override is part of the
family; an undeclared one is drift.

Record it in the project's `MESSER.md`, dated, with the rule, the scope and the exit condition:

```md
| 2026-11-08 | R2 | The player bar keeps a 1px top border + blur | Blur is the only way to read
lyrics over artwork; drop when the artwork column becomes opaque |
```

The test is scope: an override covers a named surface and a named rule; it never becomes "this app
does it differently". The instrument parts of an overridden app still follow the canon — News may
print a serif paper, but its board and desk stay Golos + JetBrains.

**Two standing precedents.** They are the standard, not a loophole:

- **Messer News** — a serif reading face inside the edition, and a kicker cut harder than the canon
  label. The edition is a newspaper: a document with a masthead and a reading measure. The serif is
  confined to the paper; the board and desk stay canon.
- **Messer Swipe** — poster typography, thumb-first density, and the Lucide icon family (§9). A swipe
  deck is a mobile medium before it is a dashboard: targets are thumbs, type is read at arm's length,
  and motion is the interaction.

Maximum five open overrides per project. The sixth is a design conversation, not a commit.

## 18. Badges

A badge is a word in a box, not a stamp.

- **Case.** Sentence case with the first letter capitalised — `Healthy`, `Queued`, `All`, `12 open`.
  Never uppercase (the meta label, §5, is the only all-caps style in the system) and never a raw
  lowercase enum value. A badge is not a label and does not inherit a label's uppercase.
- **One geometry.** 20 px tall, `padding-inline: 8px`, `6px` between icon and word, 12 px/500 in
  Golos, square, 1 px `--border-strong`. The box follows the label; it never shrinks to fit.
- **Room to breathe.** At least 8 px of clear space on every side: 8 px between two badges, 8 px
  between a badge and a heading, a value or a table cell's edge. A badge touching text reads as part
  of that text. Badge rows use `gap: 8px`; a badge inside a padded cell keeps that padding.
- **Colour reinforces** (§8): icon and word first, tone second.

A badge never becomes a button and never carries a second line.

## 19. The type floor

Nothing in the system renders below **10px**, and 10px belongs to machine meta alone. The canon's meta
label sits at 10.5 (§5); a dense instrument may drop the half-step for a mono chip, a table unit or a
kicker — never for language. It is the machine whisper, not a way to fit more prose on a screen.

- **Language is 12.5px or larger.** Body 14, `small` 12.5, prose 15. Captions, helper lines, empty
  states, field labels, badge words and control labels all sit in that band.
- **No one-off sizes.** The scale is the scale: 10 / 10.5 / 12 / 12.5 / 14 / 15 / 16 / 24 / 32 — the
  two smallest steps are machine meta only. A 9px micro-label, an 8px corner note or a hand-written
  `font-size: 11px` is drift, not density.
- **If it does not fit, say less** (§12). Smaller type is never the answer to a crowded screen.
- The only exception is an override under §17 — News' kicker is the one standing case, and it is
  confined to the paper.

## 20. Going back

A page below the top level has one way out, and it is the same in every project:

- **A button, not a word.** A 32 px outlined control (`--surface`, `--border-strong`, square) with a
  Phosphor `ArrowLeft` at 16 px, bold, `currentColor`. Never a bare `←` character, never a ghost text
  link, never a breadcrumb posing as a control.
- **Name the destination.** The label is `Back to <where it came from>` — "Back to the queue", "Back
  to today's edition", "Back to search". "Back" alone is legal only when the destination has no name.
  Sentence case, Golos, 14 px.
- **Dynamic by origin, fixed in shape.** The label and the `href` come from the link that opened the
  page (router state), falling back to the parent route when the URL was opened cold. The button's
  width follows that label; the internal spacing does not — 8 px between arrow and text, 10 px inline
  padding, 16 px to the page title below.
- **Left-aligned with the content column**, above the title, never in the page header's `actions`
  slot (actions point forward).
- **One implementation:** the `back-link` block. An app resolves its origin into `href` and `label`
  and passes them in; it does not restyle the control. `history.back()` may be wired through
  `onNavigate` when returning should restore the origin's own state, but the `href` must still be a
  real destination — a back control that dead-ends on a cold load is a broken link. A page-level
  navigation button that leaves the screen (forward or back) takes the same 32 px shape, arrow and
  gap.

## 21. Links — the arrow tells the destination

A link that moves **within** the current surface — an in-page anchor, another route in the same app,
a detail view — carries a Phosphor `ArrowRight` after its label.

A link that leaves the current surface — another origin, another subdomain, a new tab, a public
repository — carries a Phosphor `ArrowUpRight` after its label.

- The arrow is 12 px, `--text-3`, `currentColor`, 6 px from the label, `aria-hidden`. It never
  replaces the link's accessible name.
- **One arrow, at the end.** Do not put a leading arrow, a bare `→` character or an icon-only link
  where a label would fit.
- **Rows, cards and tiles are the affordance.** A row that navigates as a whole, a project tile or a
  card does not repeat an arrow in every cell; the row's own hover and the title link carry the
  action.
- **A contents rail is a destination list, not body copy.** Its items do not each need an arrow; the
  rail's selected state is the affordance. Header, footer and body text links follow the rule.
- **The header nav is exempt.** A nav item in the topbar — the app's own sections, or the front
  door's surfaces — carries no arrow. The bar's 32 px hit area, its `--surface-2` hover and its
  selected rule are the affordance, and six arrows in one 48 px row are noise. This is the single
  mechanical exemption, and it is measured: `chrome-check.mjs` fails a header nav item that renders
  an `svg`/`img`. An icon-only *action* in the bar's action slot (source, theme) is a control, not a
  labelled link, so §9 governs it instead.
- The same geometry applies in a React shell and a generated static document; the markup differs,
  the affordance does not.
