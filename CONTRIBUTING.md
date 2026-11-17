# Contributing

Messer UI is a personal design system, published as it is. **Pull requests are not being accepted** —
the canon has one owner, and a visual rule that two people can change is a rule that drifts.

What is genuinely useful, and what the issues channel is for:

- **A measured rule failure.** A component that breaks one of the ten rules at a stated viewport, with
  the computed value or the screenshot that proves it. That is a bug in the canon, and it gets fixed.
- **A proposal.** The shape (problem, evidence, the block or sentence you would add) lives in
  [`docs/PROPOSALS.md`](./docs/PROPOSALS.md). Read the format before writing; a proposal without a
  measurement is a conversation, not a contribution.

Feature requests for an app built on the system belong in that app's repository, not here.

If you find a security problem, do not open an issue: see [`SECURITY.md`](./SECURITY.md).

Forking is welcome and the license allows it. If you build on this, the parts most worth taking are
`canon/rules.md` and the ten measurable checks in `scripts/check.mjs`.
