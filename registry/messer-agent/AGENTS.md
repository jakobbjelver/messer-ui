# AGENTS.md — <project> · Messer UI

This project uses Messer UI. Read `MESSER.md` (deviations live there) and
[`canon/rules.md`](https://github.com/jakobbjelver/messer-ui/blob/main/canon/rules.md) before touching
anything visual.

## Hard rules

1. Square corners. The only circles are avatars, status dots and slider thumbs.
2. Hairline borders; shadows only on things that float (dialog, drawer, popover, dropdown, tooltip).
3. Mono (JetBrains Mono) for h3–h6, labels, numbers, IDs, timestamps, table heads, code.
4. Golos Text for h1–h2, body, buttons, form values. Golos has no italic — never `<em>` in UI copy.
5. Labels: 10.5px uppercase, `.1em` tracking, tertiary colour. One label style, everywhere.
6. Tabular numbers; numeric table columns right-aligned.
7. Exactly one accent, from `brand-<project>` in messer-ui. No second brand colour.
8. Status is icon + label; colour reinforces only.
9. Phosphor icons, 16px, `weight="regular"`, `currentColor` (14 compact, 20 nav).
10. Control heights 28 / 32 / 36 only.

## Before you commit

```bash
npm run messer:check      # assert-config + conformance, exits 1 on a broken fingerprint
```

If you must deviate, add a dated row to `MESSER.md` with the rule number and the exit condition.
Five open deviations is the limit; a sixth is a design conversation.

## Do not

- Add a font, an icon family or a second accent.
- Write a hex colour in a component — use a token.
- Fork a messer-ui component to restyle it; patch it and re-run `shadcn add <item> --diff` so the
  upstream delta stays visible.
