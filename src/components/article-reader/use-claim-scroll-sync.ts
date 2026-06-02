"use client";

import { useEffect, useState, type RefObject } from "react";

import type { ReadingParagraph } from "@/lib/reading";
import {
  computeScrollSelection,
  measureClaimAnchors,
  type ClaimAnchor,
} from "@/components/article-reader/claim-scroll";

type ScrollSyncState = {
  scrollActiveIndex: number | null;
  claimAnchors: ClaimAnchor[];
  indicatorRatio: number;
};

/** Lie le scroll de la page au claim actif et aux positions sur le rail. */
export function useClaimScrollSync(
  containerRef: RefObject<HTMLDivElement | null>,
  paragraphs: ReadingParagraph[],
  claimCount: number,
): ScrollSyncState {
  const [scrollActiveIndex, setScrollActiveIndex] = useState<number | null>(
    claimCount > 0 ? 0 : null,
  );
  const [claimAnchors, setClaimAnchors] = useState<ClaimAnchor[]>([]);
  const [indicatorRatio, setIndicatorRatio] = useState(0);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || claimCount === 0) return;

    let raf = 0;

    const update = () => {
      const anchors = measureClaimAnchors(root);
      setClaimAnchors(anchors);

      const columnTop = root.getBoundingClientRect().top + window.scrollY;
      const { activeIndex, indicatorRatio: ratio } = computeScrollSelection(
        anchors,
        columnTop,
        root.offsetHeight,
      );

      setScrollActiveIndex(activeIndex);
      setIndicatorRatio(ratio);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver.disconnect();
    };
  }, [paragraphs, claimCount]);

  return { scrollActiveIndex, claimAnchors, indicatorRatio };
}
