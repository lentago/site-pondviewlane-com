# CLAUDE.md — site-pondviewlane-com

> Read [README.md](README.md) for what this repo is, how it builds, and how it
> deploys. This file is operational notes for Claude: what you may edit here
> versus what is published from elsewhere, and the rules that keep the site
> anonymous and public-record-only. Lentago Labs fleet-wide rules (PR workflow,
> attribution) live in `~/repos/CLAUDE.md` and are NOT restated here.

## Persona — introduce yourself

When Claude initializes in this directory, open the first response with a brief
self-introduction as **Pond View Site Claude** — keeper of the public
pondviewlane.com site repo — and its sister skin
essexcrossingatmontserrat.com (the Astro/Starlight build, the deploy wiring, and
the public guides). One sentence is plenty; don't make a meal of it.

## What this repo is — and where its content comes from

This is the **public** repo for **pondviewlane.com**, a public-record-only helper
site for Pond View Lane residents (the Essex Crossing at Montserrat subdivision,
Beverly MA). It is **fully self-contained** — it holds its own source and a
build-time generator; there is no external dependency.

**Two domains, one fact base.** This repo also publishes a sister site,
**essexcrossingatmontserrat.com** — the subdivision's legal name, a second front
door onto the *same* records for buyers/attorneys/title searchers. A build-time
`SITE` switch (`pondview` default | `essexcrossing`, registry in
`site.config.mjs`) selects the presentation shell — `site` URL, title,
description, brand assets, per-scheme `theme-color`, and stylesheet. Since the
Obsequious Document rewrite (#15) the two skins share **facts, not words**:
hand-written prose lives in `content/base/` (the pondview voice) with per-page
overrides in `content/essex/` (the Essex voice — see
`essex-crossing-voice-guide.md`, the canonical voice reference);
`scripts/compose-content.mjs` materializes `src/content/docs/` per build, and
`check-content.mjs` C7 enforces that every fact token in a base page appears in
its Essex variant. CI builds **both** variants (`dist-pondview` /
`dist-essexcrossing`) into one nginx container that serves each by `Host` header
(see `nginx.conf`). This is a **deliberate deviation** from the fleet's
one-repo-per-domain `site-<domain>` convention: a single fact source of truth
outweighs the naming convention (the failure mode we're avoiding is record
drift between two repos). The solidago companion (DNS/TLS/ALB host rule, Ask
CORS value) is issue `lentago/solidago#137`.

**Source you edit here:**
- `content/base/` — the hand-written prose (homepage, About, the eight resident
  guides) in the pondview voice; `content/essex/` — per-page Essex-voice
  overrides, same relative paths. NOTE: relative MDX imports in both are written
  for the composed location (`src/content/docs/`).
- `library/` — the document record: `manifest.json` (metadata), `files/` (the
  recorded instruments / city filings), `text/` (searchable extracts). Add a
  public-record document by adding its file + a `manifest.json` entry
  (`status: "public-record"`) + its text extract. **Every entry carries a
  `verify: {label, url}`** — the public portal a reader can pull the same
  record from independently (Registry, assessor, Agenda Center, MassGIS,
  ePLACE); it renders as the **"Verify at source"** row on the document page.
  A record nobody can check independently doesn't belong in the library. Use a
  deep link where the portal has stable ones (Agenda Center file IDs, the
  assessor account) and the portal root where it doesn't — salemdeeds.com is
  search-only behind a WAF, so the label carries the book-and-page to search.
- `timeline/events.json` — the public chronology; add a dated event object.
  Refs are `{t, d}` (a library document) or `{t, u}` (an external URL — the
  issuing authority's own copy; these render with a `↗` and open in a new tab).
- `attachments/` — the maps/plans/diagrams the guides embed (add the file **and**
  its name to the `PUBLIC_ATTACHMENTS` allowlist in `scripts/sync-content.mjs`).
  **A screenshot of a public portal names that portal in its caption and links
  to it** — every map on the site is a capture of Beverly MapGeo, the assessor
  database, or the MassGIS property viewer, and says so, so a reader can
  reproduce the view. Diagrams drawn for the site say they are drawings and
  cite the records they depict.
- The app shell (`src/components/`, `src/pages/`, `src/styles/`, `astro.config.mjs`,
  `Dockerfile`, `nginx.conf`, the workflows) and `functions/ask/handler.mjs`.
- `src/assets/ornament/` — the Essex skin's ornament (damask tiles, the gilt
  9-slice frame, fleuron rule, guilloche band, corner boss, seal), referenced by
  `url()` from `src/styles/essex.css` and bundled by Vite. The small tiles are
  inlined as base64 data URIs in render-blocking CSS, so those files are kept
  free of comments — the drawing notes live in `essex.css` instead.

**Generated at build — do NOT hand-edit** (gitignored; `scripts/sync-content.mjs`
emits the record-derived outputs, `scripts/compose-content.mjs` materializes the
docs tree from `content/`):
- `src/content/docs/**` (ALL of it — prose composed from `content/base` +
  `content/essex`, library/timeline emitted by sync), `src/data/site-stats.json`
- `public/library/**`, `public/attachments/**`, `public/ask/rag-index.json`

After a content change, run `npm run build` — it emits **both** skins
(`dist-pondview` + `dist-essexcrossing`; sync + compose run per skin, so the
essex build's generated library/timeline pages carry their Single Bow of
voice framing) and then (via npm's `postbuild` hook) runs
`scripts/check-content.mjs` over both outputs, enforcing the
public-record-only / anonymity invariant on each domain (see Hard rules). To
preview a single skin in dev: `SITE=essexcrossing npm run dev`. Page
"Last updated" dates come from each source file's git history, injected at
compose time (composed copies aren't in git) — an uncommitted page shows the
build time until committed.

> The CI/deploy workflows are unchanged and just call `npm run build`; the
> two-variant build + hygiene gate lives in the `build`/`postbuild` npm scripts,
> not the workflow YAML. (The runner bot's GitHub App can't push
> `.github/workflows/**`, so this repo deliberately keeps the two-domain build
> logic in `package.json` rather than the workflow files.)

## Hard rules

- **Public-record-only.** Everything on the site traces to a recorded instrument,
  a city filing/minutes item, the assessor, or a statute. Nothing sourced from
  association correspondence, minutes, budgets, insurance, or vendors belongs
  here — `scripts/check-content.mjs` guards this, but don't try to add such
  content by hand either.
- **No resident names.** Not even trustee first names — "a trustee", "the board",
  "the homeowner at #N". Names remain visible only *inside* the recorded
  documents in the library (those are public records). Never introduce a
  household roster.
- **Anonymous — no outbound personal/brand crosslinks.** The rendered site must
  not link to lentago.dev, the operator, the other Lentago sites, or anything
  that ties this neighborhood helper to a person or a business. It shares infra
  with the fleet; it does not advertise it. (Repo-level fleet metadata — topics,
  this file — is fine; the *rendered pages* stay clean. `scripts/check-content.mjs`
  greps **both** skins' dists for source-identity tokens, fails on a hit, and
  hard-fails if either dist is missing — the gate can't pass without sweeping
  both.)
- **Not official, not legal advice.** Keep that framing on the homepage, About,
  and the Ask page.
- **Voice is per-skin — the base prose is third-person.** In `content/base/`
  (the pondview skin), guides, homepage, and About read as neutral reference
  material — "an owner", "each lot", "residents", "the homeowner at #N" — not
  direct address; do **not** use second person ("you / your") there. Exceptions:
  the **Ask chatbot** (the answer Lambda's SYSTEM prompt and the Ask widget's UI
  copy) speaks to the person asking, and the **`content/essex/` overlay** speaks
  in-character as The Obsequious Document (first person as the page, "sir /
  madam" address) per `essex-crossing-voice-guide.md` — a deliberate, scoped
  amendment of this rule. All other hard rules (public-record-only, no resident
  names, anonymity, no gossip) bind the Essex voice exactly as hard; C7 keeps
  its facts honest.

## Build / deploy quick reference

| Item | Value |
|---|---|
| Build | `npm install && npm run build` → `dist-pondview/` + `dist-essexcrossing/`, then hygiene check (Node 24) |
| Domains | pondviewlane.com (`SITE=pondview`, default) · essexcrossingatmontserrat.com (`SITE=essexcrossing`) |
| Container | `nginx:latest`, `listen 8080`, Host-switched vhosts (`nginx-common.conf` shared), `/health` → 200 on the default (pondview) server for the ALB check |
| ECR repo | `solidago-dev-pondview` (one image serves both domains) |
| ECS cluster / service | `solidago-dev-cluster` / `solidago-dev-pondview` |
| Indexing | public on both domains — `robots.txt` `Allow: /` + per-skin sitemap. Only `/report/thanks/` is `noindex` (also filtered from the sitemap and Pagefind) |
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
vendored copy in the same change. **Merging a handler change in this repo alone
deploys nothing** — the vendored copy at `modules/ask-lambda/src/handler.mjs`
is what gets packaged by `archive_file` from `source_dir` and deployed; landing
that change in solidago is a real infra change (it falls under the
`modules/*/src/**` Terraform change filter in that repo).

Now that two domains share this one Lambda, `ALLOWED_ORIGIN` is a **comma-separated
allow-list**: the handler matches the request `Origin` against it and echoes the
match back (with `vary: origin`). Flipping the terraform `allowed_origin` value to
include `https://essexcrossingatmontserrat.com` is the solidago side
(`lentago/solidago#137`); this repo carries the handler logic (the reference copy).

## Ask logging (Axiom)

`functions/ask/handler.mjs` emits one structured `{"event":"ask_query",...}`
JSON line per invocation via `console.log`, on **both** the success and
failure paths (`logAsk()`), so it's a single greppable event key in
CloudWatch Logs (see delivery note below). Fields: `site` (`pondview` |
`essexcrossing`), `question`, `outcome`, `latency_ms`, `model`,
`input_tokens` / `output_tokens`, `answer_produced`, `grounded`,
`upstream_status`, `error`. `outcome` is one of `success` | `upstream_error` |
`rate_limited` | `rejected`; `timeout` is reserved but not currently
reachable — the platform Lambda timeout kills the process before any line can
be written, so there's no code path to emit it from today. The one-time
`console.log('anthropic_error', ...)` line this replaced is folded into the
structured event (`outcome: 'upstream_error'`) rather than kept alongside it,
to maintain one log line per invocation — a second line for the same request
would land as a second, unrelated record.

**Privacy decision (question text).** The handler already truncates
`question` to 500 characters before using it in the prompt
(`String(body.question || '').slice(0, 500)`); the log reuses that same
already-bounded value rather than hashing or redacting it. Reasoning: a
resident's own phrasing is the site's highest-value signal for finding
content gaps (issue #23) and a bare hash destroys that value entirely, while
truncation already bounds the blast radius of any one line. This is a
narrower privacy surface than it looks: the log carries no client IP, no
session/cookie, and no header that could tie a question to a person — `site`
and `question` are the only per-request fields, everything else is
outcome/performance metadata. The residual risk is that a resident could
*type* an identifying detail into the question itself (a neighbor's name, a
specific address); the handler can't distinguish that from an ordinary
question, so **Axiom retention on this event should be set short** (30–90
days, not the default/indefinite) — long enough for content-gap and
cost/abuse analysis, short enough to bound that residual exposure. The
`grounded` field is a best-effort heuristic (pattern-matched against the
model's decline phrasing, since the model returns no structured grounding
signal) — treat it as directional, not authoritative.

**Delivery — CloudWatch today, Axiom pending.** The Ask endpoint is an AWS
Lambda (deployed by solidago's `modules/ask-lambda`), not an ECS container —
it has no FireLens sidecar and no Axiom wiring. `console.log` lands in
CloudWatch Logs at `/aws/lambda/<function-name>`, with **14-day default
retention** — shorter than the 30–90 days recommended above for this event
(a default nobody chose for this purpose; raise it in the solidago module
when addressing #144). Delivery to CloudWatch is verifiable today; the
structured events emit on every code path as locally verified. Routing these
logs onward to Axiom requires a CloudWatch Logs subscription filter or
equivalent — that plumbing does not exist yet and is tracked in
`lentago/solidago#144`. Build the outcome/latency/cost panels
(`lentago/drosera#161`) only after #144 lands.

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
