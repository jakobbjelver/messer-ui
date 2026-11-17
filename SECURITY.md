# Security

## Reporting

Open a **private security advisory** on GitHub (Security → Report a vulnerability). Do not open a public
issue for a vulnerability. This is a single-person project, not a company: expect an answer within a few
days, not within an hour.

## What this software assumes

- **It ships values, not a service.** `canon/` and `registry/` are consumed at build time by projects that
  already run a server; there is no runtime here to attack, and no data to leak.
- **The registry is public by design.** Every token, rule and component in it is meant to be readable —
  the only secrets in a consuming project are its own, and they never belong in a `VITE_*` value.
- **Contrast is a security property in the small.** `npm run brand:check` fails when an accent drops
  below AA or drifts into a status hue; a fork that disables it is shipping a rule nobody measures.
- **A consuming app's boundary is its own.** This repository cannot make an app multi-tenant, and does
  not pretend to: the blocks assume one authenticated user behind a proxy.
