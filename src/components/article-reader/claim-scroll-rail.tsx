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
  // Lets each call site own the rail's visibility / position / height. Desktop
  // passes its in-panel sizing; mobile pins it to the right edge.
  className?: string;
  // When set, the dots become tappable (mobile navigation between claims).
  onSelect?: (index: number) => void;
  selectLabel?: string;
};

// Rail vertical : repères par claim + curseur de position « virtuelle » dans l'article.
export function ClaimScrollRail({
  anchors,
  claims,
  indicatorRatio,
  displayedIndex,
  hoveredIndex,
  className,
  onSelect,
  selectLabel,
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
      className={cn("relative", className)}
      aria-hidden={onSelect ? undefined : true}
    >
      <div className="bg-border/70 absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full" />

      {anchors.map(({ index, ratio }) => {
        const dotClass = cn(
          "block size-1.5 rounded-full transition-[transform,opacity] duration-200",
          claimStatusDotClasses[claims[index].status],
          index === displayedIndex ? "scale-150 opacity-100" : "opacity-55",
        );

        if (onSelect) {
          return (
            <button
              key={index}
              type="button"
              aria-label={selectLabel}
              onClick={() => onSelect(index)}
              className="absolute left-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ top: `${ratio * 100}%` }}
            >
              <span className={dotClass} />
            </button>
          );
        }

        return (
          <span
            key={index}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -translate-y-1/2",
              dotClass,
            )}
            style={{ top: `${ratio * 100}%` }}
          />
        );
      })}

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
