"use client";

import { ChevronDown, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DASHBOARD_PARAM,
  DASHBOARD_SORTS,
  DEFAULT_DASHBOARD_SORT,
  FLAG_REVIEW,
  type DashboardSort,
  type StatusFilter,
  TRASH_VIEW,
} from "@/lib/admin/dashboard-params";
import { usePathname, useRouter } from "@/i18n/navigation";
import { VERDICTS, type Verdict } from "@/lib/verdicts";

const VERDICT_ALL = "all";

type DashboardFiltersProps = {
  sort: DashboardSort;
  verdict: Verdict | null;
  status: StatusFilter | null;
  flagReview: boolean;
  showTrash: boolean;
};

export function DashboardFilters({
  sort,
  verdict,
  status,
  flagReview,
  showTrash,
}: DashboardFiltersProps) {
  const t = useTranslations("admin.dashboard");
  const tv = useTranslations("verdicts");
  const router = useRouter();
  const pathname = usePathname();

  const current = {
    view: showTrash ? TRASH_VIEW : null,
    sort,
    verdict,
    status,
    flag: flagReview ? FLAG_REVIEW : null,
  };

  type Overrides = Partial<typeof current>;

  const navigate = (overrides: Overrides) => {
    const next = { ...current, ...overrides };
    const params = new URLSearchParams();
    if (next.view) {
      params.set(DASHBOARD_PARAM.view, next.view);
    }
    if (next.sort !== DEFAULT_DASHBOARD_SORT) {
      params.set(DASHBOARD_PARAM.sort, next.sort);
    }
    if (next.verdict) {
      params.set(DASHBOARD_PARAM.verdict, next.verdict);
    }
    if (next.status) {
      params.set(DASHBOARD_PARAM.status, next.status);
    }
    if (next.flag) {
      params.set(DASHBOARD_PARAM.flag, next.flag);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const toggleStatus = (value: StatusFilter) =>
    navigate({ status: status === value ? null : value });

  const hasFilters =
    sort !== DEFAULT_DASHBOARD_SORT ||
    verdict !== null ||
    status !== null ||
    flagReview;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {t(`sort.${sort}`)}
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={sort}
            onValueChange={(value) =>
              navigate({ sort: value as DashboardSort })
            }
          >
            {DASHBOARD_SORTS.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {t(`sort.${option}`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {verdict ? tv(`${verdict}.label`) : t("filters.allVerdicts")}
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={verdict ?? VERDICT_ALL}
            onValueChange={(value) =>
              navigate({
                verdict: value === VERDICT_ALL ? null : (value as Verdict),
              })
            }
          >
            <DropdownMenuRadioItem value={VERDICT_ALL}>
              {t("filters.allVerdicts")}
            </DropdownMenuRadioItem>
            {VERDICTS.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {tv(`${option}.label`)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant={status === "published" ? "default" : "outline"}
        size="sm"
        onClick={() => toggleStatus("published")}
      >
        {t("published")}
      </Button>
      <Button
        variant={status === "draft" ? "default" : "outline"}
        size="sm"
        onClick={() => toggleStatus("draft")}
      >
        {t("draft")}
      </Button>
      <Button
        variant={flagReview ? "default" : "outline"}
        size="sm"
        onClick={() => navigate({ flag: flagReview ? null : FLAG_REVIEW })}
      >
        {t("filters.toReview")}
      </Button>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate({
              sort: DEFAULT_DASHBOARD_SORT,
              verdict: null,
              status: null,
              flag: null,
            })
          }
        >
          <RotateCcw className="size-4" aria-hidden />
          {t("filters.reset")}
        </Button>
      )}
    </div>
  );
}
