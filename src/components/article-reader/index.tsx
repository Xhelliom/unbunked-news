"use client";

import { useRef, useState, type MouseEvent } from "react";

import { type ClaimStatus } from "@/lib/claim-status";
import { ClaimCard, type ClaimCardData } from "@/components/claim-card";
import type { ReadingParagraph } from "@/lib/reading";
import { ReadingParagraphBlock } from "@/components/article-reader/reading-paragraph";
import { useClaimScrollSync } from "@/components/article-reader/use-claim-scroll-sync";
import { VerificationPanel } from "@/components/article-reader/verification-panel";

export type ArticleReaderProps = {
  paragraphs: ReadingParagraph[];
  claims: ClaimCardData[];
  statusLabels: Record<ClaimStatus, string>;
  sourcesLabel: string;
  verificationLabel: string;
  mobileLabel: string;
};

// Vue lecture : texte annoté à gauche, vérification synchrone (scroll + hover) à droite.
export function ArticleReader({
  paragraphs,
  claims,
  statusLabels,
  sourcesLabel,
  verificationLabel,
  mobileLabel,
}: ArticleReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { scrollActiveIndex, claimAnchors, indicatorRatio } = useClaimScrollSync(
    containerRef,
    paragraphs,
    claims.length,
  );

  const displayedIndex = hoveredIndex ?? scrollActiveIndex;

  const activeParagraph =
    displayedIndex === null
      ? -1
      : paragraphs.findIndex((paragraph) =>
          paragraph.segments.some(
            (segment) => segment.claimIndex === displayedIndex,
          ),
        );

  const clearHoverUnlessMovingToClaim = (event: MouseEvent<HTMLElement>) => {
    const target = event.relatedTarget;
    if (
      target instanceof Element &&
      target.closest("[data-claim-index]") !== null
    ) {
      return;
    }
    setHoveredIndex(null);
  };

  return (
    <div
      ref={containerRef}
      className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6"
    >
      <div className="flex flex-col gap-6">
        {paragraphs.map((paragraph, paragraphIndex) => (
          <ReadingParagraphBlock
            key={paragraphIndex}
            paragraph={paragraph}
            claims={claims}
            statusLabels={statusLabels}
            displayedIndex={displayedIndex}
            isActiveParagraph={paragraphIndex === activeParagraph}
            sourcesLabel={sourcesLabel}
            verificationLabel={verificationLabel}
            mobileLabel={mobileLabel}
            onHoverClaim={setHoveredIndex}
            onLeaveClaim={clearHoverUnlessMovingToClaim}
          />
        ))}
      </div>

      {claims.length > 0 && displayedIndex !== null && (
        <VerificationPanel
          claims={claims}
          claimAnchors={claimAnchors}
          indicatorRatio={indicatorRatio}
          displayedIndex={displayedIndex}
          hoveredIndex={hoveredIndex}
          sourcesLabel={sourcesLabel}
          verificationLabel={verificationLabel}
        />
      )}
    </div>
  );
}
