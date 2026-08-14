# ADR-0001: Two apex domains, one repo, one fact base

**Status:** Accepted (2026-07-19; reconstructed 2026-08-13)

## Context

pondviewlane.com serves Pond View Lane residents. The subdivision's legal
name — the name on the recorded instruments and city paperwork — is **Essex
Crossing at Montserrat**, and issue #11 set out to give that name a second
front door onto the *same* record base, for buyers, attorneys, and title
searchers: essexcrossingatmontserrat.com. The fleet convention (`~/repos/
CLAUDE.md`) is one repo per domain, `site-<domain>`. Issue #11 recorded the
decisions already made before scoping the work: "One repo, one content tree,
two builds — no second content repo; content drift between two sources of
truth is the failure mode this avoids," and "One container serving both
domains via nginx `Host`-header switching."

## Decision

**One repo, one fact base, two builds, one container.** PR #12 introduced a
build-time `SITE` switch (`astro.config.mjs`, `pondview` default |
`essexcrossing`) that selects presentation only: the `site` URL (so each
domain gets self-canonical sitemaps), title/description, logo/favicon/og
assets, per-scheme `theme-color`, and the stylesheet. Content stayed fully
shared at first (byte-identical prose across both skins); PR #16 later
split it into `content/base/` (the shared, hand-written facts) plus
`content/essex/` (a per-page voice overlay), materialized into
`src/content/docs/` per skin by `scripts/compose-content.mjs`. The C7 check
in `scripts/check-content.mjs` enforces the fact base against the voice
overlay: every fact token (dollar amounts, years, statute citations,
book/page refs, feet/acres figures) found in a base page must appear in its
Essex variant, so the overlay can change *words* but not *facts*.

One `nginx` container serves both domains, switched on the request `Host`
header (`nginx.conf` gains a second `server` block on
`essexcrossingatmontserrat.com` / `www.essexcrossingatmontserrat.com`,
sharing routing/caching/security via `nginx-common.conf`); the pondview
block stays `default_server` and keeps `/health` for the ALB check. The
DNS/TLS/ALB host rule and the ask endpoint's CORS `allowed_origin` value
land in the platform companion, `lentago/solidago#137`.

## Alternatives

- **Recorded:** a second site repo (`site-essexcrossingatmontserrat-com`),
  mirroring the fleet's one-repo-per-domain convention. Rejected — issue #11
  and CLAUDE.md both name the same failure mode: two content sources of
  truth would let the two domains' facts drift apart, and a single fact
  source outweighs the naming convention.
- **Retrospective — not considered at the time:** keep one content tree but
  deploy it as two independently running containers/ECS services (rather
  than one Host-switched container). *Lateral* — this would isolate a
  runtime bug in one skin from taking down both domains, but it doubles the
  ECR/ECS footprint for two low-traffic static sites that share everything
  but presentation; not a clear improvement given the current scale.
- **Retrospective — not considered at the time:** one build, one dist, with
  client-side `location.hostname` detection choosing the skin at runtime
  instead of two server-rendered dists. *Worse* — every visitor would
  download both skins' fonts/CSS/images, risk a flash of the wrong skin
  before JS runs, and lose the self-canonical, per-domain sitemap that the
  build-time `SITE` switch gives each domain for free.

## Consequences

- CI's required `Build` check and the deploy workflow both build **both**
  skins on every push, via `npm run build` (`build:pondview &&
  build:essexcrossing`, each a compose-then-`astro build`), with no
  workflow-YAML changes needed to add the second variant (see ADR-0004).
- A content change to `content/base/` propagates to both domains
  automatically; C7 fails the build if an Essex overlay page silently drops
  a fact its base counterpart carries.
- One `nginx.conf` regression can take down both domains at once — accepted
  as the trade against the drift risk of maintaining two content repos.
- The DNS/TLS/ALB companion (`lentago/solidago#137`) is a hard external
  dependency: this repo's skin/packaging code can merge and sit inert until
  that lands.
