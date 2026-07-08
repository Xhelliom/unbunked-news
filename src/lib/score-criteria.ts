import type { Verdict } from "@/lib/verdicts";

// Single source of truth for the v1.2 reliability scoring. The DB columns, the
// pipeline tool schema, the admin form and the public UI all derive from the
// lists, weights and pure functions defined here. See docs/SCORING.md.
//
// v1.2 in one line: the AI judges each criterion (anchored level L0–L3 + a
// refined number inside the level's band) and raises killswitch flags; the CODE
// clamps, weights, caps and derives the global score, the verdict and the
// global confidence. The AI never sets the global, the verdict or the global
// confidence.

export const CRITERIA_VERSION = "1.2.0";

// Five criteria are always scored; recency is the only one that may be null
// (timeless content, where the criterion does not apply and is renormalised
// out of the weighted average).
export const CORE_CRITERIA = [
  "factuality",
  "corroboration",
  "sourcing",
  "completeness",
  "transparency",
] as const;
export const CONDITIONAL_CRITERIA = ["recency"] as const;
export const SCORE_CRITERIA = [
  ...CORE_CRITERIA,
  ...CONDITIONAL_CRITERIA,
] as const;

export type CoreCriterion = (typeof CORE_CRITERIA)[number];
export type ConditionalCriterion = (typeof CONDITIONAL_CRITERIA)[number];
export type ScoreCriterion = (typeof SCORE_CRITERIA)[number];

// Fixed weights, summing to 100 when every criterion is present. When recency
// is null the weights are renormalised over the present criteria (see
// computeGlobal).
export const CRITERION_WEIGHT: Record<ScoreCriterion, number> = {
  factuality: 30,
  corroboration: 25,
  sourcing: 18,
  completeness: 12,
  transparency: 10,
  recency: 5,
};

// Anchored levels. The AI picks a level first (fixes the band, aligned with the
// verdict colours), then refines a number the code clamps back into the band.
export const LEVELS = [0, 1, 2, 3] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_BANDS: Record<Level, readonly [number, number]> = {
  0: [0, 39],
  1: [40, 59],
  2: [60, 84],
  3: [85, 100],
};

// A criterion at or below this level is surfaced as a "weak criterion" warning
// badge on feed cards. Replaces the old numeric LOW_CRITERION_THRESHOLD.
export const LOW_CRITERION_LEVEL: Level = 1;

// Killswitch flags. The AI returns the booleans (with rationale + sources); the
// CODE applies the cap. Any flag true ⇒ global capped and verdict "debunked".
export const KILLSWITCH_FLAGS = [
  "fabricationDetected",
  "domainImpersonation",
  "centralClaimDebunked",
  "undisclosedAIWithErrors",
] as const;
export type KillswitchFlag = (typeof KILLSWITCH_FLAGS)[number];
export const KILLSWITCH_CAP = 39;

export type KillswitchSignal = {
  value: boolean;
  rationale: string;
  sources: string[];
};
export type Killswitch = Record<KillswitchFlag, KillswitchSignal>;

export function anyKillswitchRaised(killswitch: Killswitch): boolean {
  return KILLSWITCH_FLAGS.some((flag) => killswitch[flag].value);
}

// Unscored descriptors, shown as separate chips, never folded into the score.
export const FRAMING_VALUES = [
  "neutre",
  "orienté-modéré",
  "orienté-marqué",
  "militant",
] as const;
export const CONTENT_TYPE_VALUES = [
  "actualité",
  "analyse",
  "opinion",
  "sponsorisé",
  "généré-IA",
] as const;
export type Framing = (typeof FRAMING_VALUES)[number];
export type ContentType = (typeof CONTENT_TYPE_VALUES)[number];

export const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

// Slider starting position in the admin form only. NOT a computed score: a
// blank/disabled criterion is null, never 50. Kept solely as the range input's
// default value so an editor scoring from scratch starts in the middle.
export const NEUTRAL_SCORE = 50;

// Per-criterion rubric used to build the AI tool schema and the aggregate
// prompt. Prompt-facing content (English, like the other pipeline prompts);
// the user-facing labels live in next-intl (messages/*.json), not here.
export type CriterionRubric = {
  definition: string;
  checklist: readonly string[];
  levels: Record<Level, string>;
};

export const CRITERION_RUBRIC: Record<ScoreCriterion, CriterionRubric> = {
  factuality: {
    definition:
      "Are the article's factual claims true and verified against the sources?",
    checklist: [
      "Are central claims attributed to a verifiable source?",
      "Checked against sources, are they accurate (no truncated quotes, no distorted data)?",
      "Are any claims contradicted by solid evidence?",
      "Are figures, dates, places and names consistent and correct?",
    ],
    levels: {
      3: "Central claims accurate, at most minor imprecisions.",
      2: "Mostly accurate, ≥1 notable but non-central imprecision.",
      1: "≥1 central claim unsupported/doubtful, or a distortion.",
      0: "A demonstrated central falsehood (→ raise fabricationDetected).",
    },
  },
  corroboration: {
    definition:
      "Are the central facts confirmed by independent external sources you actually retrieved (not the same wire copy reprinted)?",
    checklist: [
      "Does the central fact appear in ≥2 genuinely independent sources?",
      "Are those sources reliable (not themselves dubious)?",
      "Does an existing fact-check confirm or refute the fact?",
      "Are the found sources independent of each other, or one origin recopied?",
    ],
    levels: {
      3: "≥2 reliable independent sources confirm.",
      2: "1 reliable source confirms, or partial convergence.",
      1: "No corroboration despite searching, or only non-independent reprints.",
      0: "Reliable sources contradict the central fact (→ consider centralClaimDebunked).",
    },
  },
  sourcing: {
    definition:
      "Are the references cited by the article solid: named, independent, primary, verifiable?",
    checklist: [
      "How many sources does the article cite? Named or anonymous?",
      "Primary (document, direct witness) or only secondary (reprint)?",
      "≥2 sources on contested points?",
      "Verifiable, working links/references?",
    ],
    levels: {
      3: "Named, primary, verifiable sources, ≥2 on contested points.",
      2: "Mostly credible, some secondary/weakly attributed.",
      1: "Mostly anonymous/unverifiable, or a central point on a single source.",
      0: "No sources, or non-existent/fabricated sources.",
    },
  },
  completeness: {
    definition:
      "Are the important facts present, or does the article distort by strategic omission or context deformation? Do NOT penalise tone — only omissions that change understanding.",
    checklist: [
      "Is the context essential to understanding present?",
      "Is a known fact missing that would reverse the reading?",
      "Are relevant nuances/counter-arguments mentioned?",
      "Are any quotes taken out of context?",
    ],
    levels: {
      3: "Essential context present, no decisive omission.",
      2: "Broadly complete, one minor omission/gap.",
      1: "Strategic omission of an important element.",
      0: "Severe distortion by omission (decisive facts knowingly dropped).",
    },
  },
  transparency: {
    definition:
      "Are the author, date, editorial owner and the source's ownership/funding identifiable? Opacity IS the defect — a site hiding its author/owner gets a low level, never null.",
    checklist: [
      "Author identified (full name, ideally bio/contact)?",
      "Publication date present?",
      "Site owner/publisher identifiable?",
      "Funding and conflicts of interest disclosed?",
    ],
    levels: {
      3: "Author + date + editorial owner + funding all clear.",
      2: "Author and date present, partial editorial transparency.",
      1: "Minimal byline, opaque publisher.",
      0: "Anonymous and opaque.",
    },
  },
  recency: {
    definition:
      "Is the information up to date, or stale/superseded by later facts? Return null ONLY for timeless content where recency does not apply.",
    checklist: [
      "Is a date present?",
      "Do later facts invalidate the information?",
      "Is the topic time-sensitive or timeless?",
    ],
    levels: {
      3: "Up to date.",
      2: "Dated but still valid.",
      1: "Partly superseded.",
      0: "Stale, presented as current.",
    },
  },
};

// Structural shape of the criterion columns on an article row. Matches the
// nullable integer columns on the articles table.
export type CriterionScores = {
  factualityScore: number | null;
  corroborationScore: number | null;
  sourcingScore: number | null;
  completenessScore: number | null;
  transparencyScore: number | null;
  recencyScore: number | null;
};

// Maps each criterion to its article/DB column. Reused for reading scores and
// for naming the admin form fields, so the wire and the schema never drift.
export const CRITERION_COLUMN: Record<ScoreCriterion, keyof CriterionScores> = {
  factuality: "factualityScore",
  corroboration: "corroborationScore",
  sourcing: "sourcingScore",
  completeness: "completenessScore",
  transparency: "transparencyScore",
  recency: "recencyScore",
};

export function isConditionalCriterion(
  criterion: ScoreCriterion,
): criterion is ConditionalCriterion {
  return (CONDITIONAL_CRITERIA as readonly string[]).includes(criterion);
}

export function criterionValue(
  scores: CriterionScores,
  criterion: ScoreCriterion,
): number | null {
  return scores[CRITERION_COLUMN[criterion]];
}

// Coerces a raw value to an integer in 0-100, or null when it isn't a finite
// number. Used by the admin action's form parser.
export function clampScore(value: unknown): number | null {
  const raw = Number(value);
  return Number.isFinite(raw)
    ? Math.min(100, Math.max(0, Math.round(raw)))
    : null;
}

function isLevel(value: unknown): value is Level {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

// Clamps a refined score back into the band of its level. The level is the
// stable anchor; the refined number only adds detail and can never cross into
// another colour band.
export function clampToBand(level: Level, score: number): number {
  const [min, max] = LEVEL_BANDS[level];
  return Math.min(max, Math.max(min, Math.round(score)));
}

// The level a stored 0-100 score falls into. Because scores are clamped to their
// level's band, this round-trips: it lets the feed badge and the bars recover
// the level without persisting it separately.
export function levelForScore(score: number): Level {
  if (score >= LEVEL_BANDS[3][0]) return 3;
  if (score >= LEVEL_BANDS[2][0]) return 2;
  if (score >= LEVEL_BANDS[1][0]) return 1;
  return 0;
}

// The score band each verdict occupies, derived from LEVEL_BANDS so the public
// methodology page and the scoring logic never drift. `unverifiable` has no
// band: it is the "no number" state (reliabilityScore is null).
export const VERDICT_BAND: Record<Verdict, readonly [number, number] | null> = {
  reliable: LEVEL_BANDS[3],
  nuanced: LEVEL_BANDS[2],
  fragile: LEVEL_BANDS[1],
  debunked: LEVEL_BANDS[0],
  unverifiable: null,
};

// Maps a 0-100 score to the verdict colour family used for its progress bar,
// reusing the same bands as the overall verdict.
export function scoreBand(score: number): Verdict {
  if (score >= LEVEL_BANDS[3][0]) return "reliable";
  if (score >= LEVEL_BANDS[2][0]) return "nuanced";
  if (score >= LEVEL_BANDS[1][0]) return "fragile";
  return "debunked";
}

// The weakest scored criterion whose level is at or below LOW_CRITERION_LEVEL,
// or null when all scored criteria are healthy. Absent (null) criteria are
// ignored. Used by feed cards to flag a weak article.
export function lowestWeakCriterion(
  scores: CriterionScores,
): ScoreCriterion | null {
  let weakest: { criterion: ScoreCriterion; value: number } | null = null;
  for (const criterion of SCORE_CRITERIA) {
    const value = criterionValue(scores, criterion);
    if (value === null || levelForScore(value) > LOW_CRITERION_LEVEL) continue;
    if (!weakest || value < weakest.value) {
      weakest = { criterion, value };
    }
  }
  return weakest?.criterion ?? null;
}

// --- Deterministic aggregation (pure; no server-only, so it is unit-testable) ---

// One criterion as judged by the AI: a level, a refined score, a confidence and
// the evidence behind it.
export type CriterionAssessment = {
  level: Level;
  score: number;
  confidence: Confidence;
  rationale: string;
  sources: string[];
};

// The AI's per-criterion output. Core criteria may be absent (the AI omitted
// them) — absent is NOT zero; it is excluded from the average and lowers
// confidence. Only recency may legitimately be null (timeless content).
export type CriterionAssessments = Partial<
  Record<ScoreCriterion, CriterionAssessment | null>
>;

export type ScoringResult = {
  reliabilityScore: number | null;
  verdict: Verdict;
  globalConfidence: Confidence;
};

// Renormalised weighted average of the present criteria, each score first
// clamped into its level's band. Returns null when no criterion is present.
export function computeGlobal(criteria: CriterionAssessments): number | null {
  let weighted = 0;
  let totalWeight = 0;
  for (const criterion of SCORE_CRITERIA) {
    const assessment = criteria[criterion];
    if (!assessment) continue;
    const weight = CRITERION_WEIGHT[criterion];
    weighted += clampToBand(assessment.level, assessment.score) * weight;
    totalWeight += weight;
  }
  return totalWeight === 0 ? null : Math.round(weighted / totalWeight);
}

function deriveVerdict(global: number): Verdict {
  if (global >= LEVEL_BANDS[3][0]) return "reliable";
  if (global >= LEVEL_BANDS[2][0]) return "nuanced";
  if (global >= LEVEL_BANDS[1][0]) return "fragile";
  return "debunked";
}

// Global confidence is low when any core criterion is in low confidence or is
// missing entirely; high when every core criterion is present and high;
// medium otherwise.
function deriveGlobalConfidence(criteria: CriterionAssessments): Confidence {
  let allHigh = true;
  for (const criterion of CORE_CRITERIA) {
    const assessment = criteria[criterion];
    if (!assessment || assessment.confidence === "low") return "low";
    if (assessment.confidence !== "high") allHigh = false;
  }
  return allHigh ? "high" : "medium";
}

// Validates one raw criterion assessment from the (untyped) tool input. Returns
// null when the shape is wrong or the criterion was omitted — never invents a
// value.
export function toAssessment(value: unknown): CriterionAssessment | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!isLevel(raw.level)) return null;
  const score = clampScore(raw.score);
  if (score === null) return null;
  const confidence: Confidence =
    raw.confidence === "low" || raw.confidence === "high"
      ? raw.confidence
      : "medium";
  return {
    level: raw.level,
    score: clampToBand(raw.level, score),
    confidence,
    rationale: typeof raw.rationale === "string" ? raw.rationale : "",
    sources: Array.isArray(raw.sources)
      ? raw.sources.filter((s): s is string => typeof s === "string")
      : [],
  };
}

// Validates the killswitch object from the (untyped) tool input. A flag is only
// "raised" when the AI explicitly returns value:true; anything malformed reads
// as false (we never invent a debunk).
export function toKillswitch(value: unknown): Killswitch {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return Object.fromEntries(
    KILLSWITCH_FLAGS.map((flag) => {
      const signal =
        raw[flag] && typeof raw[flag] === "object"
          ? (raw[flag] as Record<string, unknown>)
          : {};
      return [
        flag,
        {
          value: signal.value === true,
          rationale:
            typeof signal.rationale === "string" ? signal.rationale : "",
          sources: Array.isArray(signal.sources)
            ? signal.sources.filter((s): s is string => typeof s === "string")
            : [],
        },
      ];
    }),
  ) as Killswitch;
}

export function toFraming(value: unknown): Framing {
  return (FRAMING_VALUES as readonly string[]).includes(value as string)
    ? (value as Framing)
    : "neutre";
}

export function toContentType(value: unknown): ContentType {
  return (CONTENT_TYPE_VALUES as readonly string[]).includes(value as string)
    ? (value as ContentType)
    : "actualité";
}

// The whole §7–§9 decision, as a pure function: clamp + weight (computeGlobal),
// then unverifiable, killswitch cap and verdict. No AI call, no I/O — same
// inputs always yield the same result.
export function deriveScoring(
  criteria: CriterionAssessments,
  killswitchRaised: boolean,
): ScoringResult {
  const globalConfidence = deriveGlobalConfidence(criteria);

  const missingCore = CORE_CRITERIA.filter((c) => !criteria[c]).length;
  const corroboration = criteria.corroboration;
  const corroborationWeak =
    !corroboration || corroboration.level <= LOW_CRITERION_LEVEL;

  // ≥2 core criteria missing, or low confidence resting on uncorroborated
  // central facts ⇒ we cannot publish a number. global is null, UI shows "—".
  if (
    missingCore >= 2 ||
    (globalConfidence === "low" && corroborationWeak)
  ) {
    return { reliabilityScore: null, verdict: "unverifiable", globalConfidence };
  }

  const global = computeGlobal(criteria);
  if (global === null) {
    return { reliabilityScore: null, verdict: "unverifiable", globalConfidence };
  }

  if (killswitchRaised) {
    const capped = Math.min(global, KILLSWITCH_CAP);
    return { reliabilityScore: capped, verdict: "debunked", globalConfidence };
  }

  return {
    reliabilityScore: global,
    verdict: deriveVerdict(global),
    globalConfidence,
  };
}
