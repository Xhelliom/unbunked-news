import type Anthropic from "@anthropic-ai/sdk";

import { VERDICTS, type Verdict } from "@/lib/verdicts";

// Matches the claim_status enum in the database schema.
export const CLAIM_STATUSES = [
  "supported",
  "partly_true",
  "misleading",
  "false",
  "unverifiable",
] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

// Search engine that produced the verification evidence. Web search is billed
// separately from tokens (see src/lib/pipeline/pricing.ts). Only the native
// Anthropic search exists today; cheaper external providers will extend this
// list when they are wired in.
export const SEARCH_PROVIDERS = ["anthropic"] as const;
export type SearchProvider = (typeof SEARCH_PROVIDERS)[number];
export const DEFAULT_SEARCH_PROVIDER: SearchProvider = "anthropic";

export type ExtractedClaims = { claims: string[] };

export type AnalysisSource = { url: string; title: string };
export type AnalysisClaim = {
  text: string;
  status: ClaimStatus;
  explanation: string;
  sourceQuote: string;
  sources: AnalysisSource[];
};
export type Analysis = {
  title: string;
  summary: string;
  originalSummary: string;
  language: string;
  verdict: Verdict;
  reliabilityScore: number;
  factualityScore: number;
  sourcingScore: number;
  neutralityScore: number;
  completenessScore: number | null;
  transparencyScore: number | null;
  recencyScore: number | null;
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

export const recordAnalysisTool: Anthropic.Tool = {
  name: "record_analysis",
  description:
    "Record the final fact-check: a verdict, reliability score, and per-claim assessment.",
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
      verdict: {
        type: "string",
        enum: [...VERDICTS],
        description: "The overall verdict for the article.",
      },
      reliabilityScore: {
        type: "integer",
        description:
          "Overall reliability from 0 (false) to 100 (fully reliable). Must stay coherent with the verdict and the three sub-scores below.",
      },
      factualityScore: {
        type: "integer",
        description:
          "Factuality, 0-100: are the claims true and verified against the sources?",
      },
      sourcingScore: {
        type: "integer",
        description:
          "Sourcing, 0-100: are the references cited solid, independent, primary and verifiable?",
      },
      neutralityScore: {
        type: "integer",
        description:
          "Neutrality, 0-100: is the framing balanced, free of slanted tone or strategic omissions?",
      },
      completenessScore: {
        type: "integer",
        description:
          "OPTIONAL completeness, 0-100: are the important facts present rather than strategically omitted? Omit this field entirely if you cannot judge it reliably.",
      },
      transparencyScore: {
        type: "integer",
        description:
          "OPTIONAL transparency, 0-100: are the author, date, methodology and funding identifiable? Omit this field entirely if the article gives nothing to judge.",
      },
      recencyScore: {
        type: "integer",
        description:
          "OPTIONAL recency, 0-100: is the information up to date rather than stale or superseded? Omit this field entirely if recency is not relevant or cannot be judged.",
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
      "verdict",
      "reliabilityScore",
      "factualityScore",
      "sourcingScore",
      "neutralityScore",
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
