"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  claimStatusDotClasses,
  claimStatusToVerdict,
} from "@/lib/claim-status";
import type { ClaimCardData } from "@/components/claim-card";
import type { ClaimAnchor } from "@/components/article-reader/claim-scroll";
import { RailViewportThumb } from "@/components/article-reader/rail-viewport-thumb";

// Hauteur plancher du pouce viewport (mobile) : sur un long article la fenêtre
// visible occupe une fraction minuscule du rail ; on garde une cible visible.
const MIN_THUMB_PX = 22;

type Props = {
  anchors: ClaimAnchor[];
  claims: ClaimCardData[];
  // Reading probe (0–1): anchors the desktop bead and the active claim.
  indicatorRatio: number;
  // Visible window as a fraction of the reading column (0–1) — mobile thumb.
  viewportTopRatio: number;
  viewportHeightRatio: number;
  displayedIndex: number;
  // Lets each call site own the rail's visibility / position / height. Desktop
  // passes its in-panel sizing; mobile pins it to the right edge.
  className?: string;
  // Desktop renders a fixed-height bead instead of a viewport-sized window.
  fixedThumbPx?: number;
  // When set, the dots become tappable (mobile navigation between claims).
  onSelect?: (index: number) => void;
  selectLabel?: string;
};

// Rail vertical : repères par claim + pouce « fenêtre visible » calé sur le scroll.
export function ClaimScrollRail({
  anchors,
  claims,
  indicatorRatio,
  viewportTopRatio,
  viewportHeightRatio,
  displayedIndex,
  className,
  fixedThumbPx,
  onSelect,
  selectLabel,
}: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [railHeight, setRailHeight] = useState(0);

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

  const thumbColor = activeStatus
    ? `var(--verdict-${claimStatusToVerdict[activeStatus]})`
    : null;

  // Desktop: a fixed-height bead riding the reading probe (its dot stays in the
  // bead). Mobile: a viewport-sized window centred on what's on screen.
  const isFixedThumb = fixedThumbPx != null;
  const thumbCenterRatio = isFixedThumb
    ? indicatorRatio
    : viewportTopRatio + viewportHeightRatio / 2;
  const thumbBaseHeightPx = isFixedThumb
    ? fixedThumbPx
    : Math.max(MIN_THUMB_PX, viewportHeightRatio * railHeight);

  return (
    <div
      ref={railRef}
      className={cn("relative", className)}
      aria-hidden={onSelect ? undefined : true}
    >
      <div className="bg-border/70 absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full" />

      {thumbColor && railHeight > 0 && (
        <RailViewportThumb
          centerRatio={thumbCenterRatio}
          baseHeightPx={thumbBaseHeightPx}
          railHeight={railHeight}
          color={thumbColor}
          smooth={isFixedThumb}
        />
      )}

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
    </div>
  );
}
