# Architecture decision records

These records were reconstructed on 2026-08-13 from this repo's commit
history, issues, and pull requests, and from `CLAUDE.md`'s accumulated
operational notes — not written contemporaneously with the decisions
themselves. Each entry's `Status` line carries the **original decision
date** alongside the reconstruction date; the Context/Decision/Consequences
sections describe what was decided and why, sourced from the evidence cited
in each record. Where the evidence didn't fully support a claim, it was
dropped or hedged rather than asserted. Each record's Alternatives section
also carries one or two options marked *"retrospective — not considered at
the time"* — plausible designs evaluated now, for contrast, and explicitly
not presented as choices weighed when the decision was originally made.

| ADR | Decision |
|---|---|
| [0001](0001-two-apex-domains-one-repo-one-fact-base.md) | Two apex domains, one repo, one fact base |
| [0002](0002-self-contained-sever-the-private-source-repo-pipeline.md) | Self-contained — sever the private source-repo publish pipeline |
| [0003](0003-ask-privacy-truncate-question-text-not-hash-or-redact.md) | Ask-box privacy — log truncated question text, not a hash or a redaction |
| [0004](0004-two-domain-build-logic-in-package-json-not-workflow-yaml.md) | Two-domain build logic lives in `package.json` scripts, not workflow YAML |
