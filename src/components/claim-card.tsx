import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { type ClaimStatus, claimStatusToVerdict } from "@/lib/claim-status";
import { ClaimStatusBadge } from "@/components/claim-status-badge";

export type ClaimCardData = {
  status: ClaimStatus;
  claimText: string | null;
  explanation: string | null;
  sources: { id: string; url: string; title: string | null }[];
};

export function ClaimCard({
  claim,
  sourcesLabel,
  verificationLabel,
  className,
}: {
  claim: ClaimCardData;
  sourcesLabel: string;
  verificationLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card flex flex-col gap-2 rounded-xl border border-t-[3px] p-4",
        className,
      )}
      style={{
        borderTopColor: `var(--verdict-${claimStatusToVerdict[claim.status]})`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <ClaimStatusBadge status={claim.status} />
        <span className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.05em] whitespace-nowrap uppercase">
          {verificationLabel}
        </span>
      </div>

      {claim.claimText && (
        <p className="border-border mt-1 border-l-2 pl-2.5 font-serif text-sm leading-[1.45] italic">
          «&nbsp;{claim.claimText}&nbsp;»
        </p>
      )}

      {claim.explanation && (
        <p className="mt-1 text-[13.5px] leading-[1.55] text-pretty">
          {claim.explanation}
        </p>
      )}

      {claim.sources.length > 0 && (
        <div className="bg-secondary mt-1 rounded-[10px] border p-3">
          <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-[0.05em] uppercase">
            {sourcesLabel}
          </p>
          <ul className="flex flex-col gap-1">
            {claim.sources.map((source) => (
              <li key={source.id}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="decoration-foreground/25 hover:text-primary hover:decoration-primary inline-flex items-center gap-1.5 text-[13px] underline underline-offset-2 transition-colors"
                >
                  <ArrowUpRight className="text-muted-foreground size-3 shrink-0" />
                  {source.title ?? source.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
