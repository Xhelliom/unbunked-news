import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md text-sm font-bold">
            U
          </span>
          <span className="text-lg font-bold tracking-tight">
            {tCommon("brand")}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="outline" size="sm" className="hidden sm:flex">
            <Link href="/submit">
              <Plus className="size-3.5" />
              {t("submit")}
            </Link>
          </Button>
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
