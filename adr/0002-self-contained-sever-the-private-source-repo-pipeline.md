# ADR-0002: Self-contained — sever the private source-repo publish pipeline

**Status:** Accepted (2026-07-17; reconstructed 2026-08-13)

## Context

Before PR #2, this repo's generated site output was committed here but
originated in a private source repo, published one-way into this one. That
left this public repo unable to regenerate, audit, or independently enforce
its own content rules — the source of truth for the prose, the library, and
the timeline lived somewhere this repo couldn't see or rebuild from.

## Decision

**Carry the public-record source directly in this repo and regenerate the
site at build time.** PR #2 added the source — `library/` (`manifest.json`
+ `files/` + `text/` for the 35 public-record documents), `timeline/
events.json` (18 public events), `attachments/` (16 allow-listed images) —
and a generator, `scripts/sync-content.mjs`, wired in as the `prebuild`/
`predev` hook, turning that local source into the document pages, the
timeline, and the Ask index. `scripts/check-content.mjs` was added
alongside it to enforce the hard content rules at build time:
public-record-only, no resident names outside the recorded documents, and
every library entry carries a `verify: {label, url}` — "a record nobody can
check independently doesn't belong in the library" (CLAUDE.md). Generated
output is no longer committed; it's gitignored and rebuilt on every build.

PR #2 verified the regenerated output was **byte-identical** to what had
previously been committed (the timeline, all 35 library pages, PDFs/images,
and the attachments and RAG index), and cross-checked that none of the
private repo's 60 internal documents or 3 internal attachments carried over
into this repo.

## Alternatives

- **Recorded (the prior state, not a chosen alternative):** keep syncing
  generated output one-way from the private source repo. Superseded — this
  repo could not regenerate, audit, or enforce its own hygiene invariants
  against source it didn't hold, which is the reason PR #2 exists.
- **Retrospective — not considered at the time:** make the private source
  repo itself public instead of duplicating a public-record subset here.
  *Worse* — the private repo evidently holds material beyond public-record
  scope (PR #2's cross-check found 60 internal documents and 3 internal
  attachments that were deliberately excluded here); publishing it wholesale
  would leak exactly the non-public-record content the hard rules exist to
  keep out.
- **Retrospective — not considered at the time:** hand-copy the generated
  output once to end the live dependency, without adding a source tree or a
  generator. *Lateral* — this would satisfy "self-contained" for a single
  snapshot, but every future document addition would need manual
  regeneration and diffing rather than `scripts/sync-content.mjs` +
  `scripts/check-content.mjs` doing it automatically on every build; it
  trades a one-time dependency for an ongoing maintenance cost the chosen
  design avoids.

## Consequences

- Adding a public-record document is a local, auditable change (add the
  file + a `manifest.json` entry + a text extract; `npm run build`
  regenerates everything downstream).
- `scripts/check-content.mjs` runs on every build via npm's `postbuild`
  hook and fails the build if the public-record-only or anonymity
  invariants slip.
- Generated output (`src/content/docs/**`, `public/library/**`,
  `public/attachments/**`, `public/ask/rag-index.json`) is gitignored — an
  uncommitted page's "Last updated" date shows the build time rather than a
  git-history date until the source file is committed.
