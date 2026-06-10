import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { articles, claims } from "@/db/schema";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import type { ClaimStatus } from "@/lib/claim-status";
import type { Verdict } from "@/lib/verdicts";

export const dynamic = "force-dynamic";

const WEEK_S = 7 * 24 * 60 * 60;
const W = 600;

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
  unverifiable: "Non vérifiable",
};

const CLAIM_COLORS: Record<ClaimStatus, string> = {
  supported: "#059669",
  partly_true: "#f59e0b",
  misleading: "#ea580c",
  false: "#dc2626",
  unverifiable: "#71717a",
};

const CLAIM_FR: Record<ClaimStatus, string> = {
  supported: "Vrai",
  partly_true: "Nuancé",
  misleading: "Trompeur",
  false: "Faux",
  unverifiable: "Non vérifié",
};

type SampleClaim = { claimText: string; status: ClaimStatus | null; position: number };
type SampleData = {
  title: string;
  verdict: Verdict | null;
  reliabilityScore: number | null;
  claims: SampleClaim[];
} | null;

const loadSample = unstable_cache(
  async (): Promise<SampleData> => {
    const article = await db.query.articles.findFirst({
      where: and(eq(articles.published, true), isNull(articles.deletedAt)),
      orderBy: [desc(articles.publishedAt)],
      columns: { id: true, title: true, verdict: true, reliabilityScore: true },
      with: {
        claims: {
          columns: { claimText: true, status: true, position: true },
          orderBy: [asc(claims.position)],
        },
      },
    });
    if (!article) return null;
    return {
      title: article.title,
      verdict: article.verdict,
      reliabilityScore: article.reliabilityScore,
      claims: (article.claims as SampleClaim[]).slice(0, 3),
    };
  },
  ["readme-sample"],
  { revalidate: WEEK_S, tags: [ARTICLES_CACHE_TAG] },
);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const HEADER_H = 64;
const ARTICLE_ROW_H = 50;
const CLAIM_HEADER_H = 34;
const CLAIM_ROW_H = 42;
const FOOTER_H = 14;

export async function GET(): Promise<Response> {
  try {
    const data = await loadSample();

    const claimCount = data?.claims.length ?? 0;
    const H =
      HEADER_H + ARTICLE_ROW_H + CLAIM_HEADER_H + claimCount * CLAIM_ROW_H + FOOTER_H;

    if (!data) {
      const emptyH = HEADER_H + ARTICLE_ROW_H + FOOTER_H;
      const emptySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${emptyH}" width="${W}" height="${emptyH}">
  <rect width="${W}" height="${emptyH}" rx="12" fill="#0d1117"/>
  <rect width="${W}" height="${emptyH}" rx="12" fill="none" stroke="#21262d" stroke-width="1"/>
  <text x="${W / 2}" y="${emptyH / 2 + 5}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="13" fill="#4b5563">Aucun article publié pour le moment.</text>
</svg>`;
      return new Response(emptySvg, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
      });
    }

    const verdict = (data.verdict ?? "unverifiable") as Verdict;
    const verdictColor = VERDICT_COLORS[verdict];
    const verdictLabel = VERDICT_FR[verdict];
    const score = data.reliabilityScore !== null ? String(data.reliabilityScore) : "—";
    const title = esc(truncate(data.title, 56));

    const claimRows = (data.claims as SampleClaim[])
      .map((claim: SampleClaim, i: number) => {
        const status = (claim.status ?? "unverifiable") as ClaimStatus;
        const color = CLAIM_COLORS[status];
        const label = esc(CLAIM_FR[status]);
        const text = esc(truncate(claim.claimText, 68));
        const rowY = HEADER_H + ARTICLE_ROW_H + CLAIM_HEADER_H + i * CLAIM_ROW_H;
        const isLast = i === data.claims.length - 1;
        return `
  ${!isLast ? `<line x1="20" y1="${rowY + CLAIM_ROW_H}" x2="${W - 20}" y2="${rowY + CLAIM_ROW_H}" stroke="#161b22" stroke-width="1"/>` : ""}
  <circle cx="34" cy="${rowY + 14}" r="4" fill="${color}"/>
  <text x="46" y="${rowY + 11}" font-family="system-ui,-apple-system,sans-serif" font-size="9" font-weight="700" fill="${color}">${label}</text>
  <text x="46" y="${rowY + 27}" font-family="system-ui,-apple-system,sans-serif" font-size="12" fill="#8b949e">${text}</text>`;
      })
      .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" rx="12" fill="#0d1117"/>
  <rect width="${W}" height="${H}" rx="12" fill="none" stroke="#21262d" stroke-width="1"/>

  <!-- Header -->
  <rect x="20" y="14" width="32" height="32" rx="7" fill="#6366f1"/>
  <text x="36" y="36" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="16" fill="#fff">Un</text>
  <text x="60" y="29" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="18">
    <tspan fill="#6366f1">Un</tspan><tspan fill="#e5e7eb">bunked</tspan>
  </text>
  <text x="60" y="44" font-family="system-ui,-apple-system,sans-serif" font-size="11" fill="#6b7280">Exemple d'analyse</text>

  <!-- Header spectrum -->
  <rect x="${W - 116}" y="20" width="19" height="4" rx="2" fill="#059669"/>
  <rect x="${W - 93}" y="20" width="19" height="4" rx="2" fill="#f59e0b"/>
  <rect x="${W - 70}" y="20" width="19" height="4" rx="2" fill="#ea580c"/>
  <rect x="${W - 47}" y="20" width="19" height="4" rx="2" fill="#dc2626"/>
  <rect x="${W - 24}" y="20" width="19" height="4" rx="2" fill="#71717a"/>

  <!-- Article row -->
  <line x1="20" y1="${HEADER_H}" x2="${W - 20}" y2="${HEADER_H}" stroke="#21262d" stroke-width="1"/>
  <circle cx="36" cy="${HEADER_H + 18}" r="5" fill="${verdictColor}"/>
  <text x="50" y="${HEADER_H + 14}" font-family="system-ui,-apple-system,sans-serif" font-size="10" font-weight="700" fill="${verdictColor}">${verdictLabel}</text>
  <text x="50" y="${HEADER_H + 31}" font-family="system-ui,-apple-system,sans-serif" font-size="13" font-weight="500" fill="#e5e7eb">${title}</text>
  <text x="${W - 20}" y="${HEADER_H + 24}" text-anchor="end" font-family="system-ui,-apple-system,sans-serif" font-weight="700" font-size="18" fill="${verdictColor}">${score}</text>

  <!-- Claims header -->
  <line x1="20" y1="${HEADER_H + ARTICLE_ROW_H}" x2="${W - 20}" y2="${HEADER_H + ARTICLE_ROW_H}" stroke="#21262d" stroke-width="1"/>
  <text x="20" y="${HEADER_H + ARTICLE_ROW_H + 22}" font-family="system-ui,-apple-system,sans-serif" font-size="10" fill="#4b5563" letter-spacing="0.5">AFFIRMATIONS VÉRIFIÉES (${claimCount})</text>

  <!-- Claim rows -->
  <line x1="20" y1="${HEADER_H + ARTICLE_ROW_H + CLAIM_HEADER_H}" x2="${W - 20}" y2="${HEADER_H + ARTICLE_ROW_H + CLAIM_HEADER_H}" stroke="#21262d" stroke-width="1"/>
  ${claimRows}
</svg>`;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    const fallbackH = 80;
    const fallback = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${fallbackH}" width="${W}" height="${fallbackH}">
  <rect width="${W}" height="${fallbackH}" rx="12" fill="#0d1117"/>
  <text x="${W / 2}" y="${fallbackH / 2 + 5}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#6b7280">unbunked.news</text>
</svg>`;
    return new Response(fallback, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
    });
  }
}
