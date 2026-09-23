import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  type ClaimStatus,
  claimStatusDotClasses,
  claimStatusTextClasses,
} from "@/lib/claim-status";

type ClaimStatusBadgeProps = {
  status: ClaimStatus;
  className?: string;
};

// Status label as coloured text underlined by a bar in the same status colour —
// matching the verdict treatment (an echo of the brand wordmark's underline).
export function ClaimStatusBadge({ status, className }: ClaimStatusBadgeProps) {
  const t = useTranslations("claimStatus");

  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span
        className={cn(
          "text-xs font-semibold tracking-wide uppercase",
          claimStatusTextClasses[status],
        )}
      >
        {t(status)}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-[0.3em] h-[0.16em] rounded-full",
          claimStatusDotClasses[status],
        )}
      />
    </span>
  );
}
