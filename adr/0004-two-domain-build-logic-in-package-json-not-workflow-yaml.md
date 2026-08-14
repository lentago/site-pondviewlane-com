# ADR-0004: Two-domain build logic lives in `package.json` scripts, not workflow YAML

**Status:** Accepted (2026-07-19; reconstructed 2026-08-13)

## Context

PR #12 needed CI and deploy to build both domain skins
(`dist-pondview` + `dist-essexcrossing`) and run the hygiene check over both
outputs before every merge and deploy. The natural place to add that
orchestration is `.github/workflows/ci.yml` / `deploy.yml` — an explicit
matrix or two build steps, one per skin. But the fleet's runner-bot GitHub
App has no `workflows` permission, so it cannot push changes to
`.github/workflows/**` — a governance constraint on what the automated
agent fleet may touch, not a limitation of GitHub Actions itself.

## Decision

**Put the two-variant build and the hygiene gate inside `npm run build`
itself**, in `package.json`'s `build`/`postbuild` scripts: `build` runs
both the `SITE=pondview` and `SITE=essexcrossing` compiles into their
respective `outDir`s, and the `postbuild` hook runs
`scripts/check-content.mjs` over every `dist*/` automatically.
`.github/workflows/ci.yml` and `deploy.yml` stay unchanged — they already
just call `npm ci && npm run build` — so the existing, human-authored
workflow YAML "now does the right thing" without the agent needing write
access to it.

## Alternatives

- **Recorded:** spell the two build steps out explicitly in the workflow
  YAML (a matrix, or two explicit steps for each `SITE` value). Not taken
  as the working design — PR #12 flagged it as the human-preferred
  alternative ("If you'd prefer the build steps spelled out in the workflow
  YAML, that edit needs a human push") and left it open for a maintainer to
  make later, since only a human can push that file.
- **Retrospective — not considered at the time:** grant the runner bot's
  GitHub App the `workflows` permission so it can push CI changes directly.
  *Worse* — GitHub App permissions are granted per installation, not per
  repo, so broadening it to unblock one repo's two-variant build would
  hand every agent in the fleet write access to CI definitions across every
  repo it touches — a far larger blast radius than the problem it solves.
- **Retrospective — not considered at the time:** have a human pre-author a
  matrix build once, then let the agent fleet only touch `package.json`
  thereafter, combining both approaches. *Lateral* — a matrix build is the
  more idiomatic GitHub Actions shape and would surface each skin as a
  separately labeled check in the PR UI (a real usability win over one
  opaque `Build` step), but it still requires the one-time human-authored
  workflow push this ADR's decision was designed to avoid depending on; the
  chosen design reaches the same build coverage without that dependency.

## Consequences

- Build/deploy behavior for both skins is fully controlled from
  `package.json`, which the agent fleet can edit freely; adding a
  hypothetical third skin would still need zero workflow-YAML changes.
- The trade is CI visibility: both skins build inside one `Build` check
  rather than as separate matrix legs, so a failure in one skin doesn't
  surface as its own labeled failing check — only as the shared `Build`
  step failing, requiring a log read to tell which skin broke.
- Any future move to matrix-style separation requires a human-authored
  workflow-YAML change (the recorded alternative above), since the agent
  fleet cannot make that change itself.
