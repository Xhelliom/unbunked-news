import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import type { ScrapedArticle } from "@/lib/scrape";
import { collectText, formatArticle, getClaude, MODEL } from "./client";
import type { AnalysisSource } from "./schemas";

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
};

function collectSources(content: Anthropic.ContentBlock[]): AnalysisSource[] {
  const sources: AnalysisSource[] = [];
  for (const block of content) {
    if (block.type !== "web_search_tool_result") continue;
    const results = block.content;
    if (!Array.isArray(results)) continue;
    for (const result of results) {
      if (result.type === "web_search_result") {
        sources.push({ url: result.url, title: result.title ?? result.url });
      }
    }
  }
  return sources;
}

export async function verifyClaims(
  article: ScrapedArticle,
  claims: string[],
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
  let message = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM,
    tools: SEARCH_TOOLS,
    messages,
  });
  allContent.push(...message.content);

  while (message.stop_reason === "pause_turn" && guard < 5) {
    messages.push({ role: "assistant", content: message.content });
    message = await client.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM,
      tools: SEARCH_TOOLS,
      messages,
    });
    allContent.push(...message.content);
    guard += 1;
  }

  const sources = collectSources(allContent);
  // De-duplicate by URL.
  const unique = [...new Map(sources.map((s) => [s.url, s])).values()];

  return {
    findings: collectText({ ...message, content: allContent }),
    sources: unique,
  };
}
