# MESSER.md — <project>

Port: **1 (React)** · Brand: **`brand-<project>`** · Sink: **`/_ui`** · Canon: **`2.0.0`**

## Adoption

```bash
npx shadcn@latest add jakobbjelver/messer-ui/messer-style \
                     jakobbjelver/messer-ui/messer-fonts \
                     jakobbjelver/messer-ui/messer-fingerprint \
                     jakobbjelver/messer-ui/brand-<project>
```

## Local decisions

Things this project owns: layout, navigation shape, logo, copy. Nothing visual outside
[`canon/rules.md`](../messer-ui/canon/rules.md) §14.

## Deviations

| Date | Rule | What | Exit |
|---|---|---|---|
| | | | |

## Verify

```bash
npm run messer:check        # assert-config + conformance (port 1)
```

A green run is required before deploy. The report records whether it measured a local build or the
deployed URL.
