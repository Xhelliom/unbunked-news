"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { ClaimCard, type ClaimCardData } from "@/components/claim-card";
import { ClaimContribution } from "@/components/article-reader/claim-contribution";
import { ClaimScrollRail } from "@/components/article-reader/claim-scroll-rail";
import { ContributionsDisplay } from "@/components/article-reader/contributions-display";
import type { ClaimAnchor } from "@/components/article-reader/claim-scroll";
import type { PublicContribution } from "@/lib/contributions/queries";

type Props = {
  claims: ClaimCardData[];
  claimContributions: PublicContribution[][];
  // Claim ids aligned by index with `claims`, for per-claim contribution.
  claimIds: string[];
  articleId: string;
  isAuthenticated: boolean;
  claimAnchors: ClaimAnchor[];
  indicatorRatio: number;
  viewportTopRatio: number;
  viewportHeightRatio: number;
  displayedIndex: number;
  sourcesLabel: string;
  verificationLabel: string;
};

export function VerificationPanel({
  claims,
  claimContributions,
  claimIds,
  articleId,
  isAuthenticated,
  claimAnchors,
  indicatorRatio,
  viewportTopRatio,
  viewportHeightRatio,
  displayedIndex,
  sourcesLabel,
  verificationLabel,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const refreshScrollHint = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) {
      setCanScrollDown(false);
      return;
    }
    setCanScrollDown(
      panel.scrollHeight - panel.scrollTop - panel.clientHeight > 4,
    );
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (panel) panel.scrollTop = 0;
    refreshScrollHint();
  }, [displayedIndex, refreshScrollHint]);

  useEffect(() => {
    refreshScrollHint();
    window.addEventListener("resize", refreshScrollHint);
    return () => window.removeEventListener("resize", refreshScrollHint);
  }, [refreshScrollHint]);

  return (
    <div className="hidden lg:block">
      <div className="relative sticky top-28 flex gap-2">
        <ClaimScrollRail
          className="hidden h-[calc(100dvh-9rem)] w-3 shrink-0 lg:block"
          anchors={claimAnchors}
          claims={claims}
          indicatorRatio={indicatorRatio}
          viewportTopRatio={viewportTopRatio}
          viewportHeightRatio={viewportHeightRatio}
          displayedIndex={displayedIndex}
          fixedThumbPx={28}
        />

        <div className="relative min-w-0 flex-1">
          <div
            ref={panelRef}
            onScroll={refreshScrollHint}
            className="max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain"
          >
            <div
              key={displayedIndex}
              className="animate-in fade-in-0 slide-in-from-bottom-2 flex flex-col gap-2.5 duration-300"
            >
              <ClaimCard
                claim={claims[displayedIndex]}
                sourcesLabel={sourcesLabel}
                verificationLabel={verificationLabel}
              />
              <ContributionsDisplay
                contributions={claimContributions[displayedIndex] ?? []}
              />
            </div>
            {/* Outside the keyed div so an in-progress correction survives a
                scroll that changes the displayed claim. */}
            {claimIds[displayedIndex] && (
              <ClaimContribution
                articleId={articleId}
                claimId={claimIds[displayedIndex]}
                claimNumber={displayedIndex + 1}
                isAuthenticated={isAuthenticated}
              />
            )}
          </div>

          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 -bottom-2 flex justify-center transition-opacity duration-300",
              canScrollDown ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="bg-background/80 ring-border/60 text-muted-foreground rounded-full p-1 shadow-sm ring-1 backdrop-blur [animation-duration:2.4s] motion-safe:animate-pulse">
              <ChevronDown className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
