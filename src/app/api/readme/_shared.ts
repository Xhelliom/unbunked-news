import type { ClaimStatus } from "@/lib/claim-status";
import type { Verdict } from "@/lib/verdicts";

export const WEEK_S = 7 * 24 * 60 * 60;
export const HOUR_S = 60 * 60;

// Brand indigo stays constant across themes (so do the verdict/claim colors);
// only the canvas, text and borders flip so the cards match GitHub's light or
// dark rendering. Selected via the `?theme=light` query param on each route.
export const BRAND = "#6366f1";

export type ReadmeTheme = "light" | "dark";

export type ReadmePalette = {
  bg: string; // card / canvas background
  border: string; // card stroke and dividers
  track: string; // empty distribution-bar track behind verdict segments
  heading: string; // bright headings, stat numbers, "bunked" wordmark
  body: string; // primary body text (titles, claim text)
  muted: string; // secondary labels, urls
  empty: string; // dim section labels and empty-state text
};

export const README_PALETTES: Record<ReadmeTheme, ReadmePalette> = {
  dark: {
    bg: "#0d1117",
    border: "#21262d",
    track: "#2d3748",
    heading: "#e5e7eb",
    body: "#c9d1d9",
    muted: "#6b7280",
    empty: "#4b5563",
  },
  light: {
    bg: "#ffffff",
    border: "#d0d7de",
    track: "#eaeef2",
    heading: "#1f2328",
    body: "#424a53",
    muted: "#656d76",
    empty: "#8c959f",
  },
};

export const parseReadmeTheme = (value: string | null): ReadmeTheme =>
  value === "light" ? "light" : "dark";

export const VERDICT_COLORS: Record<Verdict, string> = {
  reliable: "#059669",
  nuanced: "#f59e0b",
  fragile: "#ea580c",
  debunked: "#dc2626",
  unverifiable: "#71717a",
};

export const VERDICT_FR: Record<Verdict, string> = {
  reliable: "Fiable",
  nuanced: "Imprécis",
  fragile: "Contestable",
  debunked: "Faux",
  unverifiable: "Non vérifiable",
};

export const CLAIM_COLORS: Record<ClaimStatus, string> = {
  supported: "#059669",
  partly_true: "#f59e0b",
  misleading: "#ea580c",
  false: "#dc2626",
  unverifiable: "#71717a",
};

export const CLAIM_FR: Record<ClaimStatus, string> = {
  supported: "Vrai",
  partly_true: "Nuancé",
  misleading: "Trompeur",
  false: "Faux",
  unverifiable: "Non vérifié",
};

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
