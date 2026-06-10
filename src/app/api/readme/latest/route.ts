import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { articles } from "@/db/schema";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import { type Verdict } from "@/lib/verdicts";
import { HOUR_S, VERDICT_COLORS, VERDICT_FR, esc, truncate } from "../_shared";

export const dynamic = "force-dynamic";

type LatestRow = {
  title: string;
  verdict: Verdict | null;
  reliabilityScore: number | null;
  slug: string;
};

const loadLatest = unstable_cache(
  async (): Promise<LatestRow[]> =>
    db
      .select({
        title: articles.title,
        verdict: articles.verdict,
        reliabilityScore: articles.reliabilityScore,
        slug: articles.slug,
      })
      .from(articles)
      .where(and(eq(articles.published, true), isNull(articles.deletedAt)))
      .orderBy(desc(articles.publishedAt))
      .limit(3),
  ["readme-latest"],
  { revalidate: HOUR_S, tags: [ARTICLES_CACHE_TAG] },
);

const W = 600;
const HEADER_H = 64;
const ROW_H = 50;
const FOOTER_H = 16;

export async function GET(): Promise<Response> {
  try {
    const latest: LatestRow[] = await loadLatest();

    const rowCount = Math.max(latest.length, 1);
    const H = HEADER_H + rowCount * ROW_H + FOOTER_H;

    const rowSvg = latest.length === 0
      ? `<text x="${W / 2}" y="${HEADER_H + 28}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#4b5563">Aucun article publié pour le moment.</text>`
      : latest
          .map((article, i) => {
            const verdict = (article.verdict ?? "unverifiable") as Verdict;
            const color = VERDICT_COLORS[verdict];
            const label = esc(VERDICT_FR[verdict]);
            const score =
              article.reliabilityScore !== null
                ? String(article.reliabilityScore)
                : "—";
            const title = esc(truncate(article.title, 58));
            const rowY = HEADER_H + i * ROW_H;
            const isLast = i === latest.length - 1;

            return `
  <!-- Article ${i + 1} -->
  ${!isLast ? `<line x1="20" y1="${rowY + ROW_H}" x2="${W - 20}" y2="${rowY + ROW_H}" stroke="#21262d" stroke-width="1"/>` : ""}
  <circle cx="36" cy="${rowY + 18}" r="5" fill="${color}"/>
  <text x="50" y="${rowY + 14}" font-family="system-ui,-apple-system,sans-serif" font-size="10" font-weight="600" fill="${color}">${label}</text>
  <text x="50" y="${rowY + 32}" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#c9d1d9">${title}</text>
  <text x="${W - 20}" y="${rowY + 26}" text-anchor="end" font-family="system-ui,-apple-system,sans-serif" font-weight="700" font-size="18" fill="${color}">${score}</text>`;
          })
          .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <!-- Background -->
  <rect width="${W}" height="${H}" rx="12" fill="#0d1117"/>
  <rect width="${W}" height="${H}" rx="12" fill="none" stroke="#21262d" stroke-width="1"/>

  <!-- Logo icon -->
  <rect x="20" y="14" width="32" height="32" rx="7" fill="#6366f1"/>
  <text x="36" y="36" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="16" fill="#fff">Un</text>

  <!-- Wordmark -->
  <text x="60" y="29" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="18">
    <tspan fill="#6366f1">Un</tspan><tspan fill="#e5e7eb">bunked</tspan>
  </text>
  <text x="60" y="44" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#6b7280">Dernières analyses</text>

  <!-- Spectrum bar (logo signature) -->
  <rect x="${W - 116}" y="20" width="19" height="4" rx="2" fill="#059669"/>
  <rect x="${W - 93}" y="20" width="19" height="4" rx="2" fill="#f59e0b"/>
  <rect x="${W - 70}" y="20" width="19" height="4" rx="2" fill="#ea580c"/>
  <rect x="${W - 47}" y="20" width="19" height="4" rx="2" fill="#dc2626"/>
  <rect x="${W - 24}" y="20" width="19" height="4" rx="2" fill="#71717a"/>

  <!-- Divider -->
  <line x1="20" y1="${HEADER_H}" x2="${W - 20}" y2="${HEADER_H}" stroke="#21262d" stroke-width="1"/>

  ${rowSvg}
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    const H = HEADER_H + ROW_H + FOOTER_H;
    const fallback = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" rx="12" fill="#0d1117"/>
  <text x="${W / 2}" y="${H / 2 + 5}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#6b7280">unbunked.news — dernières analyses</text>
</svg>`;
    return new Response(fallback, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
      },
    });
  }
}
