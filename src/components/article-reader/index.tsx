"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import { type ClaimStatus } from "@/lib/claim-status";
import type { ClaimCardData } from "@/components/claim-card";
import type { ReadingParagraph } from "@/lib/reading";
import { ClaimScrollRail } from "@/components/article-reader/claim-scroll-rail";
import {
  EXPANDED_SNAP,
  MobileClaimDrawer,
  PEEK_SNAP,
} from "@/components/article-reader/mobile-claim-drawer";
import { ReadingParagraphBlock } from "@/components/article-reader/reading-paragraph";
import { useClaimScrollSync } from "@/components/article-reader/use-claim-scroll-sync";
import { VerificationPanel } from "@/components/article-reader/verification-panel";

export type ArticleReaderProps = {
  paragraphs: ReadingParagraph[];
  claims: ClaimCardData[];
  statusLabels: Record<ClaimStatus, string>;
  sourcesLabel: string;
  verificationLabel: string;
  peekLabel: string;
  railLabel: string;
};

// Vue lecture : texte annoté à gauche, vérification synchrone (scroll + hover) à droite.
// Sur mobile, la vérification vit dans un drawer bas + un rail à droite (mêmes composants).
export function ArticleReader({
  paragraphs,
  claims,
  statusLabels,
  sourcesLabel,
  verificationLabel,
  peekLabel,
  railLabel,
}: ArticleReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { scrollActiveIndex, claimAnchors, indicatorRatio, isNearClaim } =
    useClaimScrollSync(containerRef, paragraphs, claims.length);

  const displayedIndex = hoveredIndex ?? scrollActiveIndex;

  const activeParagraph =
    displayedIndex === null
      ? -1
      : paragraphs.findIndex((paragraph) =>
          paragraph.segments.some(
            (segment) => segment.claimIndex === displayedIndex,
          ),
        );

  // --- Mobile drawer + rail state -----------------------------------------
  // Mount the drawer/rail only below the lg breakpoint, so vaul never spins up
  // on desktop (where the side panel handles verification). Starts false so SSR
  // and first paint match the server output.
  const [isMobile, setIsMobile] = useState(false);
  const [activeSnapPoint, setActiveSnapPoint] = useState<
    number | string | null
  >(PEEK_SNAP);
  // The claim the reader explicitly expanded; lets the scroll-driven reset
  // keep it open instead of snapping back to peek under it.
  const expandedForIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const mobileActiveIndex = scrollActiveIndex ?? 0;
  const hasMobileClaims = isMobile && claims.length > 0;
  const mobileOpen = hasMobileClaims && isNearClaim;
  const expanded = activeSnapPoint === EXPANDED_SNAP;

  // Arriving on a new claim by scrolling drops the drawer back to peek, unless
  // that claim is the one the reader just chose to expand.
  useEffect(() => {
    if (
      scrollActiveIndex !== null &&
      scrollActiveIndex === expandedForIndexRef.current
    ) {
      return;
    }
    setActiveSnapPoint(PEEK_SNAP);
  }, [scrollActiveIndex]);

  // Leaving the body resets the drawer so it re-enters at peek next time.
  useEffect(() => {
    if (!mobileOpen) {
      expandedForIndexRef.current = null;
      setActiveSnapPoint(PEEK_SNAP);
    }
  }, [mobileOpen]);

  const expandActiveClaim = () => {
    expandedForIndexRef.current = mobileActiveIndex;
    setActiveSnapPoint(EXPANDED_SNAP);
  };

  const scrollToClaim = (index: number) => {
    expandedForIndexRef.current = index;
    setActiveSnapPoint(EXPANDED_SNAP);
    containerRef.current
      ?.querySelector(`[data-claim-index="${index}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

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
    <div ref={containerRef} className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
      <div className="flex flex-col gap-6">
        {paragraphs.map((paragraph, paragraphIndex) => (
          <ReadingParagraphBlock
            key={paragraphIndex}
            paragraph={paragraph}
            claims={claims}
            statusLabels={statusLabels}
            displayedIndex={displayedIndex}
            isActiveParagraph={paragraphIndex === activeParagraph}
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

      {hasMobileClaims && !expanded && (
        <ClaimScrollRail
          className="fixed top-1/2 right-1 z-30 h-[60dvh] w-9 -translate-y-1/2 lg:hidden"
          anchors={claimAnchors}
          claims={claims}
          indicatorRatio={indicatorRatio}
          displayedIndex={mobileActiveIndex}
          hoveredIndex={null}
          onSelect={scrollToClaim}
          selectLabel={railLabel}
        />
      )}

      {hasMobileClaims && (
        <MobileClaimDrawer
          claims={claims}
          activeIndex={mobileActiveIndex}
          open={mobileOpen}
          activeSnapPoint={activeSnapPoint}
          onSnapChange={setActiveSnapPoint}
          onExpand={expandActiveClaim}
          sourcesLabel={sourcesLabel}
          verificationLabel={verificationLabel}
          peekLabel={peekLabel}
        />
      )}
    </div>
  );
}
