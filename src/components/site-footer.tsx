import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

const SECTIONS = ["tech", "politics", "environment", "health"] as const;

export function SiteFooter() {
  const t = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const tCommon = useTranslations("common");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md text-sm font-bold">
              U
            </span>
            <span className="text-lg font-bold tracking-tight">
              {tCommon("brand")}
            </span>
          </Link>
          <p className="text-muted-foreground max-w-xs text-sm">
            {tFooter("tagline")}
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{tFooter("sectionsTitle")}</h2>
          <ul className="space-y-2">
            {SECTIONS.map((section) => (
              <li key={section}>
                <Link
                  href={`/?tag=${section}`}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {t(section)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{tFooter("aboutTitle")}</h2>
          <ul className="space-y-2">
            <li>
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {tFooter("about")}
              </Link>
            </li>
            <li>
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {tFooter("method")}
              </Link>
            </li>
            <li>
              <Link
                href="/submit"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {tFooter("submit")}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="text-muted-foreground mx-auto max-w-6xl px-4 py-6 text-xs sm:px-6">
          &copy; {year} {tCommon("brand")}. {tFooter("rights")}
        </div>
      </div>
    </footer>
  );
}
