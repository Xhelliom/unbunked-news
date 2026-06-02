"use client";

import { useEffect, useRef, useState } from "react";

// Hauteur de base : capsule longue et discrète (repère de zone, pas un point précis).
export const RAIL_CURSOR_BASE_PX = 26;
// Ressort lent pour limiter les à-coups au scroll.
const RAIL_CURSOR_SPRING = 0.1;
// Étirement léger en mouvement — le curseur reste surtout une barre fade.
const RAIL_CURSOR_STRETCH_GAIN = 14;
const RAIL_CURSOR_MAX_STRETCH = 1.85;

export type RailCursorVisual = { ratio: number; stretch: number };

/**
 * Interpole en continu vers `targetRatio` (boucle rAF) pour un déplacement fluide.
 * L'écart de vitesse entre la cible et la position affichée pilote l'étirement.
 */
export function useSmoothRailCursor(targetRatio: number): RailCursorVisual {
  const targetRef = useRef(targetRatio);
  targetRef.current = targetRatio;

  const positionRef = useRef(targetRatio);
  const [visual, setVisual] = useState<RailCursorVisual>({
    ratio: targetRatio,
    stretch: 1,
  });

  useEffect(() => {
    let frameId = 0;
    let active = true;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const tick = () => {
      if (!active) return;

      const target = targetRef.current;

      if (reducedMotion) {
        positionRef.current = target;
        setVisual({ ratio: target, stretch: 1 });
        frameId = requestAnimationFrame(tick);
        return;
      }

      const previous = positionRef.current;
      const delta = target - previous;
      const next =
        Math.abs(delta) < 0.00025 ? target : previous + delta * RAIL_CURSOR_SPRING;
      positionRef.current = next;

      const speed = Math.abs(next - previous);
      const stretch = Math.min(
        RAIL_CURSOR_MAX_STRETCH,
        1 + speed * RAIL_CURSOR_STRETCH_GAIN,
      );

      setVisual({ ratio: next, stretch });
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, []);

  return visual;
}
