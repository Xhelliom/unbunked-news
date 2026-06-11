import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { articles } from "@/db/schema";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import { VERDICTS, type Verdict } from "@/lib/verdicts";
import { VERDICT_COLORS, VERDICT_FR, WEEK_S, truncate } from "../_shared";

export const dynamic = "force-dynamic";

const BANNER_W = 1200;
const BANNER_H = 400;

const SPECTRUM = VERDICTS.map((v) => VERDICT_COLORS[v]);

type BannerData = {
  total: number;
  latest: { title: string; verdict: Verdict | null; reliabilityScore: number | null } | null;
};

const loadBannerData = unstable_cache(
  async (): Promise<BannerData> => {
    const [countRows, latestRows] = await Promise.all([
      db
        .select({ total: count() })
        .from(articles)
        .where(and(eq(articles.published, true), isNull(articles.deletedAt))),
      db
        .select({ title: articles.title, verdict: articles.verdict, reliabilityScore: articles.reliabilityScore })
        .from(articles)
        .where(and(eq(articles.published, true), isNull(articles.deletedAt)))
        .orderBy(desc(articles.publishedAt))
        .limit(1),
    ]);
    return {
      total: Number(countRows[0]?.total ?? 0),
      latest: latestRows[0] ?? null,
    };
  },
  ["readme-banner-data"],
  { revalidate: WEEK_S, tags: [ARTICLES_CACHE_TAG] },
);

export async function GET(): Promise<Response> {
  try {
    const { total, latest } = await loadBannerData();

    const verdict = (latest?.verdict ?? "unverifiable") as Verdict;
    const verdictColor = VERDICT_COLORS[verdict];
    const verdictLabel = VERDICT_FR[verdict];
    const score = latest?.reliabilityScore != null ? String(latest.reliabilityScore) : "—";
    const title = latest ? truncate(latest.title, 62) : null;

    const image = new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            backgroundColor: "#0d1117",
            padding: "44px 52px",
            fontFamily: "serif",
          }}
        >
          {/* ── Left panel ── */}
          <div style={{ display: "flex", flexDirection: "column", width: "320px", marginRight: "52px" }}>

            {/* Logo icon + wordmark */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "52px",
                  height: "52px",
                  backgroundColor: "#6366f1",
                  borderRadius: "12px",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#ffffff",
                }}
              >
                Un
              </div>
              <div style={{ display: "flex", fontSize: "34px", fontWeight: 700 }}>
                <span style={{ color: "#6366f1" }}>Un</span>
                <span style={{ color: "#e5e7eb" }}>bunked</span>
              </div>
            </div>

            {/* Spectrum bar */}
            <div style={{ display: "flex", gap: "5px", marginTop: "12px" }}>
              {SPECTRUM.map((color) => (
                <div
                  key={color}
                  style={{ flex: 1, height: "6px", backgroundColor: color, borderRadius: "3px" }}
                />
              ))}
            </div>

            {/* URL */}
            <div style={{ display: "flex", marginTop: "14px", color: "#6b7280", fontSize: "13px" }}>
              unbunked.news
            </div>

            <div style={{ flex: 1 }} />

            {/* Stats */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "48px", fontWeight: 700, color: "#e5e7eb", lineHeight: 1 }}>
                {total > 0 ? total.toLocaleString("fr-FR") : "—"}
              </span>
              <span style={{ fontSize: "13px", color: "#6b7280", marginTop: "6px" }}>
                articles analysés
              </span>
            </div>
          </div>

          {/* ── Vertical divider ── */}
          <div style={{ width: "1px", backgroundColor: "#21262d", marginRight: "52px" }} />

          {/* ── Right panel ── */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>

            {/* Tagline */}
            <div style={{ display: "flex", fontSize: "26px", fontWeight: 700, color: "#e5e7eb", lineHeight: 1.3 }}>
              Le fact-checking de l&apos;actualité,
            </div>
            <div style={{ display: "flex", fontSize: "26px", fontWeight: 700, color: "#6366f1", lineHeight: 1.3, marginTop: "2px" }}>
              vérifié affirmation par affirmation.
            </div>

            <div style={{ flex: 1 }} />

            {/* Latest article */}
            {title ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ height: "1px", backgroundColor: "#21262d", marginBottom: "22px" }} />
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "11px",
                      height: "11px",
                      borderRadius: "50%",
                      backgroundColor: verdictColor,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: verdictColor }}>
                    {verdictLabel}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: "17px",
                      color: "#c9d1d9",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {title}
                  </span>
                  <span
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      color: verdictColor,
                      flexShrink: 0,
                    }}
                  >
                    {score}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", color: "#4b5563", fontSize: "14px" }}>
                Bientôt en ligne — unbunked.news
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: BANNER_W,
        height: BANNER_H,
      },
    );

    image.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return image;
  } catch (err) {
    console.error("[readme/banner] ImageResponse failed:", err);
    const fallback = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BANNER_W} ${BANNER_H}" width="${BANNER_W}" height="${BANNER_H}">
  <rect width="${BANNER_W}" height="${BANNER_H}" fill="#0d1117"/>
  <text x="${BANNER_W / 2}" y="${BANNER_H / 2}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" fill="#6b7280">unbunked.news</text>
</svg>`;
    return new Response(fallback, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
    });
  }
}
