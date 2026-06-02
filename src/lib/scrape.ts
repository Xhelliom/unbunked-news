import { extractFromHtml } from "@extractus/article-extractor";

import {
  assessScrapeQuality,
  stripBoilerplate,
  type ScrapeQuality,
} from "@/lib/boilerplate";

export type ScrapedArticle = {
  url: string;
  title: string;
  sourceName: string;
  content: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: Date | null;
};

export type ScrapeMethod =
  | "extractor"
  | "ai-recovery"
  | "rendered-extractor"
  | "rendered-ai-recovery";

// Diagnostic trail of how the stored body was obtained, surfaced to admins so a
// bad scrape is debuggable: which stage won, whether a headless render was
// needed, how many candidate blocks the AI chose from, and what rejection
// triggered the AI fallback.
export type ScrapeProvenance = {
  method: ScrapeMethod;
  rendered: boolean;
  candidateBlocks: number | null;
  contentChars: number;
  aiTriggerReason: string | null;
};

export type ScrapeResult = {
  article: ScrapedArticle;
  provenance: ScrapeProvenance;
};

// Some publishers serve a stub to the default fetch agent; a browser-like UA
// gets the same static HTML a reader's browser receives (article body included,
// even behind a soft paywall overlay).
const SCRAPE_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 20_000;
const RENDER_TIMEOUT_MS = 30_000;

// Candidate-block filters for the AI body-recovery fallback: keep prose-shaped
// blocks, drop nav items, bare numbers, and embedded JSON/markup noise.
const MIN_BLOCK_CHARS = 40;
const MAX_BLOCK_CHARS = 3_000;
const MIN_BLOCK_WORDS = 6;
const MIN_LETTER_RATIO = 0.5;
const MAX_CANDIDATE_CHARS = 24_000;

// Injected so scraping stays decoupled from the AI pipeline (importing the
// Anthropic client here would create a server-only import cycle). Given the
// page's candidate text blocks, returns the selected article body verbatim, or
// an empty string when no block qualifies.
export type BodyRecoverer = (
  blocks: string[],
  meta: { title: string },
) => Promise<string>;

function hostnameToSource(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
}

// Splits article HTML into clean text paragraphs, preserving block boundaries
// (lost if we collapsed all whitespace). Inner whitespace within a paragraph is
// normalized to single spaces.
function htmlToParagraphs(html: string): string[] {
  return decodeEntities(
    html
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(
        /<\/(p|div|h[1-6]|li|blockquote|section|article|figcaption|tr)>/gi,
        "\n\n",
      )
      .replace(/<br\s*\/?>/gi, "\n\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length > 0);
}

function looksLikeProse(block: string): boolean {
  if (block.length < MIN_BLOCK_CHARS || block.length > MAX_BLOCK_CHARS) {
    return false;
  }
  if (block.split(/\s+/).length < MIN_BLOCK_WORDS) return false;
  const letters = (block.match(/\p{L}/gu) ?? []).length;
  return letters / block.length > MIN_LETTER_RATIO;
}

// Prose-shaped, deduplicated text blocks from the whole page, bounded in total
// size, for the AI fallback to pick the article body out of.
export function buildCandidateBlocks(html: string): string[] {
  const seen = new Set<string>();
  const blocks: string[] = [];
  let total = 0;
  for (const block of stripBoilerplate(htmlToParagraphs(html))) {
    if (!looksLikeProse(block) || seen.has(block)) continue;
    if (total + block.length > MAX_CANDIDATE_CHARS) break;
    seen.add(block);
    blocks.push(block);
    total += block.length;
  }
  return blocks;
}

type ExtractorResult = Awaited<ReturnType<typeof extractFromHtml>>;

function normalize(url: string, data: ExtractorResult): ScrapedArticle | null {
  if (!data?.content || !data.title) {
    return null;
  }
  return {
    url,
    title: data.title,
    sourceName: data.source ?? hostnameToSource(url),
    content: stripBoilerplate(htmlToParagraphs(data.content)).join("\n\n"),
    imageUrl: data.image ?? null,
    author: data.author ?? null,
    publishedAt: data.published ? new Date(data.published) : null,
  };
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": SCRAPE_USER_AGENT },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

// Last-resort render for pages whose body exists only after client-side JS, so
// the cheap fetch returns a shell. Requires a Chromium binary (CHROMIUM_PATH in
// production); returns null when unavailable so callers degrade gracefully.
async function renderHtml(url: string): Promise<string | null> {
  const executablePath =
    process.env.CHROMIUM_PATH ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) return null;

  const { launch } = await import("puppeteer-core");
  const browser = await launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: RENDER_TIMEOUT_MS,
    });
    return await page.content();
  } finally {
    await browser.close();
  }
}

// Re-runs the article body through the same paragraph cleaning normalize()
// applies, so a recovered body and an extracted one are shaped identically.
function cleanBody(body: string): string {
  return stripBoilerplate(
    body
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0),
  ).join("\n\n");
}

type Attempt = {
  result: ScrapedArticle | null;
  quality: ScrapeQuality;
  usedAi: boolean;
  candidateBlocks: number | null;
  aiTriggerReason: string | null;
};

// Extracts the best body obtainable from a single HTML document: the generic
// extractor first, then — if it grabbed a paywall teaser or nav menu while the
// real body sits elsewhere in the SAME HTML (Le Monde & co.) — the AI picks the
// article-body blocks out of the page verbatim, so downstream claim quotes
// still resolve.
async function attemptFromHtml(
  url: string,
  html: string,
  recoverBody?: BodyRecoverer,
): Promise<Attempt> {
  const result = normalize(url, await extractFromHtml(html, url));
  const quality: ScrapeQuality = result
    ? assessScrapeQuality(result.content)
    : { ok: false, reason: "extractor returned no usable content" };

  if (!result || quality.ok || !recoverBody) {
    return { result, quality, usedAi: false, candidateBlocks: null, aiTriggerReason: null };
  }

  const triggerReason = quality.reason;
  const blocks = buildCandidateBlocks(html);
  if (blocks.length === 0) {
    return { result, quality, usedAi: false, candidateBlocks: 0, aiTriggerReason: triggerReason };
  }

  const recovered = cleanBody(await recoverBody(blocks, { title: result.title }));
  const recoveredQuality = assessScrapeQuality(recovered);
  return recoveredQuality.ok
    ? {
        result: { ...result, content: recovered },
        quality: recoveredQuality,
        usedAi: true,
        candidateBlocks: blocks.length,
        aiTriggerReason: triggerReason,
      }
    : { result, quality, usedAi: false, candidateBlocks: blocks.length, aiTriggerReason: triggerReason };
}

export async function scrapeArticle(
  url: string,
  recoverBody?: BodyRecoverer,
): Promise<ScrapeResult> {
  const html = await fetchHtml(url);
  let attempt: Attempt = html
    ? await attemptFromHtml(url, html, recoverBody)
    : {
        result: null,
        quality: { ok: false, reason: "could not fetch the page" },
        usedAi: false,
        candidateBlocks: null,
        aiTriggerReason: null,
      };
  let rendered = false;

  // Only pay for a headless render when the cheap fetch + AI fallback still
  // failed — i.e. the body was never in the static HTML (a client-rendered page).
  if (!attempt.quality.ok) {
    const renderedHtml = await renderHtml(url);
    if (renderedHtml) {
      const second = await attemptFromHtml(url, renderedHtml, recoverBody);
      if (second.result && (!attempt.result || second.quality.ok)) {
        attempt = second;
        rendered = true;
      }
    }
  }

  if (!attempt.result) {
    throw new Error(`Could not extract article content from ${url}`);
  }
  if (!attempt.quality.ok) {
    throw new Error(
      `Scraped content from ${url} failed the quality check: ${attempt.quality.reason}. ` +
        `The page is likely paywalled or rendered entirely client-side.`,
    );
  }

  const method: ScrapeMethod = rendered
    ? attempt.usedAi
      ? "rendered-ai-recovery"
      : "rendered-extractor"
    : attempt.usedAi
      ? "ai-recovery"
      : "extractor";

  return {
    article: attempt.result,
    provenance: {
      method,
      rendered,
      candidateBlocks: attempt.usedAi ? attempt.candidateBlocks : null,
      contentChars: attempt.result.content.length,
      aiTriggerReason: attempt.usedAi ? attempt.aiTriggerReason : null,
    },
  };
}
