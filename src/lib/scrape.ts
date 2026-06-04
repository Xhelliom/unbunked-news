import { extractFromHtml } from "@extractus/article-extractor";

import {
  BLOCK_KINDS,
  type ArticleBlock,
  type BlockKind,
  serializeBlock,
} from "@/lib/article-blocks";
import {
  assessScrapeQuality,
  isBoilerplateLine,
  isCommentSectionHeader,
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
  aiStructured: boolean;
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
// Enough of the <head> to find a declared charset, read as latin1 so the ASCII
// meta tag is legible whatever the real encoding.
const CHARSET_SNIFF_BYTES = 2_048;

// Candidate-block filters for the AI body-recovery fallback: keep prose-shaped
// blocks, drop nav items, bare numbers, and embedded JSON/markup noise.
const MIN_BLOCK_CHARS = 40;
const MAX_BLOCK_CHARS = 3_000;
const MIN_BLOCK_WORDS = 6;
const MIN_LETTER_RATIO = 0.5;
const MAX_CANDIDATE_CHARS = 24_000;
// The whole article (not a sample) goes to the AI structurer so it can spot ads
// or chrome embedded mid-body. Generous enough to fit virtually every article;
// past it we keep the deterministic body rather than feed the model a truncated
// one. Matches the stored-body ceiling in run.ts.
const MAX_STRUCTURE_INPUT_CHARS = 60_000;

// Injected so scraping stays decoupled from the AI pipeline (importing the
// Anthropic client here would create a server-only import cycle). Given the
// article's parsed blocks (each with its HTML-derived kind guess), reviews them
// and returns the body blocks in reading order with corrected kinds, dropping
// chrome and the comment thread — plus a `complete` verdict. `complete: false`
// means the blocks don't hold the full article (truncated, or mostly chrome), so
// the caller should re-extract from the whole page. `blocks` empty means nothing
// usable, so the caller falls back to the deterministic body. Must not throw —
// failures degrade to the fallback, they don't sink the scrape.
export type StructureOutcome = { blocks: ArticleBlock[]; complete: boolean };
export type BodyStructurer = (
  blocks: ArticleBlock[],
  meta: { title: string },
) => Promise<StructureOutcome>;

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

// NUL sentinels injected at block-open tags so the kind survives the
// tag-stripping + whitespace-collapsing pass and can be read back per block.
// NUL never occurs in real article text, so it can't collide with content.
const HEADING_SENTINEL = "\u0000H\u0000";
const SUBHEADING_SENTINEL = "\u0000S\u0000";
const QUOTE_SENTINEL = "\u0000Q\u0000";
const CODE_SENTINEL_PREFIX = "\u0000C";
const CODE_SENTINEL_SUFFIX = "\u0000";

// Splits article HTML into typed blocks, preserving both block boundaries (lost
// if we collapsed all whitespace) and the *role* of each block — headings,
// subheadings, blockquotes and code keep their formalism instead of all
// flattening into prose, so the rewrite can mirror the original structure.
// Inner whitespace is normalized to single spaces, except inside code where the
// original line breaks are the whole point.
export function htmlToBlocks(html: string): ArticleBlock[] {
  const codeBlocks: string[] = [];
  const withoutCode = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_match, inner: string) => {
      const code = decodeEntities(
        inner.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""),
      )
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      const index = codeBlocks.push(code) - 1;
      return `\n\n${CODE_SENTINEL_PREFIX}${index}${CODE_SENTINEL_SUFFIX}\n\n`;
    });

  const text = decodeEntities(
    withoutCode
      .replace(/<(h1|h2)\b[^>]*>/gi, `\n\n${HEADING_SENTINEL}`)
      .replace(/<h[3-6]\b[^>]*>/gi, `\n\n${SUBHEADING_SENTINEL}`)
      .replace(/<blockquote\b[^>]*>/gi, `\n\n${QUOTE_SENTINEL}`)
      .replace(
        /<\/(p|div|h[1-6]|li|blockquote|section|article|figcaption|tr)>/gi,
        "\n\n",
      )
      .replace(/<br\s*\/?>/gi, "\n\n")
      .replace(/<[^>]+>/g, " "),
  );

  const blocks: ArticleBlock[] = [];
  for (const rawBlock of text.split(/\n{2,}/)) {
    const collapsed = rawBlock.replace(/\s+/g, " ").trim();
    if (collapsed.length === 0) continue;

    const codeMatch = new RegExp(
      `^${CODE_SENTINEL_PREFIX}(\\d+)${CODE_SENTINEL_SUFFIX}$`,
    ).exec(collapsed);
    if (codeMatch) {
      blocks.push({ kind: "code", text: codeBlocks[Number(codeMatch[1])] });
      continue;
    }
    if (collapsed.startsWith(HEADING_SENTINEL)) {
      blocks.push({
        kind: "heading",
        text: collapsed.slice(HEADING_SENTINEL.length).trim(),
      });
      continue;
    }
    if (collapsed.startsWith(SUBHEADING_SENTINEL)) {
      blocks.push({
        kind: "subheading",
        text: collapsed.slice(SUBHEADING_SENTINEL.length).trim(),
      });
      continue;
    }
    if (collapsed.startsWith(QUOTE_SENTINEL)) {
      blocks.push({
        kind: "quote",
        text: collapsed.slice(QUOTE_SENTINEL.length).trim(),
      });
      continue;
    }
    blocks.push({ kind: "para", text: collapsed });
  }
  return blocks;
}

// Drops boilerplate blocks (ads, share counters, "à lire aussi" …) while keeping
// structure. Code is never matched against the prose boilerplate patterns.
function keepArticleBlocks(blocks: ArticleBlock[]): ArticleBlock[] {
  return blocks.filter(
    (block) => block.kind === "code" || !isBoilerplateLine(block.text),
  );
}

// Cuts the article at the reader comment thread (heading or CTA), dropping the
// opener and every comment after it. Code blocks can't be a comment opener.
function dropCommentBlocks(blocks: ArticleBlock[]): ArticleBlock[] {
  const index = blocks.findIndex(
    (block) => block.kind !== "code" && isCommentSectionHeader(block.text),
  );
  return index === -1 ? blocks : blocks.slice(0, index);
}

function serializeBlocks(blocks: ArticleBlock[]): string {
  return blocks.map(serializeBlock).join("\n\n");
}

// Prepares the parsed blocks for the AI structurer: drop exact duplicates (the
// same nav label repeated) while preserving order. Returns null when the whole
// article wouldn't fit the structurer budget — rather than send a truncated
// article (the model would then drop the unseen tail), we skip the AI step and
// keep the full deterministic body.
function aiInputBlocks(blocks: ArticleBlock[]): ArticleBlock[] | null {
  const seen = new Set<string>();
  const deduped: ArticleBlock[] = [];
  let total = 0;
  for (const block of blocks) {
    if (seen.has(block.text)) continue;
    seen.add(block.text);
    deduped.push(block);
    total += block.text.length;
  }
  return total > MAX_STRUCTURE_INPUT_CHARS ? null : deduped;
}

const KIND_SET = new Set<string>(BLOCK_KINDS);

// Turns the AI structurer's `{ index, kind }` selection into article blocks,
// rebuilt VERBATIM from `source` so the body the pipeline matches claim quotes
// against is never paraphrased by the model. Out-of-range, repeated, non-integer
// or unknown-kind entries are dropped — the model can emit any of those.
export function applyStructureSelection(
  selection: unknown,
  source: ArticleBlock[],
): ArticleBlock[] {
  if (!Array.isArray(selection)) return [];
  const seen = new Set<number>();
  const blocks: ArticleBlock[] = [];
  for (const item of selection) {
    if (typeof item !== "object" || item === null) continue;
    const { index, kind } = item as { index?: unknown; kind?: unknown };
    if (
      !Number.isInteger(index) ||
      (index as number) < 0 ||
      (index as number) >= source.length ||
      seen.has(index as number)
    ) {
      continue;
    }
    if (typeof kind !== "string" || !KIND_SET.has(kind)) continue;
    seen.add(index as number);
    blocks.push({ kind: kind as BlockKind, text: source[index as number].text });
  }
  return blocks;
}

function looksLikeProse(block: string): boolean {
  if (block.length < MIN_BLOCK_CHARS || block.length > MAX_BLOCK_CHARS) {
    return false;
  }
  if (block.split(/\s+/).length < MIN_BLOCK_WORDS) return false;
  const letters = (block.match(/\p{L}/gu) ?? []).length;
  return letters / block.length > MIN_LETTER_RATIO;
}

// Body-relevant blocks from the WHOLE page for the AI re-extraction fallback:
// keep every structural block (heading/subheading/quote/code) and every
// prose-shaped paragraph, while dropping short nav-style lines and known
// boilerplate. Deduplicated and bounded in total size. The structurer then picks
// the article body out of these, preserving roles — so recovery keeps the
// article's headings and quotes instead of flattening them.
export function buildStructureCandidates(html: string): ArticleBlock[] {
  const seen = new Set<string>();
  const candidates: ArticleBlock[] = [];
  let total = 0;
  for (const block of htmlToBlocks(html)) {
    const isBodyShaped = block.kind !== "para" || looksLikeProse(block.text);
    const isBoilerplate =
      block.kind !== "code" && isBoilerplateLine(block.text);
    if (!isBodyShaped || isBoilerplate || seen.has(block.text)) continue;
    if (total + block.text.length > MAX_CANDIDATE_CHARS) break;
    seen.add(block.text);
    candidates.push(block);
    total += block.text.length;
  }
  return candidates;
}

type ExtractorResult = Awaited<ReturnType<typeof extractFromHtml>>;

// The article as the deterministic path sees it, plus the bounded parsed blocks
// the AI structurer refines. `content` is the regex-cleaned body — the fallback
// used when the AI step is absent or returns nothing.
type NormalizedExtract = { article: ScrapedArticle; rawBlocks: ArticleBlock[] };

function normalize(url: string, data: ExtractorResult): NormalizedExtract | null {
  if (!data?.content || !data.title) {
    return null;
  }
  const rawBlocks = htmlToBlocks(data.content);
  return {
    article: {
      url,
      title: data.title,
      sourceName: data.source ?? hostnameToSource(url),
      content: serializeBlocks(dropCommentBlocks(keepArticleBlocks(rawBlocks))),
      imageUrl: data.image ?? null,
      author: data.author ?? null,
      publishedAt: data.published ? new Date(data.published) : null,
    },
    rawBlocks,
  };
}

// response.text() honours only the HTTP Content-Type charset (defaulting to
// UTF-8), so a legacy page that declares ISO-8859-1/Windows-1252 only in a
// <meta> tag would come out as mojibake — corrupting the body the pipeline
// matches claim quotes against. Mirror the extractor's own decode: prefer the
// <meta> charset, then the header, then UTF-8, decoding the raw bytes.
function decodeHtml(buffer: ArrayBuffer, contentType: string | null): string {
  const bytes = Buffer.from(buffer);
  const head = bytes.toString(
    "latin1",
    0,
    Math.min(bytes.length, CHARSET_SNIFF_BYTES),
  );
  const charset = (
    head.match(/<meta[^>]+charset=["']?\s*([\w-]+)/i)?.[1] ??
    contentType?.match(/charset=\s*([\w-]+)/i)?.[1] ??
    "utf-8"
  ).toLowerCase();
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "user-agent": SCRAPE_USER_AGENT },
    });
    if (!response.ok) return null;
    return decodeHtml(
      await response.arrayBuffer(),
      response.headers.get("content-type"),
    );
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

type Attempt = {
  result: ScrapedArticle | null;
  quality: ScrapeQuality;
  usedAi: boolean;
  candidateBlocks: number | null;
  aiTriggerReason: string | null;
  aiStructured: boolean;
};

// Extracts the best body obtainable from a single HTML document. The generic
// extractor runs first; the AI structurer then reviews its blocks (correct
// roles, drop residual chrome and comments) for every article. If the body
// still fails the quality gate — a paywall teaser or nav menu where the real
// body sits elsewhere in the SAME HTML (Le Monde & co.) — or the model judged it
// incomplete, the SAME structurer re-extracts from the whole page, so recovery
// keeps the article's headings and quotes. Every pass rebuilds the body from
// chosen blocks, so downstream claim quotes still resolve.
async function attemptFromHtml(
  url: string,
  html: string,
  structureBody?: BodyStructurer,
): Promise<Attempt> {
  const normalized = normalize(url, await extractFromHtml(html, url));
  if (!normalized) {
    return {
      result: null,
      quality: { ok: false, reason: "extractor returned no usable content" },
      usedAi: false,
      candidateBlocks: null,
      aiTriggerReason: null,
      aiStructured: false,
    };
  }

  let article = normalized.article;
  let aiStructured = false;
  // Set when the model judged the extracted slice incomplete (truncated or
  // mostly chrome): we escalate to whole-page recovery even if the deterministic
  // quality gate would have passed it.
  let aiFlaggedIncomplete = false;
  const aiBlocks = structureBody ? aiInputBlocks(normalized.rawBlocks) : null;
  if (structureBody && aiBlocks) {
    const { blocks: structured, complete } = await structureBody(aiBlocks, {
      title: article.title,
    });
    if (complete && structured.length > 0) {
      article = { ...article, content: serializeBlocks(structured) };
      aiStructured = true;
    } else if (!complete) {
      aiFlaggedIncomplete = true;
    }
  }

  const quality = assessScrapeQuality(article.content);
  if ((quality.ok && !aiFlaggedIncomplete) || !structureBody) {
    return {
      result: article,
      quality,
      usedAi: false,
      candidateBlocks: null,
      aiTriggerReason: null,
      aiStructured,
    };
  }

  const triggerReason = quality.ok
    ? "AI judged the extracted body incomplete or not the article"
    : quality.reason;
  const candidates = buildStructureCandidates(html);
  if (candidates.length === 0) {
    return {
      result: article,
      quality,
      usedAi: false,
      candidateBlocks: 0,
      aiTriggerReason: triggerReason,
      aiStructured,
    };
  }

  const { blocks: recoveredBlocks } = await structureBody(candidates, {
    title: article.title,
  });
  const recovered = serializeBlocks(recoveredBlocks);
  const recoveredQuality = assessScrapeQuality(recovered);
  return recoveredQuality.ok
    ? {
        result: { ...article, content: recovered },
        quality: recoveredQuality,
        usedAi: true,
        candidateBlocks: candidates.length,
        aiTriggerReason: triggerReason,
        aiStructured: true,
      }
    : {
        result: article,
        quality,
        usedAi: false,
        candidateBlocks: candidates.length,
        aiTriggerReason: triggerReason,
        aiStructured,
      };
}

export async function scrapeArticle(
  url: string,
  structureBody?: BodyStructurer,
): Promise<ScrapeResult> {
  const html = await fetchHtml(url);
  let attempt: Attempt = html
    ? await attemptFromHtml(url, html, structureBody)
    : {
        result: null,
        quality: { ok: false, reason: "could not fetch the page" },
        usedAi: false,
        candidateBlocks: null,
        aiTriggerReason: null,
        aiStructured: false,
      };
  let rendered = false;

  // Only pay for a headless render when the cheap fetch + AI fallback still
  // failed — i.e. the body was never in the static HTML (a client-rendered page).
  if (!attempt.quality.ok) {
    const renderedHtml = await renderHtml(url);
    if (renderedHtml) {
      const second = await attemptFromHtml(url, renderedHtml, structureBody);
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
      aiStructured: attempt.aiStructured,
    },
  };
}
