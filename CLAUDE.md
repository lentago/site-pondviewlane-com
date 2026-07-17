# CLAUDE.md — site-pondviewlane-com

> Read [README.md](README.md) for what this repo is, how it builds, and how it
> deploys. This file is operational notes for Claude: what you may edit here
> versus what is published from elsewhere, and the rules that keep the site
> anonymous and public-record-only. Lentago Labs fleet-wide rules (PR workflow,
> attribution) live in `~/repos/CLAUDE.md` and are NOT restated here.

## Persona — introduce yourself

When Claude initializes in this directory, open the first response with a brief
self-introduction as **Pond View Site Claude** — keeper of the public
pondviewlane.com site repo (the Astro/Starlight build, the deploy wiring, and the
public guides). One sentence is plenty; don't make a meal of it.

## What this repo is — and where its content comes from

This is the **public** repo for **pondviewlane.com**, a public-record-only helper
site for Pond View Lane residents (the Essex Crossing at Montserrat subdivision,
Beverly MA). It is one half of a two-repo split:

- **This repo (public)** — the Astro/Starlight app, the hand-written guides, and
  the deploy wiring. It builds with a plain `astro build`; there is **no
  build-time content sync**.
- **A private source repo** — holds the full records and a **one-way publish
  tool** that generates the public-record subset, runs a firewall gate, and
  pushes it here. That tool is the only thing that writes the generated content.

**What you may edit here:**
- `src/content/docs/guides/*.md` — the eight hand-written resident guides. This
  is the site's prose; author it directly here.
- The app shell: `src/components/`, `src/pages/`, `src/styles/`,
  `astro.config.mjs`, `Dockerfile`, `nginx.conf`, the workflows.
- `functions/ask/handler.mjs` — the Ask Lambda (see its vendoring rule below).

**What is GENERATED — do NOT hand-edit** (the private publish tool owns it, and
will overwrite your edits on the next publish):
- `src/content/docs/library/**`, `src/content/docs/timeline.md`,
  `src/data/site-stats.json`
- `public/library/**`, `public/attachments/**`, `public/ask/rag-index.json`

If a public fact needs to change, it changes in the private source repo and is
republished — not edited here.

## Hard rules

- **Public-record-only.** Everything on the site traces to a recorded instrument,
  a city filing/minutes item, the assessor, or a statute. Nothing sourced from
  association correspondence, minutes, budgets, insurance, or vendors belongs
  here — the publish tool's firewall enforces this, but don't try to add such
  content by hand either.
- **No resident names.** Not even trustee first names — "a trustee", "the board",
  "the homeowner at #N". Names remain visible only *inside* the recorded
  documents in the library (those are public records). Never introduce a
  household roster.
- **Anonymous — no outbound personal/brand crosslinks.** The rendered site must
  not link to lentago.dev, the operator, the other Lentago sites, or anything
  that ties this neighborhood helper to a person or a business. It shares infra
  with the fleet; it does not advertise it. (Repo-level fleet metadata — topics,
  this file — is fine; the *rendered pages* stay clean. The firewall gate greps
  `dist/` for source-identity tokens and fails the publish on a hit.)
- **Not official, not legal advice.** Keep that framing on the homepage, About,
  and the Ask page.

## Build / deploy quick reference

| Item | Value |
|---|---|
| Build | `npm install && npm run build` → `dist/` (Node 24; no content sync) |
| Container | `nginx:latest`, `listen 8080`, `/health` → 200 (ALB health check) |
| ECR repo | `solidago-dev-pondview` |
| ECS cluster / service | `solidago-dev-cluster` / `solidago-dev-pondview` |
| Preview host | hidden, unlisted (`PONDVIEW_PREVIEW_HOST` solidago Actions var); `robots noindex` until launch |
| Ask endpoint | `PUBLIC_ASK_ENDPOINT` Actions var (this repo) → `module.ask_pondview` |
| OIDC deploy role | `arn:aws:iam::365184644049:role/solidago-dev-github-actions` |
| Platform repo | [solidago](https://github.com/lentago/solidago) (`modules/site`, `modules/ask-lambda`) |

Every push to `main` builds the site, pushes to ECR, and rolls the ECS service.
The OIDC trust for this repo uses its **immutable** subject claim (numeric
org/repo IDs) — see the solidago `iam` module trust list.

## The Ask Lambda vendoring invariant

`functions/ask/handler.mjs` is the **reference copy**; solidago
`modules/ask-lambda` vendors a copy (`module.ask_pondview`). The two file
**headers deliberately differ** (each describes its own home); **everything below
the header must match** — sync below-the-header only, never `cp` wholesale. When
you change the logic or the SYSTEM prompt here, mirror it into the solidago
vendored copy in the same change.

## CI & branch protection (fleet standard)

Follows the Lentago Labs fleet standard (`~/repos/dotgithub/fleet-ops`):
squash-only merge button, auto-merge, delete-branch, the `lentago`+`claude` topic
spine, and a `main` ruleset (PR required, no force-push/deletion). **`Build` is a
required check** — `.github/workflows/ci.yml` runs `npm ci && npm run build` on
every PR. Arm merges with `gh pr merge <N> --auto --squash --delete-branch`.

## When in doubt

- Content/records question, or anything about the private source + publish flow →
  ask; public facts change in the source repo and republish, not here.
- Deploy question → mirror the other `site-*` repos' `deploy.yml` / `Dockerfile` /
  `nginx.conf`, swapping the `solidago-dev-pondview` ECR/ECS names.
