"use client";

import { type MouseEvent } from "react";

import { cn } from "@/lib/utils";
import {
  type ClaimStatus,
  claimStatusHighlightClasses,
  claimStatusToVerdict,
} from "@/lib/claim-status";
import { type ClaimCardData } from "@/components/claim-card";
import type { BlockKind } from "@/lib/article-blocks";
import type { ReadingParagraph, ReadingSegment } from "@/lib/reading";

type Props = {
  paragraph: ReadingParagraph;
  claims: ClaimCardData[];
  statusLabels: Record<ClaimStatus, string>;
  displayedIndex: number | null;
  isActiveParagraph: boolean;
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
        <ParagraphBody
          kind={paragraph.kind}
          segments={paragraph.segments}
          claims={claims}
          statusLabels={statusLabels}
          displayedIndex={displayedIndex}
          onHoverClaim={onHoverClaim}
          onLeaveClaim={onLeaveClaim}
        />
      </div>
    </div>
  );
}

type ParagraphBodyProps = {
  kind: BlockKind;
  segments: ReadingSegment[];
  claims: ClaimCardData[];
  statusLabels: Record<ClaimStatus, string>;
  displayedIndex: number | null;
  onHoverClaim: (index: number) => void;
  onLeaveClaim: (event: MouseEvent<HTMLElement>) => void;
};

// Renders the annotated text in the element that matches its structural role,
// so a heading or quote in the original reads as one — instead of every block
// flattening into a paragraph. Code is verbatim and carries no claim marks.
function ParagraphBody({
  kind,
  segments,
  claims,
  statusLabels,
  displayedIndex,
  onHoverClaim,
  onLeaveClaim,
}: ParagraphBodyProps) {
  if (kind === "code") {
    return (
      <pre className="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm">
        {segments.map((segment) => segment.text).join("")}
      </pre>
    );
  }

  const nodes = segments.map((segment, segmentIndex) => {
    const claimIndex = segment.claimIndex;
    if (claimIndex === null) {
      return <span key={segmentIndex}>{segment.text}</span>;
    }
    const claim = claims[claimIndex];
    const isActive = claimIndex === displayedIndex;
    return (
      <mark
        key={segmentIndex}
        data-claim-index={claimIndex}
        title={statusLabels[claim.status]}
        onMouseEnter={() => onHoverClaim(claimIndex)}
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
  });

  if (kind === "heading") {
    return (
      <h2 className="font-serif text-xl font-bold tracking-tight">{nodes}</h2>
    );
  }
  if (kind === "subheading") {
    return (
      <h3 className="font-serif text-lg font-semibold tracking-tight">
        {nodes}
      </h3>
    );
  }
  if (kind === "quote") {
    return (
      <blockquote className="border-border text-muted-foreground border-l-2 pl-4 font-serif text-lg leading-[1.7] italic">
        {nodes}
      </blockquote>
    );
  }
  return (
    <p className="font-serif text-lg leading-[1.7] text-pretty">{nodes}</p>
  );
}
