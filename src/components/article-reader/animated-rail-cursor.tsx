"use client";

import { cn } from "@/lib/utils";
import {
  type ClaimStatus,
  claimStatusToVerdict,
} from "@/lib/claim-status";
import {
  RAIL_CURSOR_BASE_PX,
  useSmoothRailCursor,
} from "@/components/article-reader/use-smooth-rail-cursor";

// Durée du fondu quand le curseur change de claim (couleur de verdict).
const COLOR_TRANSITION_CLASS =
  "transition-[background-color,box-shadow] duration-500 ease-in-out motion-reduce:duration-0";

function verdictColorVar(status: ClaimStatus): string {
  return `var(--verdict-${claimStatusToVerdict[status]})`;
}

type Props = {
  targetRatio: number;
  railHeight: number;
  /** Statut du claim actif (scroll ou survol) — pilote la couleur du curseur. */
  status: ClaimStatus;
};

// Curseur animé : capsule longue, couleur du claim actif avec fondu au changement.
export function AnimatedRailCursor({
  targetRatio,
  railHeight,
  status,
}: Props) {
  const { ratio, stretch } = useSmoothRailCursor(targetRatio);
  const color = verdictColorVar(status);

  if (railHeight <= 0) return null;

  const topPx = ratio * railHeight;
  const heightPx = RAIL_CURSOR_BASE_PX * stretch;
  const isMoving = stretch > 1.12;

  const glow = isMoving
    ? `0 0 10px color-mix(in oklab, ${color} 40%, transparent)`
    : `0 2px 6px color-mix(in oklab, ${color} 30%, transparent)`;

  return (
    <>
      {isMoving && (
        <span
          className={cn(
            "pointer-events-none absolute left-1/2 z-[9] w-1 -translate-x-1/2 rounded-full blur-[0.5px]",
            COLOR_TRANSITION_CLASS,
          )}
          style={{
            top: topPx,
            height: heightPx * 1.15,
            marginTop: -(heightPx * 1.15) / 2,
            backgroundColor: `color-mix(in oklab, ${color} 28%, transparent)`,
          }}
        />
      )}
      <span
        className={cn(
          "border-background pointer-events-none absolute left-1/2 z-10 w-2 -translate-x-1/2 rounded-full border-2 will-change-[height,margin,top,background-color,box-shadow]",
          COLOR_TRANSITION_CLASS,
        )}
        style={{
          top: topPx,
          height: heightPx,
          marginTop: -heightPx / 2,
          backgroundColor: color,
          boxShadow: glow,
        }}
      />
    </>
  );
}
