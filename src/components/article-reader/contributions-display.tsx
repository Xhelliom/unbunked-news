"use client";

import { useTranslations } from "next-intl";

import type { PublicContribution } from "@/lib/contributions/queries";

// Read-only list of approved contributions, shown under a claim card (in the
// verification panel and the mobile drawer) and for the article as a whole.
export function ContributionsDisplay({
  contributions,
}: {
  contributions: PublicContribution[];
}) {
  const t = useTranslations("contributions");

  if (contributions.length === 0) {
    return null;
  }

  return (
    <section className="mt-3 space-y-2 border-t pt-3">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {t("title")}
      </p>
      <ul className="space-y-2">
        {contributions.map((contribution) => (
          <li
            key={contribution.id}
            className="bg-muted/50 rounded-md p-2.5 text-sm"
          >
            <p className="whitespace-pre-wrap">{contribution.body}</p>
            {contribution.sourceUrl && (
              <a
                href={contribution.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary mt-1 inline-block text-xs underline"
              >
                {t("sourceLink")}
              </a>
            )}
            <p className="text-muted-foreground mt-1 text-xs">
              {t("byAuthor", { name: contribution.authorName })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
