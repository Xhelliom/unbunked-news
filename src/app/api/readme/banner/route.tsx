import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { articles } from "@/db/schema";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import { VERDICTS, type Verdict } from "@/lib/verdicts";

export const dynamic = "force-dynamic";

const BANNER_W = 1200;
const BANNER_H = 400;
const WEEK_S = 7 * 24 * 60 * 60;

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

const SPECTRUM = ["#059669", "#f59e0b", "#ea580c", "#dc2626", "#71717a"] as const;

// Source Serif 4 Bold — fetched once per week, falls back to Noto Sans.
const loadFont = unstable_cache(
  async (): Promise<ArrayBuffer | null> => {
    try {
      const css = await fetch(
        "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@700&display=swap",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0",
          },
        },
      ).then((r) => r.text());
      const match = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/.exec(css);
      if (!match) return null;
      return fetch(match[1]).then((r) => r.arrayBuffer());
    } catch {
      return null;
    }
  },
  ["og-source-serif-4-bold"],
  { revalidate: WEEK_S },
);

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

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export async function GET(): Promise<Response> {
  const [fontData, { total, latest }] = await Promise.all([
    loadFont(),
    loadBannerData(),
  ]);

  const verdict = (latest?.verdict ?? "unverifiable") as Verdict;
  const verdictColor = VERDICT_COLORS[verdict];
  const verdictLabel = VERDICT_FR[verdict];
  const score = latest?.reliabilityScore != null ? String(latest.reliabilityScore) : "—";
  const title = latest ? truncate(latest.title, 62) : null;

  const fonts = fontData
    ? [{ name: "Source Serif 4", data: fontData, weight: 700 as const, style: "normal" as const }]
    : [];

  const image = new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#0d1117",
          padding: "44px 52px",
          fontFamily: fonts.length ? "Source Serif 4" : "serif",
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
            Le fact-checking de l'actualité,
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
      fonts,
    },
  );

  image.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return image;
}
