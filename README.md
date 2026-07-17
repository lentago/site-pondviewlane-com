# site-pondviewlane-com — Pond View Lane public-record site

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/lentago/site-pondviewlane-com)

The site content for **[pondviewlane.com](https://pondviewlane.com)** — a
plain-English, **public-record-only** reference for residents of Pond View Lane
(the Essex Crossing at Montserrat subdivision) in Beverly, Massachusetts. It
collects the recorded instruments, city filings, and public timeline that define
the neighborhood and its homeowners association, with an "Ask" box that answers
questions from those records — so a resident doesn't have to drive to the
registry of deeds to understand what they own and what the rules are.

It's an [Astro](https://astro.build) / [Starlight](https://starlight.astro.build)
static site served as a container on the
[solidago](https://github.com/lentago/solidago) AWS stack (GitHub OIDC → ECR →
ECS Fargate → ALB), the same platform that runs
[lentago.dev](https://lentago.dev) and
[icecreamtofightwith.com](https://icecreamtofightwith.com).

> **Not official, not legal advice.** This is a resident's reference, **not** a
> publication of the homeowners association, and nothing here is legal advice.
> The site names no residents; board history is told through the recorded
> instruments themselves.

**Authorship:** This repo is co-written with [Claude](https://claude.ai)
(Anthropic). A Pond View Lane resident directs the work, supplies the records and
the guide copy, and reviews the output; Claude writes the code and the tooling.
The maintainer is an infrastructure operator, not a software engineer — please
don't read this repo as a portfolio of one.

## Public-record-only, and self-contained

Everything here traces to a **public record** (Southern Essex Registry of Deeds,
City of Beverly filings/minutes, the assessor, MassDEP). This repo is **fully
self-contained**: it holds its own source — the recorded documents and their
metadata (`library/`), the public timeline (`timeline/events.json`), and the
site imagery (`attachments/`) — and a build-time generator turns that source
into the site's pages. There is no external dependency and no internal
association material: meeting minutes, budgets, insurance, vendor invoices, and
correspondence are **not** public records and are simply not here.

A content-hygiene check (`scripts/check-content.mjs`) guards the invariant — no
resident names outside the recorded documents, every library document marked as
a public record, every image on an explicit allowlist.

## What's here

| Path | Purpose |
|---|---|
| `src/content/docs/guides/` | The eight hand-written resident guides — the site's prose (start here, governance, common land, stormwater, wetlands, assessments, records, trees). |
| `library/` | **Source of record:** `manifest.json` (document metadata) + `files/` (the recorded instruments / city filings) + `text/` (searchable text extracts). |
| `timeline/events.json` | **Source:** the public-records chronology, one entry per dated event. |
| `attachments/` | **Source:** the maps, plans, and diagrams the guides embed (the allowlist the generator publishes). |
| `scripts/sync-content.mjs` | The build-time generator: turns `library/` + `timeline/` + `attachments/` into the site's content collections + the Ask index. |
| `scripts/check-content.mjs` | The content-hygiene check (public-record-only invariant). |
| `src/components/` · `src/pages/` · `src/styles/` | The Ask widget/dock, the report-an-issue form, the footer, and the site styling. |
| `functions/ask/handler.mjs` | The "Ask" answer Lambda (reference copy; vendored to solidago `modules/ask-lambda`). |
| `Dockerfile` / `nginx.conf` | Packages the built `dist/` into an `nginx` container on port `8080` with a `/health` endpoint for the ALB. |
| `.github/workflows/deploy.yml` · `ci.yml` | Build → ECR → ECS rollout via OIDC on push to `main`; the PR `Build` gate. |

## How it's built & served

```bash
npm install
npm run build      # runs the content generator (sync) then astro build → dist/
npm run preview    # local preview
```

The `sync` step (hooked before `dev`/`build`) regenerates the document pages,
the timeline, and the Ask index from `library/` + `timeline/` + `attachments/`,
so the generated output isn't committed — the source is. 

Docker copies `dist/` into `nginx` (`:8080`, `/health`); GitHub Actions builds
the image, pushes it to ECR, and rolls the ECS service via the solidago platform
OIDC role — no long-lived credentials. The ECR repo, ECS service, the Ask Lambda
(`module.ask_pondview`), and the OIDC trust for this repo are provisioned in
`solidago` (`modules/site` + `modules/ask-lambda`).

## Status

The site currently serves as a **hidden, unlisted preview** for association
trustees to review; it carries `robots noindex` and is not yet at its public
`pondviewlane.com` domain. The public launch (real domain + removing `noindex`)
is a deliberate, separate step.

---

*Part of the [Lentago Labs](https://github.com/lentago) portfolio.*
