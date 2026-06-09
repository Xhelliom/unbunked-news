"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ContributionsDisplay } from "@/components/article-reader/contributions-display";
import { ContributionForm } from "@/components/article-reader/contribution-form";
import type { PublicContribution } from "@/lib/contributions/queries";

type Props = {
  articleId: string;
  articleContributions: PublicContribution[];
  contributionsEnabled: boolean;
  isAuthenticated: boolean;
};

// Bottom-of-article section: article-level approved contributions plus an
// article-level submission form (or a sign-in CTA). Per-claim contributions are
// submitted and shown inside the verification panel / mobile drawer, not here.
export function ArticleContributions({
  articleId,
  articleContributions,
  contributionsEnabled,
  isAuthenticated,
}: Props) {
  const t = useTranslations("contributions");

  // Nothing to show: contributions are off for this article and none exist.
  if (!contributionsEnabled && articleContributions.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 max-w-[760px]">
      <h2 className="font-serif text-2xl font-bold tracking-tight">
        {t("sectionTitle")}
      </h2>
      <p className="text-muted-foreground mt-1.5 text-sm">
        {t("sectionSubtitle")}
      </p>

      <ContributionsDisplay contributions={articleContributions} />

      {contributionsEnabled &&
        (isAuthenticated ? (
          <div className="mt-6">
            <ContributionForm articleId={articleId} />
          </div>
        ) : (
          <p className="text-muted-foreground mt-6 text-sm">
            {t("loginToContribute")}{" "}
            <Link href="/login" className="text-primary font-medium underline">
              {t("loginLink")}
            </Link>{" "}
            ·{" "}
            <Link href="/signup" className="text-primary font-medium underline">
              {t("signupLink")}
            </Link>
          </p>
        ))}
    </section>
  );
}
