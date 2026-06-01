import type Anthropic from "@anthropic-ai/sdk";

import {
  CONFIDENCE_LEVELS,
  CONTENT_TYPE_VALUES,
  CORE_CRITERIA,
  CRITERION_RUBRIC,
  CRITERION_WEIGHT,
  FRAMING_VALUES,
  KILLSWITCH_FLAGS,
  LEVELS,
  LEVEL_BANDS,
  SCORE_CRITERIA,
  type Confidence,
  type ContentType,
  type CriterionAssessment,
  type CriterionScores,
  type Framing,
  type Killswitch,
  type ScoreCriterion,
} from "@/lib/score-criteria";
import type { Verdict } from "@/lib/verdicts";

// Matches the claim_status enum in the database schema.
export const CLAIM_STATUSES = [
  "supported",
  "partly_true",
  "misleading",
  "false",
  "unverifiable",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export type ExtractedClaims = { claims: string[] };

export type AnalysisSource = { url: string; title: string };
export type AnalysisClaim = {
  text: string;
  status: ClaimStatus;
  explanation: string;
  sourceQuote: string;
  sources: AnalysisSource[];
};

// Frozen audit snapshot persisted as JSON next to the article: the per-criterion
// reasoning + evidence (no dedicated column) and the killswitch signals. Lets a
// third party replay the verdict (see docs/SCORING.md §12).
export type AnalysisEvidence = {
  criteria: Partial<Record<ScoreCriterion, CriterionAssessment | null>>;
  killswitch: Killswitch;
};

// Final, post-aggregation analysis. The reliability score, verdict and global
// confidence here are DERIVED by the code (deriveScoring), never taken from the
// model. `scores` are the per-criterion numbers clamped into their bands.
export type Analysis = {
  title: string;
  summary: string;
  originalSummary: string;
  language: string;
  verdict: Verdict;
  reliabilityScore: number | null;
  globalConfidence: Confidence;
  criteriaVersion: string;
  modelVersion: string;
  scores: CriterionScores;
  framing: Framing;
  contentType: ContentType;
  killswitch: Killswitch;
  evidence: AnalysisEvidence;
  tags: string[];
  claims: AnalysisClaim[];
};

export type Rewrite = {
  locale: string;
  title: string;
  body: string;
};

export const recordClaimsTool: Anthropic.Tool = {
  name: "record_claims",
  description:
    "Record the distinct, checkable factual claims made in the article.",
  input_schema: {
    type: "object",
    properties: {
      claims: {
        type: "array",
        description: "Verifiable factual claims, each as a standalone sentence.",
        items: { type: "string" },
      },
    },
    required: ["claims"],
    additionalProperties: false,
  },
};

// Criteria whose evidence (rationale AND sources) is mandatory: you may not
// score them "from memory". The others still require a rationale.
const EVIDENCE_STRICT: readonly ScoreCriterion[] = [
  "factuality",
  "corroboration",
  "sourcing",
];

function criterionDescription(criterion: ScoreCriterion): string {
  const rubric = CRITERION_RUBRIC[criterion];
  const levels = LEVELS.map((level) => {
    const [min, max] = LEVEL_BANDS[level];
    return `L${level} (${min}-${max}): ${rubric.levels[level]}`;
  }).join(" ");
  return [
    rubric.definition,
    `Weight ${CRITERION_WEIGHT[criterion]}.`,
    `Checklist: ${rubric.checklist.join(" ")}`,
    `Levels: ${levels}`,
  ].join(" ");
}

function criterionProperty(criterion: ScoreCriterion): Record<string, unknown> {
  const required = ["level", "score", "confidence", "rationale"];
  if (EVIDENCE_STRICT.includes(criterion)) required.push("sources");
  return {
    type: "object",
    description: criterionDescription(criterion),
    properties: {
      level: {
        type: "integer",
        enum: [...LEVELS],
        description: "Anchored level L0-L3; fixes the band before refining.",
      },
      score: {
        type: "integer",
        description:
          "Refined 0-100 score INSIDE the band of the chosen level (the code clamps it to the band).",
      },
      confidence: { type: "string", enum: [...CONFIDENCE_LEVELS] },
      rationale: {
        type: "string",
        description: "1-2 sentences justifying the level from the checklist.",
      },
      sources: {
        type: "array",
        items: { type: "string" },
        description: "URLs you actually consulted. No invented sources.",
      },
    },
    required,
    additionalProperties: false,
  };
}

function killswitchSignalProperty(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      value: { type: "boolean" },
      rationale: { type: "string" },
      sources: { type: "array", items: { type: "string" } },
    },
    required: ["value", "rationale", "sources"],
    additionalProperties: false,
  };
}

const criteriaProperties = Object.fromEntries(
  SCORE_CRITERIA.map((criterion) => [criterion, criterionProperty(criterion)]),
);
const killswitchProperties = Object.fromEntries(
  KILLSWITCH_FLAGS.map((flag) => [flag, killswitchSignalProperty()]),
);

export const recordAnalysisTool: Anthropic.Tool = {
  name: "record_analysis",
  description:
    "Record the per-criterion assessment, killswitch flags and descriptors. " +
    "Do NOT provide an overall reliability score, verdict or global confidence — the code derives those.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "A neutral headline framed as the central claim/question under examination.",
      },
      summary: {
        type: "string",
        description: "A one or two sentence dek summarizing the fact-check.",
      },
      originalSummary: {
        type: "string",
        description:
          "A neutral 3-5 sentence paraphrase of what the original article says (in your own words, NEVER copying its sentences). Same language as the article.",
      },
      language: {
        type: "string",
        description:
          "The language of the article and of your output, as a short code (e.g. 'fr', 'en').",
      },
      criteria: {
        type: "object",
        description:
          "Per-criterion assessment. Always score the five core criteria; OMIT recency entirely for timeless content.",
        properties: criteriaProperties,
        required: [...CORE_CRITERIA],
        additionalProperties: false,
      },
      killswitch: {
        type: "object",
        description:
          "Deterministic kill flags. Set value:true ONLY with evidence; the code applies the cap.",
        properties: killswitchProperties,
        required: [...KILLSWITCH_FLAGS],
        additionalProperties: false,
      },
      descriptors: {
        type: "object",
        description:
          "Unscored descriptors, shown separately. They never affect reliability.",
        properties: {
          framing: { type: "string", enum: [...FRAMING_VALUES] },
          contentType: { type: "string", enum: [...CONTENT_TYPE_VALUES] },
        },
        required: ["framing", "contentType"],
        additionalProperties: false,
      },
      tags: {
        type: "array",
        description: "1-4 thematic topic labels (e.g. Tech, Politics, Health).",
        items: { type: "string" },
      },
      claims: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string" },
            status: { type: "string", enum: [...CLAIM_STATUSES] },
            explanation: {
              type: "string",
              description: "Why this status, referencing the sources.",
            },
            sourceQuote: {
              type: "string",
              description:
                "The exact sentence(s) copied verbatim from the article body that this claim is based on, so it can be located in the original text. Empty string if the claim is not stated in a specific passage.",
            },
            sources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  title: { type: "string" },
                },
                required: ["url", "title"],
                additionalProperties: false,
              },
            },
          },
          required: ["text", "status", "explanation", "sourceQuote", "sources"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "title",
      "summary",
      "originalSummary",
      "language",
      "criteria",
      "killswitch",
      "descriptors",
      "tags",
      "claims",
    ],
    additionalProperties: false,
  },
};

export const recordRewriteTool: Anthropic.Tool = {
  name: "record_rewrite",
  description:
    "Record an Unbunked-fiable rewrite of the article in the requested language.",
  input_schema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Rewritten title in the requested language. Reformulate; do NOT copy the original headline.",
      },
      body: {
        type: "string",
        description:
          "Full rewritten article in markdown, in the requested language. Preserve the tone and structure of the original but write entirely in your own words — never copy sentences. Correct any false or misleading statements inline. At every point where you correct, nuance or expand a claim that was fact-checked, insert a marker of the form [[claim:N]] right after the relevant sentence (N is the 1-based claim number).",
      },
    },
    required: ["title", "body"],
    additionalProperties: false,
  },
};
