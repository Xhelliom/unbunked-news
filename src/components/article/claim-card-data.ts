import type { ClaimCardData } from "@/components/claim-card";
import type { PublicArticle } from "@/lib/articles";

// Maps a stored claim (with its sources) to the shape the public claim card
// renders. Shared by the analysis and unbunked views, which both list claims.
export function toClaimCardData(
  claim: PublicArticle["claims"][number],
): ClaimCardData {
  return {
    status: claim.status,
    claimText: claim.claimText,
    explanation: claim.explanation,
    sources: claim.sources.map((source) => ({
      id: source.id,
      url: source.url,
      title: source.title,
    })),
  };
}
