"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type ClaimStatus,
  claimStatusHighlightClasses,
  claimStatusToVerdict,
} from "@/lib/claim-status";
import { ClaimCard, type ClaimCardData } from "@/components/claim-card";
import type { ReadingParagraph } from "@/lib/reading";

type ArticleReaderProps = {
  paragraphs: ReadingParagraph[];
  // Located claims, indexed by the `claimIndex` carried on each segment.
  claims: ClaimCardData[];
  statusLabels: Record<ClaimStatus, string>;
  sourcesLabel: string;
  verificationLabel: string;
  mobileLabel: string;
};

function verdictVar(status: ClaimStatus): string {
  return `var(--verdict-${claimStatusToVerdict[status]})`;
}

// Reading view (desktop): the original article flows as one continuous column
// on the left, with each verified passage highlighted inline in its status
// colour and a status bar on the left edge of every annotated paragraph
// (a gradient when the paragraph mixes several statuses). A single sticky panel
// on the right shows only the verification of the passage currently centered in
// the viewport, cross-fading as the reader scrolls. Below `lg`, each
// verification stacks under its paragraph.
export function ArticleReader({
  paragraphs,
  claims,
  statusLabels,
  sourcesLabel,
  verificationLabel,
  mobileLabel,
}: ArticleReaderProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(
    claims.length > 0 ? 0 : null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

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
  }, [activeIndex, refreshScrollHint]);

  useEffect(() => {
    refreshScrollHint();
    window.addEventListener("resize", refreshScrollHint);
    return () => window.removeEventListener("resize", refreshScrollHint);
  }, [refreshScrollHint]);

  // Track the highlighted passage closest to the viewport's vertical centre.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const elements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-claim-index]"),
    );
    if (elements.length === 0) return;

    const distanceToCenter = (rect: DOMRect) =>
      Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;
        const closest = visible.reduce((best, entry) =>
          distanceToCenter(entry.boundingClientRect) <
          distanceToCenter(best.boundingClientRect)
            ? entry
            : best,
        );
        setActiveIndex(
          Number((closest.target as HTMLElement).dataset.claimIndex),
        );
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 1] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [paragraphs]);

  const activeParagraph =
    activeIndex === null
      ? -1
      : paragraphs.findIndex((paragraph) =>
          paragraph.segments.some(
            (segment) => segment.claimIndex === activeIndex,
          ),
        );

  return (
    <div
      ref={containerRef}
      className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6"
    >
      <div className="flex flex-col gap-6">
        {paragraphs.map((paragraph, paragraphIndex) => {
          const claimIndices = paragraph.segments
            .map((segment) => segment.claimIndex)
            .filter((index): index is number => index !== null);
          const annotated = claimIndices.length > 0;
          const isActiveParagraph = paragraphIndex === activeParagraph;

          // Distinct status colours, in reading order, for the left bar.
          const colors: string[] = [];
          for (const index of claimIndices) {
            const color = verdictVar(claims[index].status);
            if (!colors.includes(color)) colors.push(color);
          }
          const barBackground =
            colors.length <= 1
              ? colors[0]
              : `linear-gradient(to bottom, ${colors.join(", ")})`;
          const barTitle = Array.from(
            new Set(claimIndices.map((index) => statusLabels[claims[index].status])),
          ).join(" · ");

          return (
            <div key={paragraphIndex} className="group">
              <div
                className={cn(
                  "relative transition-transform duration-300 ease-out",
                  annotated && "pl-4",
                  // Nudge the focused paragraph (and its bar) to the right.
                  isActiveParagraph && "lg:translate-x-1.5",
                )}
              >
                {annotated && (
                  <span
                    aria-hidden
                    title={barTitle}
                    className={cn(
                      "absolute inset-y-0 left-0 w-1 rounded-full transition-[width] duration-300 ease-out",
                      isActiveParagraph && "lg:w-1.5",
                    )}
                    style={{ background: barBackground }}
                  />
                )}
                <p className="font-serif text-lg leading-[1.7] text-pretty">
                  {paragraph.segments.map((segment, segmentIndex) => {
                    if (segment.claimIndex === null) {
                      return <span key={segmentIndex}>{segment.text}</span>;
                    }
                    const claim = claims[segment.claimIndex];
                    const isActive = segment.claimIndex === activeIndex;
                    return (
                      <mark
                        key={segmentIndex}
                        data-claim-index={segment.claimIndex}
                        title={statusLabels[claim.status]}
                        className={cn(
                          "box-decoration-clone rounded-[3px] px-0.5 text-inherit transition-shadow",
                          claimStatusHighlightClasses[claim.status],
                          isActive && "ring-1 ring-inset",
                        )}
                      >
                        {segment.text}
                      </mark>
                    );
                  })}
                </p>
              </div>

              {annotated && (
                <aside className="mt-3 flex flex-col gap-2.5 lg:hidden">
                  <span className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-[0.05em] uppercase">
                    ↓ {mobileLabel}
                  </span>
                  {claimIndices.map((index) => (
                    <ClaimCard
                      key={index}
                      claim={claims[index]}
                      sourcesLabel={sourcesLabel}
                      verificationLabel={verificationLabel}
                    />
                  ))}
                </aside>
              )}
            </div>
          );
        })}
      </div>

      {claims.length > 0 && (
        <div className="hidden lg:block">
          <div className="sticky top-28">
            <div
              ref={panelRef}
              onScroll={refreshScrollHint}
              className="max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain"
            >
              {activeIndex !== null && (
                <div
                  key={activeIndex}
                  className="animate-in fade-in-0 slide-in-from-bottom-2 flex flex-col gap-2.5 duration-300"
                >
                  <ClaimCard
                    claim={claims[activeIndex]}
                    sourcesLabel={sourcesLabel}
                    verificationLabel={verificationLabel}
                  />
                </div>
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
      )}
    </div>
  );
}
