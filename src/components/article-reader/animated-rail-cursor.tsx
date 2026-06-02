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

// Curseur animé : capsule qui s'allonge en scroll / survol, traînée légère en mouvement.
export function AnimatedRailCursor({ targetRatio, railHeight }: Props) {
  const { ratio, stretch } = useSmoothRailCursor(targetRatio);

  if (railHeight <= 0) return null;

  const topPx = ratio * railHeight;
  const heightPx = RAIL_CURSOR_BASE_PX * stretch;
  const isMoving = stretch > 1.12;

  return (
    <>
      {isMoving && (
        <span
          className="bg-foreground/20 pointer-events-none absolute left-1/2 z-[9] w-1 -translate-x-1/2 rounded-full blur-[0.5px]"
          style={{
            top: topPx,
            height: heightPx * 1.15,
            marginTop: -(heightPx * 1.15) / 2,
          }}
        />
      )}
      <span
        className={cn(
          "border-background bg-foreground pointer-events-none absolute left-1/2 z-10 w-2 -translate-x-1/2 rounded-full border-2 will-change-[height,margin,top,box-shadow]",
          isMoving
            ? "shadow-[0_0_10px_color-mix(in_oklab,var(--foreground)_35%,transparent)]"
            : "shadow-md",
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
