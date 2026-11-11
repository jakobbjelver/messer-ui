# MESSER.md — <project>

Port: **1 (React)** · Brand: **`brand-<project>`** · Sink: **`/_ui`** · Canon: **`2.3.0`**

## Adoption

```bash
npx shadcn@latest add jakobbjelver/messer-ui/messer-style \
                     jakobbjelver/messer-ui/messer-fonts \
                     jakobbjelver/messer-ui/messer-fingerprint \
                     jakobbjelver/messer-ui/brand-<project>
```

## Local decisions

Things this project owns: layout, navigation shape, logo, copy. Nothing visual outside
[`canon/rules.md`](canon/rules.md) §14.

## Overrides

A rule may be broken for a structural reason (canon §17), never quietly. One row per override, dated,
with the rule, the surface it covers and the exit condition.

| Date | Rule | What, and why it stands | Exit |
|---|---|---|---|
| | | | |

## Verify

```bash
node ~/Repos/messer-ui/scripts/check.mjs --app <dir> --static
node ~/Repos/messer-ui/scripts/check.mjs --url http://127.0.0.1:<port>/ui --app <dir>
```

A green run is required before deploy. The report records whether it measured a local build or the
deployed URL.
