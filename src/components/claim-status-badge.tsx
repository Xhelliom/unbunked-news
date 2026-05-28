import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import {
  type ClaimStatus,
  claimStatusBadgeClasses,
  claimStatusDotClasses,
} from "@/lib/claim-status";

type ClaimStatusBadgeProps = {
  status: ClaimStatus;
  className?: string;
};

export function ClaimStatusBadge({ status, className }: ClaimStatusBadgeProps) {
  const t = useTranslations("claimStatus");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ring-1 ring-inset",
        claimStatusBadgeClasses[status],
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", claimStatusDotClasses[status])}
        aria-hidden
      />
      {t(status)}
    </span>
  );
}
