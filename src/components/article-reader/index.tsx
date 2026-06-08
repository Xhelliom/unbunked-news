"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import { type ClaimStatus } from "@/lib/claim-status";
import { cn } from "@/lib/utils";
import type { ClaimCardData } from "@/components/claim-card";
import type { PublicContribution } from "@/lib/contributions/queries";
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
  // Approved contributions per claim, aligned by index with `claims`.
  claimContributions: PublicContribution[][];
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
  claimContributions,
  statusLabels,
  sourcesLabel,
  verificationLabel,
  peekLabel,
  railLabel,
}: ArticleReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const {
    scrollActiveIndex,
    claimAnchors,
    indicatorRatio,
    viewportTopRatio,
    viewportHeightRatio,
    isNearClaim,
  } = useClaimScrollSync(containerRef, paragraphs, claims.length);

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
  // The paragraph group the reader explicitly expanded, keyed by its first
  // claim index. The snap is derived from it (no effects): the drawer is
  // expanded only while that group is in view, so scrolling to another
  // paragraph falls back to the peek on its own.
  const [expandedForGroupKey, setExpandedForGroupKey] = useState<number | null>(
    null,
  );
  // Which claim of the in-view paragraph the reader picked (tap on a highlight,
  // a chip, or a rail dot). Claim indices are globally unique, so this stays
  // valid only while its paragraph is the active one — no reset effect needed.
  const [tappedClaim, setTappedClaim] = useState<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // The fixed mobile rail is pinned to the viewport's vertical centre, so it
  // must only appear once the annotated article reaches that centre — otherwise
  // it floats over the full-width header (score, criteria). The -45% margins
  // collapse the observer's root to the central band the rail occupies.
  const [isReadingInView, setIsReadingInView] = useState(false);
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsReadingInView(entry.isIntersecting),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const mobileActiveIndex = scrollActiveIndex ?? 0;
  const hasMobileClaims = isMobile && claims.length > 0;
  const mobileOpen = hasMobileClaims && isNearClaim;

  // Every claim index sharing the active claim's paragraph, in reading order.
  const claimsInParagraphOf = (claimIndex: number): number[] => {
    const paragraph = paragraphs.find((p) =>
      p.segments.some((segment) => segment.claimIndex === claimIndex),
    );
    if (!paragraph) return [claimIndex];
    const indices: number[] = [];
    for (const segment of paragraph.segments) {
      const index = segment.claimIndex;
      if (index !== null && !indices.includes(index)) indices.push(index);
    }
    return indices.length > 0 ? indices : [claimIndex];
  };

  const groupIndices = claimsInParagraphOf(mobileActiveIndex);
  const groupKey = groupIndices[0];
  const groupKeyForClaim = (index: number) => claimsInParagraphOf(index)[0];

  // The chip the drawer shows: the tapped claim while its paragraph is active,
  // otherwise the scroll-selected one.
  const drawerSelectedIndex =
    tappedClaim !== null && groupIndices.includes(tappedClaim)
      ? tappedClaim
      : mobileActiveIndex;

  const expanded = expandedForGroupKey === groupKey;
  const activeSnapPoint = expanded ? EXPANDED_SNAP : PEEK_SNAP;

  const handleSnapChange = (snap: number | string | null) => {
    setExpandedForGroupKey(snap === EXPANDED_SNAP ? groupKey : null);
  };

  const expandActiveClaim = () => setExpandedForGroupKey(groupKey);

  // Pick a claim and expand its paragraph's drawer (highlight or rail tap).
  const selectClaim = (index: number) => {
    setTappedClaim(index);
    setExpandedForGroupKey(groupKeyForClaim(index));
  };

  // Switching chips inside the already-open drawer only swaps the card — it must
  // not change the snap, so the drawer stays where the reader left it.
  const selectClaimInDrawer = (index: number) => setTappedClaim(index);

  const scrollToClaim = (index: number) => {
    selectClaim(index);
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
      <div
        className={cn(
          "flex flex-col gap-6",
          // Reserve a right gutter on mobile so the fixed claim rail never
          // crops the paragraph text. Cleared once the side panel takes over.
          claims.length > 0 && "pr-10 lg:pr-0",
        )}
      >
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
            onSelectClaim={isMobile ? selectClaim : undefined}
          />
        ))}
      </div>

      {claims.length > 0 && displayedIndex !== null && (
        <VerificationPanel
          claims={claims}
          claimContributions={claimContributions}
          claimAnchors={claimAnchors}
          indicatorRatio={indicatorRatio}
          viewportTopRatio={viewportTopRatio}
          viewportHeightRatio={viewportHeightRatio}
          displayedIndex={displayedIndex}
          sourcesLabel={sourcesLabel}
          verificationLabel={verificationLabel}
        />
      )}

      {hasMobileClaims && !expanded && isReadingInView && (
        <ClaimScrollRail
          className="fixed top-1/2 right-1 z-30 h-[60dvh] w-9 -translate-y-1/2 lg:hidden"
          anchors={claimAnchors}
          claims={claims}
          indicatorRatio={indicatorRatio}
          viewportTopRatio={viewportTopRatio}
          viewportHeightRatio={viewportHeightRatio}
          displayedIndex={drawerSelectedIndex}
          onSelect={scrollToClaim}
          selectLabel={railLabel}
        />
      )}

      {hasMobileClaims && (
        <MobileClaimDrawer
          claims={claims}
          claimContributions={claimContributions}
          groupIndices={groupIndices}
          selectedIndex={drawerSelectedIndex}
          onSelectIndex={selectClaimInDrawer}
          statusLabels={statusLabels}
          open={mobileOpen}
          activeSnapPoint={activeSnapPoint}
          onSnapChange={handleSnapChange}
          onExpand={expandActiveClaim}
          sourcesLabel={sourcesLabel}
          verificationLabel={verificationLabel}
          peekLabel={peekLabel}
        />
      )}
    </div>
  );
}
