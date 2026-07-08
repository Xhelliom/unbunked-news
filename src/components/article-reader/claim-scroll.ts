/** Position normalisée (0–1) d'un claim dans la colonne de lecture. */
export type ClaimAnchor = { index: number; ratio: number };

/** État du rail : claim actif, repère de lecture et fenêtre visible. */
export type ScrollSelection = {
  activeIndex: number;
  // Repère de lecture (0–1) : ligne un peu au-dessus du centre. Pilote la bille
  // desktop ; le claim actif est l'ancre la plus proche de ce repère.
  indicatorRatio: number;
  // Fenêtre visible en fraction de la colonne (0–1) : le pouce viewport mobile
  // s'en sert pour épouser ce que le lecteur voit à l'écran.
  viewportTopRatio: number;
  viewportHeightRatio: number;
};

// Ligne de lecture : un peu au-dessus du centre pour activer les claims plus tôt.
export const PROBE_VIEWPORT_RATIO = 0.32;
// En bas de page, on force le dernier claim même si la citation n'atteint pas le centre.
export const BOTTOM_SCROLL_THRESHOLD_PX = 72;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Mesure où chaque claim se situe dans la colonne de lecture. */
export function measureClaimAnchors(root: HTMLElement): ClaimAnchor[] {
  const columnTop = root.getBoundingClientRect().top + window.scrollY;
  const columnHeight = root.offsetHeight;
  if (columnHeight <= 0) return [];

  const byIndex = new Map<number, number>();

  root.querySelectorAll<HTMLElement>("[data-claim-index]").forEach((element) => {
    const index = Number(element.dataset.claimIndex);
    if (Number.isNaN(index)) return;

    const rect = element.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2 + window.scrollY;
    const ratio = clamp01((centerY - columnTop) / columnHeight);

    // Un même claim peut apparaître dans plusieurs segments : on garde la position la plus haute.
    const previous = byIndex.get(index);
    if (previous === undefined || ratio < previous) {
      byIndex.set(index, ratio);
    }
  });

  return Array.from(byIndex.entries())
    .map(([index, ratio]) => ({ index, ratio }))
    .sort((a, b) => a.ratio - b.ratio);
}

/**
 * Déduit le claim actif, le repère de lecture et la fenêtre visible à partir du
 * scroll. Le claim actif est l'ancre la plus proche du repère de lecture (et non
 * « la dernière franchie » : dans un long écart entre deux claims, celle-ci
 * resterait le claim précédent, hors écran, et le drawer ne s'ouvrirait pas). La
 * fenêtre est un mapping linéaire, pour que le pouce mobile reste calé sur ce que
 * le lecteur voit.
 */
export function computeScrollSelection(
  anchors: ClaimAnchor[],
  columnTop: number,
  columnHeight: number,
): ScrollSelection {
  const safeHeight = columnHeight > 0 ? columnHeight : 1;
  const viewTop = window.scrollY;
  const viewBottom = viewTop + window.innerHeight;
  const viewportTopRatio = clamp01((viewTop - columnTop) / safeHeight);
  const viewportHeightRatio = Math.max(
    0,
    clamp01((viewBottom - columnTop) / safeHeight) - viewportTopRatio,
  );

  if (anchors.length === 0) {
    return {
      activeIndex: 0,
      indicatorRatio: 0,
      viewportTopRatio,
      viewportHeightRatio,
    };
  }

  const doc = document.documentElement;
  const atBottom =
    viewBottom >= doc.scrollHeight - BOTTOM_SCROLL_THRESHOLD_PX;

  if (atBottom) {
    const last = anchors[anchors.length - 1];
    return {
      activeIndex: last.index,
      indicatorRatio: 1,
      viewportTopRatio,
      viewportHeightRatio,
    };
  }

  const probe = viewTop + window.innerHeight * PROBE_VIEWPORT_RATIO;
  const indicatorRatio = clamp01((probe - columnTop) / safeHeight);

  let activeIndex = anchors[0].index;
  let nearestDistance = Infinity;
  for (const anchor of anchors) {
    const distance = Math.abs(anchor.ratio - indicatorRatio);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      activeIndex = anchor.index;
    }
  }

  return { activeIndex, indicatorRatio, viewportTopRatio, viewportHeightRatio };
}
