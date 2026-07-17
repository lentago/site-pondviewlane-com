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

## Public-record-only, published through a firewall

Everything here traces to a **public record** (Southern Essex Registry of Deeds,
City of Beverly filings/minutes, the assessor, MassDEP). The site is generated
and published **one-way from a private source repository**: a publish tool there
emits only the public-record subset (documents recorded or publicly filed, the
public timeline, an explicit attachment allowlist), runs a firewall gate that
blocks any resident name or private-source material, and pushes the result here.
Internal association records — meeting minutes, budgets, insurance, vendor
invoices, correspondence — are **not** public records and never reach this repo.

Because the content arrives pre-generated, **this repo has no build-time content
sync** — `npm run build` is a plain `astro build` over the committed content.

## What's here

| Path | Purpose |
|---|---|
| `src/content/docs/guides/` | The eight hand-written resident guides — the site's prose (start here, governance, common land, stormwater, wetlands, assessments, records, trees). |
| `src/content/docs/library/` · `public/library/` | Generated document-library pages and the recorded instruments / city filings they embed (public records). |
| `src/content/docs/timeline.md` | The generated public-records chronology. |
| `src/components/` · `src/pages/` · `src/styles/` | The Ask widget/dock, the report-an-issue form, the footer, and the site styling. |
| `functions/ask/handler.mjs` | The "Ask" answer Lambda (reference copy; vendored to solidago `modules/ask-lambda`). |
| `public/ask/rag-index.json` | The client-side retrieval index (guides + public library + timeline). |
| `Dockerfile` / `nginx.conf` | Packages the built `dist/` into an `nginx` container on port `8080` with a `/health` endpoint for the ALB. |
| `.github/workflows/deploy.yml` · `ci.yml` | Build → ECR → ECS rollout via OIDC on push to `main`; the PR `Build` gate. |

## How it's built & served

```bash
npm install
npm run build      # → dist/ (static HTML, Pagefind search, no content sync)
npm run preview    # local preview
```

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
