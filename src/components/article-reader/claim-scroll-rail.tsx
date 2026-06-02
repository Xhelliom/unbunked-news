"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { claimStatusDotClasses } from "@/lib/claim-status";
import type { ClaimCardData } from "@/components/claim-card";
import { AnimatedRailCursor } from "@/components/article-reader/animated-rail-cursor";
import type { ClaimAnchor } from "@/components/article-reader/claim-scroll";

type Props = {
  anchors: ClaimAnchor[];
  claims: ClaimCardData[];
  indicatorRatio: number;
  displayedIndex: number;
  hoveredIndex: number | null;
};

// Rail vertical : repères par claim + curseur de position « virtuelle » dans l'article.
export function ClaimScrollRail({
  anchors,
  claims,
  indicatorRatio,
  displayedIndex,
  hoveredIndex,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [railHeight, setRailHeight] = useState(0);

  const hoveredAnchor =
    hoveredIndex === null
      ? null
      : anchors.find((anchor) => anchor.index === hoveredIndex);

  const cursorRatio = hoveredAnchor?.ratio ?? indicatorRatio;
  const activeStatus = claims[displayedIndex]?.status ?? claims[0]?.status;

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const syncHeight = () => setRailHeight(rail.clientHeight);
    syncHeight();

    const resizeObserver = new ResizeObserver(syncHeight);
    resizeObserver.observe(rail);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={railRef}
      className="relative hidden h-[calc(100dvh-9rem)] w-3 shrink-0 lg:block"
      aria-hidden
    >
      <div className="bg-border/70 absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full" />

      {anchors.map(({ index, ratio }) => (
        <span
          key={index}
          className={cn(
            "absolute left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[transform,opacity] duration-200",
            claimStatusDotClasses[claims[index].status],
            index === displayedIndex ? "scale-150 opacity-100" : "opacity-55",
          )}
          style={{ top: `${ratio * 100}%` }}
        />
      ))}

      {activeStatus && (
        <AnimatedRailCursor
          targetRatio={cursorRatio}
          railHeight={railHeight}
          status={activeStatus}
        />
      )}
    </div>
  );
}
