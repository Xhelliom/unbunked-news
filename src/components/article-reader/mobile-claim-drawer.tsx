"use client";

import { useEffect } from "react";
import { Drawer } from "vaul";

import { cn } from "@/lib/utils";
import { ClaimCard, type ClaimCardData } from "@/components/claim-card";

// Snap points shared with the reader: a slim peek that reveals the top of the
// claim card (badge + claim excerpt), and 0.92 (most of the viewport, leaving
// a sliver of article visible) for the full card. The Content must be full
// viewport height (h-dvh): vaul computes its snap offsets against the viewport,
// so a shorter drawer (or an `h-full` capped by `max-h`) lands the peek
// off-screen.
export const PEEK_SNAP = "104px";
export const EXPANDED_SNAP = 0.92;
const SNAP_POINTS: (number | string)[] = [PEEK_SNAP, EXPANDED_SNAP];

type MobileClaimDrawerProps = {
  claims: ClaimCardData[];
  activeIndex: number;
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
  activeIndex,
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

  const claim = claims[activeIndex];
  if (!claim) return null;

  const expanded = activeSnapPoint === EXPANDED_SNAP;

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
        <Drawer.Content className="bg-card fixed inset-x-0 bottom-0 z-30 flex h-dvh flex-col rounded-t-2xl border-t shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.45)] outline-none lg:hidden">
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
            <span aria-hidden className="bg-border h-1.5 w-10 rounded-full" />
          </button>

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
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
