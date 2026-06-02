"use client";

import { useEffect, useRef, useState } from "react";

// Taille de base du curseur (cercle au repos).
export const RAIL_CURSOR_BASE_PX = 10;
// Ressort : plus la valeur est haute, plus le curseur suit vite la cible.
const RAIL_CURSOR_SPRING = 0.22;
// Étirement vertical proportionnel à la vitesse du curseur.
const RAIL_CURSOR_STRETCH_GAIN = 34;
const RAIL_CURSOR_MAX_STRETCH = 3.6;

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
        Math.abs(delta) < 0.0004 ? target : previous + delta * RAIL_CURSOR_SPRING;
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
