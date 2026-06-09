"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ContributionForm } from "@/components/article-reader/contribution-form";

type ClaimContributionProps = {
  articleId: string;
  claimId: string;
  // 1-based claim number, for the form heading.
  claimNumber: number;
  isAuthenticated: boolean;
};

// Per-claim "suggest a correction" affordance shown under a claim in the
// verification panel / mobile drawer. The composing target is captured on click,
// so the form keeps targeting that claim even if the reader scrolls to another.
export function ClaimContribution({
  articleId,
  claimId,
  claimNumber,
  isAuthenticated,
}: ClaimContributionProps) {
  const t = useTranslations("contributions");
  const [composing, setComposing] = useState<{ claimId: string; n: number } | null>(
    null,
  );

  // Signed-out readers contribute from the article-level section (with its CTA),
  // so keep the panel uncluttered here.
  if (!isAuthenticated) {
    return null;
  }

  if (composing) {
    return (
      <div className="mt-3 space-y-2 border-t pt-3">
        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          {t("formForClaim", { n: composing.n })}
        </p>
        <ContributionForm
          key={composing.claimId}
          articleId={articleId}
          claimId={composing.claimId}
          compact
          onCancel={() => setComposing(null)}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setComposing({ claimId, n: claimNumber })}
      className="text-primary mt-3 text-xs font-medium hover:underline"
    >
      {t("addForClaim")}
    </button>
  );
}
