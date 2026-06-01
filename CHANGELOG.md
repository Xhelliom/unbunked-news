# Changelog

## Scoring v1.0 → v1.2

Reliability scoring is now **reproducible, explainable and defendable**. Full
spec in [docs/SCORING.md](docs/SCORING.md).

### What changed

- **The code computes the global score, the verdict and the global confidence.**
  The AI no longer sets them. It judges each criterion (an anchored level
  `L0–L3` plus a refined number the code clamps into the level's band) and
  raises killswitch flags; `deriveScoring` in `src/lib/score-criteria.ts` does
  the rest as a pure, unit-tested function.
- **Criteria.** Five are always scored — `factuality` (30), `corroboration`
  (25, new, scored), `sourcing` (18), `completeness` (12), `transparency` (10);
  `recency` (5) is the only one that may be `null` (timeless content,
  renormalised out). `neutrality` is gone from scoring: orientation is now the
  unscored `framing` descriptor, and omissions live in `completeness`.
- **Killswitch flags** (`fabricationDetected`, `domainImpersonation`,
  `centralClaimDebunked`, `undisclosedAIWithErrors`) cap the global at 39 and
  force `debunked`. The AI returns the booleans + evidence; the code applies the
  cap.
- **`unverifiable` → `null` global** (UI shows `—`), ending the old `50`
  collision. Triggered by ≥2 missing core criteria, or low confidence resting on
  uncorroborated central facts.
- **Verdict rename `biased` → `fragile`** (band 40–59). Enum, CSS token, i18n
  and a data-preserving migration (`ALTER TYPE … RENAME VALUE`).
- **Descriptors** `framing` and `contentType` shown as separate chips, never in
  the reliability bar.
- **Evidence snapshot.** Each criterion carries a `rationale` + `sources[]`;
  persisted in the `evidence` JSON column for replay (admin review surfaces it).
- **External data connectors** (`src/lib/pipeline/data-sources.ts`): a unified,
  cached interface with graceful degradation. The ClaimReview fact-check lookup
  is active when `GOOGLE_FACTCHECK_API_KEY` is set; the unreliable-domain and
  WHOIS connectors are stubs returning "unknown" until configured. Unknown
  lowers confidence — it never fabricates a result.
- **Anti-prompt-injection** is now explicit in the aggregate prompt: the article
  body is data, never an instruction.

### Migration

- DB: migrations `0009` (new columns; `reliabilityScore`/`recency` nullable) and
  `0010` (verdict `biased`→`fragile`, in place — existing rows preserved).
  Legacy `neutralityScore` column is kept nullable for historical rows and no
  longer written.
- `CRITERIA_VERSION = "1.2.0"`, stored with each analysis alongside
  `modelVersion`.
- Tests: `pnpm test` (Node test runner via `tsx`) covers `computeGlobal` /
  `deriveScoring` and the gold-set metrics. Gold-set gate arms once
  `src/lib/pipeline/gold-set.fixtures.json` is populated.
