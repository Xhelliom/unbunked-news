"use client";

import { useEffect } from "react";
import { Drawer } from "vaul";

import { cn } from "@/lib/utils";
import {
  type ClaimStatus,
  claimStatusDotClasses,
  claimStatusToVerdict,
} from "@/lib/claim-status";
import { ClaimCard, type ClaimCardData } from "@/components/claim-card";
import { ContributionsDisplay } from "@/components/article-reader/contributions-display";
import type { PublicContribution } from "@/lib/contributions/queries";

// Snap points shared with the reader: a slim peek that reveals the top of the
// claim card (badge + claim excerpt), and 0.8 (most of the viewport, leaving
// a strip of article visible) for the full card. The Content must be full
// viewport height (h-dvh): vaul computes its snap offsets against the viewport,
// so a shorter drawer (or an `h-full` capped by `max-h`) lands the peek
// off-screen.
export const PEEK_SNAP = "132px";
export const EXPANDED_SNAP = 0.8;
const SNAP_POINTS: (number | string)[] = [PEEK_SNAP, EXPANDED_SNAP];

type MobileClaimDrawerProps = {
  claims: ClaimCardData[];
  claimContributions: PublicContribution[][];
  // The claims of the paragraph in view. When it holds more than one, a chip
  // selector lets the reader switch between them (scroll alone can't separate
  // two claims sharing a paragraph).
  groupIndices: number[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  statusLabels: Record<ClaimStatus, string>;
  open: boolean;
  activeSnapPoint: number | string | null;
  onSnapChange: (snap: number | string | null) => void;
  onExpand: () => void;
  sourcesLabel: string;
  verificationLabel: string;
  peekLabel: string;
};

// Vérification en drawer bas (mobile) : peek = haut de la carte (badge +
// extrait), tap = carte complète. Non-modal : la lecture reste visible et
// scrollable derrière.
export function MobileClaimDrawer({
  claims,
  claimContributions,
  groupIndices,
  selectedIndex,
  onSelectIndex,
  statusLabels,
  open,
  activeSnapPoint,
  onSnapChange,
  onExpand,
  sourcesLabel,
  verificationLabel,
  peekLabel,
}: MobileClaimDrawerProps) {
  // `noBodyStyles` + `modal={false}` should leave the page interactive, but
  // vaul 1.1.2 still pins `pointer-events: none` on <body> while open (it would
  // kill the rail taps and article links behind the drawer). Keep the body
  // interactive for as long as the drawer is open, re-asserting if vaul writes
  // the style again.
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const enforce = () => {
      if (body.style.pointerEvents === "none") body.style.pointerEvents = "";
    };
    enforce();
    const observer = new MutationObserver(enforce);
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });
    return () => {
      observer.disconnect();
      body.style.pointerEvents = "";
    };
  }, [open]);

  const claim = claims[selectedIndex];
  if (!claim) return null;

  const expanded = activeSnapPoint === EXPANDED_SNAP;
  const hasMultiple = groupIndices.length > 1;

  // Mirror the paragraph's left bar: one colour per claim, gradient across the
  // group's distinct verdicts — so the handle echoes the whole paragraph, not
  // just the selected claim.
  const handleColors: string[] = [];
  for (const index of groupIndices) {
    const color = `var(--verdict-${claimStatusToVerdict[claims[index].status]})`;
    if (!handleColors.includes(color)) handleColors.push(color);
  }
  const handleBackground =
    handleColors.length <= 1
      ? handleColors[0]
      : `linear-gradient(to right, ${handleColors.join(", ")})`;


  return (
    <Drawer.Root
      open={open}
      onOpenChange={() => {}}
      modal={false}
      // Non-modal must stay truly non-blocking: vaul otherwise pins
      // `pointer-events: none` on <body>, which kills the rail taps and the
      // article links behind the drawer.
      noBodyStyles
      dismissible={false}
      direction="bottom"
      snapPoints={SNAP_POINTS}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={onSnapChange}
    >
      <Drawer.Portal>
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-30 h-dvh outline-none lg:hidden">
          {/* Neon glow: a blurred gradient strip straddling the top edge, behind
              the opaque card (-z-10) so it only shows above the edge and never
              paints over the content. Echoes the handle (gradient across the
              paragraph's claims). */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-6 -translate-y-1/2 opacity-60 blur-md"
            style={{ background: handleBackground }}
          />

          <div className="bg-card flex h-full flex-col rounded-t-2xl border-t shadow-[0_-6px_20px_-14px_rgba(0,0,0,0.4)]">
            <Drawer.Title className="sr-only">{peekLabel}</Drawer.Title>
            <Drawer.Description className="sr-only">
              {claim.claimText ?? peekLabel}
            </Drawer.Description>

            <button
              type="button"
              onClick={onExpand}
              aria-label={peekLabel}
              className="flex w-full shrink-0 items-center justify-center pt-2.5 pb-1.5"
            >
            <span
              aria-hidden
              className={cn(
                "h-1.5 rounded-full transition-all",
                hasMultiple ? "w-32" : "w-16",
              )}
              style={{ background: handleBackground }}
            />
          </button>

          {hasMultiple && (
            <div className="flex shrink-0 flex-wrap gap-1.5 px-4 pb-2.5">
              {groupIndices.map((index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onSelectIndex(index)}
                    aria-pressed={isSelected}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      isSelected
                        ? "bg-secondary border-foreground/20 text-foreground"
                        : "text-muted-foreground border-transparent",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 rounded-full",
                        claimStatusDotClasses[claims[index].status],
                      )}
                    />
                    {statusLabels[claims[index].status]}
                  </button>
                );
              })}
            </div>
          )}

          <div
            className={cn(
              "min-h-0 flex-1 px-4 pb-8",
              expanded ? "overflow-y-auto overscroll-contain" : "overflow-hidden",
            )}
          >
            <ClaimCard
              claim={claim}
              sourcesLabel={sourcesLabel}
              verificationLabel={verificationLabel}
              frameless
              hideHeader={hasMultiple}
            />
            <ContributionsDisplay
              contributions={claimContributions[selectedIndex] ?? []}
            />
          </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
