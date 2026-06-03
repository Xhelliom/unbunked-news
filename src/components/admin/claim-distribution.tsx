import type { ClaimCounts } from "@/lib/admin/dashboard-params";
import { CLAIM_STATUSES, claimStatusDotClasses } from "@/lib/claim-status";
import { cn } from "@/lib/utils";

type ClaimDistributionProps = {
  claims: ClaimCounts;
  label: string;
  className?: string;
};

// Compact verdict-coloured breakdown of an article's claims, mirroring the
// public ArticleCard bar. `label` is the localised "n claims" tooltip text.
export function ClaimDistribution({
  claims,
  label,
  className,
}: ClaimDistributionProps) {
  const { total } = claims;
  if (total === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const segments = CLAIM_STATUSES.map((status) => ({
    status,
    count: claims[status],
  })).filter((segment) => segment.count > 0);

  return (
    <div className={cn("flex items-center gap-2", className)} title={label}>
      <div className="bg-muted flex h-[5px] w-16 overflow-hidden rounded-full">
        {segments.map(({ status, count }) => (
          <span
            key={status}
            className={claimStatusDotClasses[status]}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>
      <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
        {total}
      </span>
    </div>
  );
}
