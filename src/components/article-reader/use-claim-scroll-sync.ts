"use client";

import { useEffect, useState, type RefObject } from "react";

import type { ReadingParagraph } from "@/lib/reading";
import {
  CLAIM_NEAR_VIEWPORT_FACTOR,
  computeScrollSelection,
  measureClaimAnchors,
  PROBE_VIEWPORT_RATIO,
  type ClaimAnchor,
} from "@/components/article-reader/claim-scroll";

type ScrollSyncState = {
  scrollActiveIndex: number | null;
  claimAnchors: ClaimAnchor[];
  indicatorRatio: number;
  // True only while the reading probe sits close to the active claim — the
  // mobile drawer keys its open state on this (the active index is always
  // clamped to a claim, so on its own it can't tell "near a claim" from "far").
  isNearClaim: boolean;
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
  const [isNearClaim, setIsNearClaim] = useState(false);

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

      const active = anchors.find((anchor) => anchor.index === activeIndex);
      const probe = window.scrollY + window.innerHeight * PROBE_VIEWPORT_RATIO;
      const claimDistance =
        active === undefined
          ? Infinity
          : Math.abs(probe - (columnTop + active.ratio * root.offsetHeight));
      setIsNearClaim(
        claimDistance <= window.innerHeight * CLAIM_NEAR_VIEWPORT_FACTOR,
      );
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
  }, [paragraphs, claimCount, containerRef]);

  return { scrollActiveIndex, claimAnchors, indicatorRatio, isNearClaim };
}
