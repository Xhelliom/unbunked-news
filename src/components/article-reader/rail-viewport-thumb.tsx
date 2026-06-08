"use client";

import { useEffect, useRef } from "react";

// Étirement (px) dérivé de la vitesse de scroll réelle (px/frame) : grandit
// vite, retombe en douceur. Réglages de l'amplitude du « smear ».
const STRETCH_MAX_PX = 30;
const STRETCH_GAIN = 0.6;
const STRETCH_RISE = 0.5;
const STRETCH_DECAY = 0.85;
// Lissage de position (desktop) : interpole vers la cible pour gommer les sauts
// discrets du scroll molette. Plus haut = plus réactif, plus bas = plus doux.
const CENTER_SPRING = 0.16;

type Props = {
  // Where the thumb centres, as a fraction of the rail (0–1).
  centerRatio: number;
  // Un-stretched height in px (viewport window on mobile, fixed bead on desktop).
  baseHeightPx: number;
  railHeight: number;
  color: string;
  // Desktop only: ease the centre toward its target (wheel scroll jumps in
  // discrete steps). Mobile tracks 1:1 — easing there would just add lag.
  smooth?: boolean;
};

// Pouce du rail : position et étirement pilotés en rAF directement sur le DOM
// (aucun rendu React par frame, donc aucune latence). Centré sur le repère de
// lecture ; sur mobile sa hauteur épouse la fenêtre visible.
export function RailViewportThumb({
  centerRatio,
  baseHeightPx,
  railHeight,
  color,
  smooth = false,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const geomRef = useRef({ centerRatio, baseHeightPx, railHeight, smooth });

  // Mirror the latest geometry for the rAF loop without re-subscribing it.
  useEffect(() => {
    geomRef.current = { centerRatio, baseHeightPx, railHeight, smooth };
  });

  useEffect(() => {
    let frameId = 0;
    let active = true;
    let stretch = 0;
    let displayedCenter = geomRef.current.centerRatio;
    let previousScrollY = window.scrollY;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const tick = () => {
      if (!active) return;

      const element = ref.current;
      const { centerRatio, baseHeightPx, railHeight, smooth } = geomRef.current;
      if (element && railHeight > 0) {
        if (reducedMotion) {
          stretch = 0;
        } else {
          const scrollY = window.scrollY;
          const velocity = Math.abs(scrollY - previousScrollY);
          previousScrollY = scrollY;
          const target = Math.min(STRETCH_MAX_PX, velocity * STRETCH_GAIN);
          stretch =
            target > stretch
              ? stretch + (target - stretch) * STRETCH_RISE
              : stretch * STRETCH_DECAY;
          if (stretch < 0.5) stretch = 0;
        }

        // Mobile snaps 1:1; desktop eases toward the target to smooth wheel jumps.
        if (smooth && !reducedMotion) {
          displayedCenter += (centerRatio - displayedCenter) * CENTER_SPRING;
          if (Math.abs(centerRatio - displayedCenter) < 0.0002) {
            displayedCenter = centerRatio;
          }
        } else {
          displayedCenter = centerRatio;
        }

        const height = baseHeightPx + stretch;
        const top = Math.max(
          0,
          Math.min(
            displayedCenter * railHeight - height / 2,
            railHeight - height,
          ),
        );
        element.style.height = `${height}px`;
        element.style.top = `${top}px`;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <span
      ref={ref}
      className="border-background pointer-events-none absolute left-1/2 w-2 -translate-x-1/2 rounded-full border-2 transition-[background-color] duration-500 ease-in-out motion-reduce:duration-0"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 8px color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    />
  );
}
