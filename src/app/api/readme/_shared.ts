import type { ClaimStatus } from "@/lib/claim-status";
import type { Verdict } from "@/lib/verdicts";

export const WEEK_S = 7 * 24 * 60 * 60;
export const HOUR_S = 60 * 60;

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
