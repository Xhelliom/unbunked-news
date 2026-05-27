import { extract, extractFromHtml } from "@extractus/article-extractor";

export type ScrapedArticle = {
  url: string;
  title: string;
  sourceName: string;
  content: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: Date | null;
};

function hostnameToSource(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

type ExtractorResult = Awaited<ReturnType<typeof extract>>;

function normalize(url: string, data: ExtractorResult): ScrapedArticle | null {
  if (!data?.content || !data.title) {
    return null;
  }
  return {
    url,
    title: data.title,
    sourceName: data.source ?? hostnameToSource(url),
    content: htmlToText(data.content),
    imageUrl: data.image ?? null,
    author: data.author ?? null,
    publishedAt: data.published ? new Date(data.published) : null,
  };
}

// Renders a JS-heavy page with headless Chromium and extracts from the result.
// Requires a Chromium binary; configure CHROMIUM_PATH in production.
async function scrapeWithPuppeteer(url: string): Promise<ScrapedArticle | null> {
  const executablePath =
    process.env.CHROMIUM_PATH ?? process.env.PUPPETEER_EXECUTABLE_PATH;
  if (!executablePath) {
    return null;
  }

  const { launch } = await import("puppeteer-core");
  const browser = await launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
    const html = await page.content();
    const data = await extractFromHtml(html, url);
    return normalize(url, data);
  } finally {
    await browser.close();
  }
}

export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  let result: ScrapedArticle | null = null;
  try {
    result = normalize(url, await extract(url));
  } catch {
    result = null;
  }

  if (!result) {
    result = await scrapeWithPuppeteer(url);
  }

  if (!result) {
    throw new Error(`Could not extract article content from ${url}`);
  }
  return result;
}
