import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { AI_MODERATION_VERDICTS } from "@/lib/contributions/constants";

export const contributionClassificationOutputFormat: Anthropic.JSONOutputFormat = {
  type: "json_schema",
  schema: {
    description:
      "Triage a reader-submitted contribution (a correction or source suggestion) " +
      "to a fact-checking article, for moderation routing only.",
    type: "object",
    properties: {
      verdict: {
        type: "string",
        enum: [...AI_MODERATION_VERDICTS],
        description:
          "'clean' = a plausible, on-topic correction or source; 'suspicious' = " +
          "off-topic, low-quality, or you're unsure; 'spam' = advertising, abuse, " +
          "gibberish or obvious spam. When in doubt, prefer 'suspicious'.",
      },
      reason: {
        type: "string",
        description:
          "One short sentence justifying the verdict. Never quote the full " +
          "contribution back.",
      },
    },
    required: ["verdict", "reason"],
    additionalProperties: false,
  },
};
