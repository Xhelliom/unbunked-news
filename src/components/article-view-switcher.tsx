"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

type View = "analysis" | "unbunked";

export function ArticleViewSwitcher({ current }: { current: View }) {
  const t = useTranslations("article.views");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(view: View) {
    if (view === current) return;
    const params = new URLSearchParams(searchParams);
    if (view === "analysis") params.delete("view");
    else params.set("view", view);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div
      role="tablist"
      aria-label={t("aria")}
      className="bg-muted inline-flex rounded-full p-1 text-sm"
    >
      <button
        type="button"
        role="tab"
        aria-selected={current === "analysis"}
        onClick={() => go("analysis")}
        className={cn(
          "rounded-full px-4 py-1.5 font-medium transition-colors",
          current === "analysis"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {t("analysis")}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={current === "unbunked"}
        onClick={() => go("unbunked")}
        className={cn(
          "rounded-full px-4 py-1.5 font-medium transition-colors",
          current === "unbunked"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {t("unbunked")}
      </button>
    </div>
  );
}
