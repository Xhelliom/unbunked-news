import "server-only";

import { and, count, eq, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { articles } from "@/db/schema";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import { VERDICTS, type Verdict } from "@/lib/verdicts";

export const dynamic = "force-dynamic";

const VERDICT_COLORS: Record<Verdict, string> = {
  reliable: "#059669",
  nuanced: "#f59e0b",
  fragile: "#ea580c",
  debunked: "#dc2626",
  unverifiable: "#71717a",
};

const VERDICT_FR: Record<Verdict, string> = {
  reliable: "Fiable",
  nuanced: "Imprécis",
  fragile: "Contestable",
  debunked: "Faux",
  unverifiable: "N/V",
};

const loadStats = unstable_cache(
  async () =>
    db
      .select({ verdict: articles.verdict, total: count() })
      .from(articles)
      .where(and(eq(articles.published, true), isNull(articles.deletedAt)))
      .groupBy(articles.verdict),
  ["readme-stats"],
  { revalidate: 3600, tags: [ARTICLES_CACHE_TAG] },
);

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const W = 600;
const H = 160;
const BAR_X = 20;
const BAR_W = W - BAR_X * 2;
const BAR_Y = 120;
const BAR_H = 8;

export async function GET(): Promise<Response> {
  try {
    const rows = await loadStats();

    const counts: Partial<Record<Verdict, number>> = {};
    let total = 0;
    for (const row of rows) {
      const v = (row.verdict ?? "unverifiable") as Verdict;
      counts[v] = (counts[v] ?? 0) + Number(row.total);
      total += Number(row.total);
    }

    // Verdict distribution bar segments
    const barSegments: string[] = [];
    let cx = BAR_X;
    for (const v of VERDICTS) {
      const n = counts[v] ?? 0;
      if (n === 0 || total === 0) continue;
      const segW = Math.max(4, Math.round((n / total) * BAR_W));
      barSegments.push(
        `<rect x="${cx}" y="${BAR_Y}" width="${segW}" height="${BAR_H}" rx="2" fill="${VERDICT_COLORS[v]}"/>`,
      );
      cx += segW + 2;
    }
    if (total === 0) {
      barSegments.push(
        `<rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="${BAR_H}" rx="4" fill="#2d3748"/>`,
      );
    }

    // Legend — 5 items spread across the full width
    const legendY = 148;
    const legendSpacing = Math.floor(BAR_W / VERDICTS.length);
    const legendItems = VERDICTS.map((v, i) => {
      const n = counts[v] ?? 0;
      const lx = BAR_X + i * legendSpacing;
      return `<circle cx="${lx + 4}" cy="${legendY}" r="3.5" fill="${VERDICT_COLORS[v]}"/>
  <text x="${lx + 12}" y="${legendY + 4}" font-family="system-ui,-apple-system,sans-serif" font-size="9" fill="#6b7280">${esc(VERDICT_FR[v])} (${n})</text>`;
    }).join("\n  ");

    const totalDisplay = esc(total.toLocaleString("fr-FR"));

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <!-- Background -->
  <rect width="${W}" height="${H}" rx="12" fill="#0d1117"/>
  <rect width="${W}" height="${H}" rx="12" fill="none" stroke="#21262d" stroke-width="1"/>

  <!-- Logo icon -->
  <rect x="20" y="18" width="34" height="34" rx="8" fill="#6366f1"/>
  <text x="37" y="42" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="17" fill="#fff">Un</text>

  <!-- Wordmark -->
  <text x="62" y="36" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="20">
    <tspan fill="#6366f1">Un</tspan><tspan fill="#e5e7eb">bunked</tspan>
  </text>
  <text x="62" y="51" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#6b7280">unbunked.news · fact-checking</text>

  <!-- Divider -->
  <line x1="20" y1="64" x2="${W - 20}" y2="64" stroke="#21262d" stroke-width="1"/>

  <!-- Total -->
  <text x="${W / 2}" y="96" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="700" font-size="30" fill="#e5e7eb">${totalDisplay}</text>
  <text x="${W / 2}" y="112" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="12" fill="#6b7280">articles analysés</text>

  <!-- Bar label -->
  <text x="${BAR_X}" y="${BAR_Y - 6}" font-family="system-ui,-apple-system,sans-serif" font-size="9" fill="#4b5563" letter-spacing="0.5">RÉPARTITION DES VERDICTS</text>

  <!-- Distribution bar -->
  ${barSegments.join("\n  ")}

  <!-- Legend -->
  ${legendItems}
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    const fallback = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 60" width="${W}" height="60">
  <rect width="${W}" height="60" rx="12" fill="#0d1117"/>
  <text x="${W / 2}" y="35" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#6b7280">unbunked.news</text>
</svg>`;
    return new Response(fallback, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
      },
    });
  }
}
