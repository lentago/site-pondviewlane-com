# ADR-0003: Ask-box privacy — log truncated question text, not a hash or a redaction

**Status:** Accepted (2026-07-24; reconstructed 2026-08-13)

## Context

`functions/ask/handler.mjs` logged exactly one line —
`console.log('anthropic_error', ...)`, and only on upstream API failure.
Issue #23 named the gap: "the Ask box is the site's most distinctive
feature and the only place a visitor states, in their own words, what they
want from the records," yet none of it — the question, the outcome,
latency, or cost — was captured. The issue set the privacy constraints as
load-bearing given the site's public-record-only, no-resident-names
posture: no client IP, no session identifier, no cookie, nothing that
correlates a question to a person; question text itself could carry
identifying detail a resident typed in, so the retention/redaction stance
had to be a deliberate, documented decision rather than a default.

## Decision

**Emit one structured `{"event":"ask_query",...}` JSON line per
invocation**, on every code path (success, upstream error, rate-limited,
rejected) through a single `logAsk()` call site — FireLens's `json_lines`
Axiom ingest needs exactly one well-formed JSON line per event, so the
handler builds the full object before a single `console.log`. **Question
text is logged truncated to the handler's existing 500-character bound**
(`String(body.question || '').slice(0, 500)`, already applied for prompt
construction) rather than hashed or further redacted. **No client IP,
session identifier, or cookie is logged** — `site` and `question` are the
only per-request fields; everything else (`outcome`, `latency_ms`, `model`,
`input_tokens`/`output_tokens`, `answer_produced`, the `grounded`
heuristic, `upstream_status`, `error`) is outcome/performance metadata.

## Alternatives

- **Recorded:** hash the question text. Rejected — "a bare hash destroys
  that value entirely": a resident's own phrasing is the site's
  highest-value signal for finding content gaps (the reason issue #23
  exists), and a hash can't be read or queried for that purpose.
- **Recorded:** redact the question text (strip names/addresses).
  Rejected in favor of truncation — redaction can't reliably tell an
  identifying detail from ordinary phrasing without either failing open or
  destroying meaning; truncation already bounds the size of any one line,
  and a short Axiom retention window (30–90 days, not indefinite) was
  chosen to bound the residual exposure instead.
- **Recorded:** keep the old `anthropic_error` line alongside the new
  structured event, rather than folding it in. Rejected — FireLens's
  `json_lines` ingest wants one event per line; a second line for the same
  request would land as a second, unrelated record instead of one row
  carrying the full outcome.
- **Retrospective — not considered at the time:** log a short fixed-length
  prefix (e.g. the first 50 characters) instead of reusing the existing
  500-character bound. *Worse* — 50 characters would cut off most real
  questions mid-sentence, destroying the content-gap signal the logging
  exists to capture, for only a marginal privacy gain over an already
  size-bounded line.
- **Retrospective — not considered at the time:** run each question through
  a PII-scrubbing model or library before logging. *Lateral* — it would
  reduce, not eliminate, the residual risk of a resident naming a neighbor,
  at the cost of a second model call (latency and spend on every request)
  and a maintenance surface a single-handler Lambda doesn't otherwise
  carry; the recorded decision treats a short retention window, not
  scrubbing, as the mitigation for that residual risk.

## Consequences

- Retention on this event should be set short (30–90 days) at the Axiom
  end, not indefinite — not yet actionable, since delivery to Axiom is
  still pending. The Ask endpoint is an AWS Lambda (`module.ask_pondview`),
  not an ECS container, so it has no FireLens sidecar; `console.log` lands
  in CloudWatch Logs at `/aws/lambda/<function-name>` today, with a
  14-day default retention — shorter than the 30–90 days recommended for
  this event's purpose. Routing to Axiom is tracked in
  `lentago/solidago#144`.
- `grounded` is a best-effort heuristic (pattern-matched against the
  model's decline phrasing, since the model returns no structured
  grounding signal) — directional for triage, not authoritative.
- Outcome/latency/cost panels (`lentago/drosera#161`) wait on `#144`
  landing.
- This repo changes only the reference copy of the handler; the deployed
  artifact is the vendored copy in solidago's `modules/ask-lambda`, so the
  logging change had to be mirrored there in the same change for anything
  to actually deploy.
