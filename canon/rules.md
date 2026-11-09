# The ten rules

The fingerprint. A project may look like itself; it may not look like a different family. Anything a
project is allowed to choose is listed under §11. Everything here is fixed.

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

---

# 11. What a project may choose

| Variable | Fixed | Chosen |
|---|---|---|
| Type families | ✓ Golos + JetBrains Mono | |
| Corner radius | ✓ 0 | |
| Icon family | ✓ Phosphor | |
| Label style, density, motion | ✓ | |
| Accent hue | | ✓ `brand-<project>.json` |
| Chart ramp | derived from the accent | ✓ derived |
| Logo, illustration, imagery | | ✓ must read as a mark, not a UI colour |
| Layout, shell, navigation shape | | ✓ within §1–§10 |
| Copy voice | | ✓ (this is not a voice-and-tone system) |

## The accent contract

- Light mode accent: `L ≤ 0.55` (white or near-black foreground must clear 4.5:1).
- Dark mode accent: `L ≥ 0.62` (it must read against a near-black surface).
- `accentFg` is **computed** (white vs `#0a0a0a`, whichever contrasts more) — never hand-picked.
- Chart ramp: five steps of the accent's hue at L .82/.70/.58/.46/.34 (light) and .86/.74/.62/.50/.38
  (dark). Achromatic brands borrow hue 205 (the family signal hue) at low chroma.
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

Port 3 (SwiftUI/Flutter) is a lookalike: it consumes `canon/tokens.json` and must match
`fixtures/kitchen-sink.html` visually. No component code is shared and none is expected to be.

---

# 12. Deviations

A project may deviate. It must say so, in its own `MESSER.md`, dated, with the rule number and the
exit condition:

```md
| 2026-11-08 | R2 | Swiparr's player bar keeps a 1px top border + blur | Blur is the only way to read
lyrics over artwork; drop when the artwork column becomes opaque |
```

Maximum five open deviations per project. The sixth is a design conversation, not a commit.
