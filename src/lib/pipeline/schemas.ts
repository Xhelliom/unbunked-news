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
        description: "Overall reliability from 0 (false) to 100 (fully reliable).",
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
