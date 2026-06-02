"use client";

import { type MouseEvent } from "react";

import { cn } from "@/lib/utils";
import {
  type ClaimStatus,
  claimStatusHighlightClasses,
  claimStatusToVerdict,
} from "@/lib/claim-status";
import { ClaimCard, type ClaimCardData } from "@/components/claim-card";
import type { ReadingParagraph } from "@/lib/reading";

type Props = {
  paragraph: ReadingParagraph;
  claims: ClaimCardData[];
  statusLabels: Record<ClaimStatus, string>;
  displayedIndex: number | null;
  isActiveParagraph: boolean;
  sourcesLabel: string;
  verificationLabel: string;
  mobileLabel: string;
  onHoverClaim: (index: number) => void;
  onLeaveClaim: (event: MouseEvent<HTMLElement>) => void;
};

function verdictVar(status: ClaimStatus): string {
  return `var(--verdict-${claimStatusToVerdict[status]})`;
}

export function ReadingParagraphBlock({
  paragraph,
  claims,
  statusLabels,
  displayedIndex,
  isActiveParagraph,
  sourcesLabel,
  verificationLabel,
  mobileLabel,
  onHoverClaim,
  onLeaveClaim,
}: Props) {
  const claimIndices = paragraph.segments
    .map((segment) => segment.claimIndex)
    .filter((index): index is number => index !== null);
  const annotated = claimIndices.length > 0;

  const colors: string[] = [];
  for (const index of claimIndices) {
    const color = verdictVar(claims[index].status);
    if (!colors.includes(color)) colors.push(color);
  }
  const barBackground =
    colors.length <= 1
      ? colors[0]
      : `linear-gradient(to bottom, ${colors.join(", ")})`;
  const barTitle = Array.from(
    new Set(claimIndices.map((index) => statusLabels[claims[index].status])),
  ).join(" · ");

  return (
    <div className="group">
      <div
        className={cn(
          "relative transition-transform duration-300 ease-out",
          annotated && "pl-4",
          isActiveParagraph && "lg:translate-x-1.5",
        )}
      >
        {annotated && (
          <span
            aria-hidden
            title={barTitle}
            className={cn(
              "absolute inset-y-0 left-0 w-1 rounded-full transition-[width] duration-300 ease-out",
              isActiveParagraph && "lg:w-1.5",
            )}
            style={{ background: barBackground }}
          />
        )}
        <p className="font-serif text-lg leading-[1.7] text-pretty">
          {paragraph.segments.map((segment, segmentIndex) => {
            if (segment.claimIndex === null) {
              return <span key={segmentIndex}>{segment.text}</span>;
            }
            const claim = claims[segment.claimIndex];
            const isActive = segment.claimIndex === displayedIndex;
            return (
              <mark
                key={segmentIndex}
                data-claim-index={segment.claimIndex}
                title={statusLabels[claim.status]}
                onMouseEnter={() => onHoverClaim(segment.claimIndex!)}
                onMouseLeave={onLeaveClaim}
                className={cn(
                  "box-decoration-clone cursor-default rounded-[3px] px-0.5 text-inherit transition-shadow",
                  claimStatusHighlightClasses[claim.status],
                  isActive && "ring-1 ring-inset",
                )}
              >
                {segment.text}
              </mark>
            );
          })}
        </p>
      </div>

      {annotated && (
        <aside className="mt-3 flex flex-col gap-2.5 lg:hidden">
          <span className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-[0.05em] uppercase">
            ↓ {mobileLabel}
          </span>
          {claimIndices.map((index) => (
            <ClaimCard
              key={index}
              claim={claims[index]}
              sourcesLabel={sourcesLabel}
              verificationLabel={verificationLabel}
            />
          ))}
        </aside>
      )}
    </div>
  );
}
