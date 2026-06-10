"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Drawer } from "vaul";

import { cn } from "@/lib/utils";
import { claimStatusToVerdict } from "@/lib/claim-status";
import { ClaimCard, type ClaimCardData } from "@/components/claim-card";
import { ClaimStatusBadge } from "@/components/claim-status-badge";
import { ClaimContribution } from "@/components/article-reader/claim-contribution";
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
  claimIds: string[];
  articleId: string;
  isAuthenticated: boolean;
  // The claims of the paragraph in view. When it holds more than one, a prev/
  // next control lets the reader step through them (scroll alone can't separate
  // two claims sharing a paragraph).
  groupIndices: number[];
  selectedIndex: number;
  onNavigate: (index: number) => void;
  open: boolean;
  activeSnapPoint: number | string | null;
  onSnapChange: (snap: number | string | null) => void;
  onExpand: () => void;
  sourcesLabel: string;
  verificationLabel: string;
  peekLabel: string;
  prevClaimLabel: string;
  nextClaimLabel: string;
};

// Vérification en drawer bas (mobile) : peek = haut de la carte (badge +
// extrait), tap = carte complète. Non-modal : la lecture reste visible et
// scrollable derrière.
export function MobileClaimDrawer({
  claims,
  claimContributions,
  claimIds,
  articleId,
  isAuthenticated,
  groupIndices,
  selectedIndex,
  onNavigate,
  open,
  activeSnapPoint,
  onSnapChange,
  onExpand,
  sourcesLabel,
  verificationLabel,
  peekLabel,
  prevClaimLabel,
  nextClaimLabel,
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

  // One verification at a time: the handle takes the colour of the verdict on
  // screen and changes as the reader steps through the paragraph's claims. The
  // position counter carries the "several verdicts here" signal instead.
  const handleBackground = `var(--verdict-${claimStatusToVerdict[claim.status]})`;

  const position = groupIndices.indexOf(selectedIndex);
  const prevIndex = position > 0 ? groupIndices[position - 1] : null;
  const nextIndex =
    position < groupIndices.length - 1 ? groupIndices[position + 1] : null;

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
          {/* Neon glow: a blurred strip straddling the top edge, behind the
              opaque card (-z-10) so it only shows above the edge and never
              paints over the content. Echoes the handle (the active verdict's
              colour). */}
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
              className="h-1.5 w-16 rounded-full transition-colors"
              style={{ background: handleBackground }}
            />
          </button>

          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2.5">
            <ClaimStatusBadge status={claim.status} />
            {hasMultiple ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => prevIndex !== null && onNavigate(prevIndex)}
                  disabled={prevIndex === null}
                  aria-label={prevClaimLabel}
                  className="text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-muted-foreground text-xs font-medium tabular-nums">
                  {position + 1}/{groupIndices.length}
                </span>
                <button
                  type="button"
                  onClick={() => nextIndex !== null && onNavigate(nextIndex)}
                  disabled={nextIndex === null}
                  aria-label={nextClaimLabel}
                  className="text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            ) : (
              <span className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.05em] whitespace-nowrap uppercase">
                {verificationLabel}
              </span>
            )}
          </div>

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
              hideHeader
            />
            <ContributionsDisplay
              contributions={claimContributions[selectedIndex] ?? []}
            />
            {claimIds[selectedIndex] && (
              <ClaimContribution
                articleId={articleId}
                claimId={claimIds[selectedIndex]}
                claimNumber={selectedIndex + 1}
                isAuthenticated={isAuthenticated}
              />
            )}
          </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
