/** Position normalisée (0–1) d'un claim dans la colonne de lecture. */
export type ClaimAnchor = { index: number; ratio: number };

// Ligne de lecture : un peu au-dessus du centre pour activer les claims plus tôt.
export const PROBE_VIEWPORT_RATIO = 0.32;
// Accélère la progression du sélecteur / repère par rapport au scroll réel.
export const SCROLL_PROGRESS_BOOST = 1.28;
// En bas de page, on force le dernier claim même si la citation n'atteint pas le centre.
export const BOTTOM_SCROLL_THRESHOLD_PX = 72;

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
    const ratio = Math.max(0, Math.min(1, (centerY - columnTop) / columnHeight));

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

/** Déduit le claim actif et la position du repère à partir du scroll. */
export function computeScrollSelection(
  anchors: ClaimAnchor[],
  columnTop: number,
  columnHeight: number,
): { activeIndex: number; indicatorRatio: number } {
  if (anchors.length === 0) {
    return { activeIndex: 0, indicatorRatio: 0 };
  }

  const doc = document.documentElement;
  const atBottom =
    window.scrollY + window.innerHeight >=
    doc.scrollHeight - BOTTOM_SCROLL_THRESHOLD_PX;

  if (atBottom) {
    const last = anchors[anchors.length - 1];
    return { activeIndex: last.index, indicatorRatio: 1 };
  }

  const probe = window.scrollY + window.innerHeight * PROBE_VIEWPORT_RATIO;
  const rawProgress =
    columnHeight > 0
      ? Math.max(0, Math.min(1, (probe - columnTop) / columnHeight))
      : 0;
  const indicatorRatio = Math.min(1, rawProgress * SCROLL_PROGRESS_BOOST);

  let activeIndex = anchors[0].index;
  for (const anchor of anchors) {
    if (anchor.ratio <= indicatorRatio) {
      activeIndex = anchor.index;
    }
  }

  return { activeIndex, indicatorRatio };
}
