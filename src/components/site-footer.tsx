import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { RUBRICS } from "@/lib/rubrics";

export function SiteFooter() {
  const tRubrics = useTranslations("rubrics");
  const tFooter = useTranslations("footer");
  const tCommon = useTranslations("common");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
          <Link href="/" aria-label="Unbunked" className="inline-flex w-fit">
            <Logo className="text-[22px]" />
          </Link>
          <p className="text-muted-foreground max-w-xs text-sm">
            {tFooter("tagline")}
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">{tFooter("sectionsTitle")}</h2>
          <ul className="space-y-2">
            {RUBRICS.map((rubric) => (
              <li key={rubric}>
                <Link
                  href={`/?rubric=${rubric}`}
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  {tRubrics(`${rubric}.label`)}
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
                href="/methode"
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
            <li>
              <Link
                href="/confidentialite"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {tFooter("privacy")}
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
