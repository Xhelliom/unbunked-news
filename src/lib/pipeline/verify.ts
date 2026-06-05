import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import type { ScrapedArticle } from "@/lib/scrape";
import { safeHttpUrl } from "@/lib/safe-url";
import {
  addUsage,
  collectText,
  formatArticle,
  getClaude,
  usageOf,
  withCurrentDate,
  ZERO_USAGE,
  type TokenUsage,
} from "./client";
import { type StepDiagnostic } from "./diagnostics";
import {
  DEFAULT_SEARCH_PROVIDER,
  type AnalysisSource,
  type SearchProvider,
} from "./schemas";

// Bounds the pause_turn continuation loop: web search can ask to resume many
// times, but a runaway loop would burn tokens, so it stops after this many
// rounds and the diagnostics flag the truncation.
const MAX_SEARCH_ROUNDS = 5;

const SYSTEM =
  "You are a fact-checking researcher. For each claim, use web search to find " +
  "what reputable, independent sources say. Be skeptical of the original " +
  "article. Summarize the evidence for and against each claim and always note " +
  "the source URLs you relied on.";

const SEARCH_TOOLS: Anthropic.Messages.ToolUnion[] = [
  { type: "web_search_20250305", name: "web_search", max_uses: 5 },
];

export type VerificationFindings = {
  findings: string;
  sources: AnalysisSource[];
  usage: TokenUsage;
  searchRequests: number;
  searchProvider: SearchProvider;
  diagnostic: StepDiagnostic;
};

// Web search is billed per request, separately from tokens. The count is
// reported per response, so it is summed across the pause_turn continuations.
function searchRequestsOf(message: Anthropic.Message): number {
  return message.usage.server_tool_use?.web_search_requests ?? 0;
}

function collectSources(content: Anthropic.ContentBlock[]): AnalysisSource[] {
  const sources: AnalysisSource[] = [];
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    const results = block.content;
    if (!Array.isArray(results)) continue;
    for (const result of results) {
      if (result.type === "web_search_result") {
        // web_search returns arbitrary URLs; keep only real http(s) ones since
        // they are persisted and later rendered as public links.
        const url = safeHttpUrl(result.url);
        if (url) sources.push({ url, title: result.title ?? url });
      }
    }
  }
  return sources;
}

export async function verifyClaims(
  article: ScrapedArticle,
  claims: string[],
  model: string,
): Promise<VerificationFindings> {
  const client = getClaude();
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: formatArticle(article),
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text:
            "Verify each of these claims with web search:\n" +
            claims.map((claim, i) => `${i + 1}. ${claim}`).join("\n"),
        },
      ],
    },
  ];

  const allContent: Anthropic.ContentBlock[] = [];
  let guard = 0;
  let usage = ZERO_USAGE;
  let searchRequests = 0;
  let message = await client.messages.create({
    model,
    max_tokens: 8192,
    system: withCurrentDate(SYSTEM),
    tools: SEARCH_TOOLS,
    messages,
  });
  allContent.push(...message.content);
  usage = addUsage(usage, usageOf(message));
  searchRequests += searchRequestsOf(message);

  while (message.stop_reason === "pause_turn" && guard < MAX_SEARCH_ROUNDS) {
    messages.push({ role: "assistant", content: message.content });
    message = await client.messages.create({
      model,
      max_tokens: 8192,
      system: withCurrentDate(SYSTEM),
      tools: SEARCH_TOOLS,
      messages,
    });
    allContent.push(...message.content);
    usage = addUsage(usage, usageOf(message));
    searchRequests += searchRequestsOf(message);
    guard += 1;
  }

  const sources = collectSources(allContent);
  // De-duplicate by URL.
  const unique = [...new Map(sources.map((s) => [s.url, s])).values()];
  const findings = collectText({ ...message, content: allContent });

  const guardExhausted = message.stop_reason === "pause_turn";
  const warnings: string[] = [];
  if (guardExhausted) {
    warnings.push(
      `web search stopped after ${MAX_SEARCH_ROUNDS} rounds; findings may be incomplete`,
    );
  }
  if (findings.trim().length === 0) warnings.push("no textual findings returned");
  if (unique.length === 0) warnings.push("no sources found");

  const diagnostic: StepDiagnostic = {
    step: "verifying",
    model,
    stopReason: message.stop_reason,
    outputTokens: usage.outputTokens,
    truncated: false,
    metrics: {
      rounds: guard + 1,
      searchRequests,
      sources: unique.length,
      findingsChars: findings.length,
    },
    warnings,
  };

  return {
    findings,
    sources: unique,
    usage,
    searchRequests,
    searchProvider: DEFAULT_SEARCH_PROVIDER,
    diagnostic,
  };
}
