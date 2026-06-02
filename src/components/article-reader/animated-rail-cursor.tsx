"use client";

import { cn } from "@/lib/utils";
import {
  RAIL_CURSOR_BASE_PX,
  useSmoothRailCursor,
} from "@/components/article-reader/use-smooth-rail-cursor";

type Props = {
  targetRatio: number;
  railHeight: number;
};

// Curseur : longue capsule très fade — repère de zone lisible sans viser un claim précis.
export function AnimatedRailCursor({ targetRatio, railHeight }: Props) {
  const { ratio, stretch } = useSmoothRailCursor(targetRatio);

  if (railHeight <= 0) return null;

  const topPx = ratio * railHeight;
  const heightPx = RAIL_CURSOR_BASE_PX * stretch;
  const haloHeightPx = heightPx * 1.55;
  const isMoving = stretch > 1.08;

  return (
    <>
      {/* Halo large et très transparent : zone approximative autour de la position */}
      <span
        className="bg-foreground/6 pointer-events-none absolute left-1/2 z-[8] w-2.5 -translate-x-1/2 rounded-full blur-[1px]"
        style={{
          top: topPx,
          height: haloHeightPx,
          marginTop: -haloHeightPx / 2,
        }}
      />
      {isMoving && (
        <span
          className="bg-foreground/10 pointer-events-none absolute left-1/2 z-[9] w-1.5 -translate-x-1/2 rounded-full blur-[0.5px]"
          style={{
            top: topPx,
            height: heightPx * 1.2,
            marginTop: -(heightPx * 1.2) / 2,
          }}
        />
      )}
      <span
        className={cn(
          "border-foreground/15 bg-foreground/22 pointer-events-none absolute left-1/2 z-10 w-1 -translate-x-1/2 rounded-full border will-change-[height,margin,top]",
          isMoving && "bg-foreground/28",
        )}
        style={{
          top: topPx,
          height: heightPx,
          marginTop: -heightPx / 2,
        }}
      />
    </>
  );
}
