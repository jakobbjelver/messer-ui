# MESSER.md — <project>

Port: **1 (React)** · Brand: **`brand-<project>`** · Sink: **`/_ui`** · Canon: **`2.3.0`**

Port 2 is frozen (atoms only, no new recipes). A project that needs an overlay, a command palette or
client state is port 1 — see `canon/rules.md`.

## Local decisions

Layout, navigation shape, logo, copy — inside §14.

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

Record whether the last run measured a local build or the deployed URL, and at which widths.
