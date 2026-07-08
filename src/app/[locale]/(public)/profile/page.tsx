import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getContributionsByUser } from "@/lib/contributions/queries";
import { parseReaderMode, READER_MODE_COOKIE } from "@/lib/reader-mode";
import { getSession, toSessionUser } from "@/lib/session";
import type { ContributionStatus } from "@/lib/contributions/constants";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { DisplayNameForm } from "@/components/profile/display-name-form";
import { ReaderModeForm } from "@/components/profile/reader-mode-form";

const STATUS_VARIANT: Record<
  ContributionStatus,
  "secondary" | "default" | "destructive"
> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const session = await getSession();
  const sessionUser = toSessionUser(session);
  if (!sessionUser) {
    redirect({ href: "/login", locale });
    return null;
  }

  const t = await getTranslations("profile");
  const format = await getFormatter();
  const contributions = await getContributionsByUser(sessionUser.id);
  const readerMode = parseReaderMode(
    (await cookies()).get(READER_MODE_COOKIE)?.value,
  );

  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-16 sm:px-6">
      <h1 className="font-serif text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">{sessionUser.email}</p>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-bold tracking-tight">
          {t("contributionsTitle")}
        </h2>
        {contributions.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">{t("noContributions")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {contributions.map((contribution) => (
              <li
                key={contribution.id}
                className="space-y-2 rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={STATUS_VARIANT[contribution.status]}>
                    {t(`status.${contribution.status}`)}
                  </Badge>
                  <span className="text-muted-foreground">
                    {contribution.claimPosition === null
                      ? t("target.article")
                      : t("target.claim", { n: contribution.claimPosition + 1 })}
                  </span>
                  <span className="text-muted-foreground">
                    {format.dateTime(contribution.createdAt, { dateStyle: "medium" })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{contribution.body}</p>
                <Link
                  href={`/article/${contribution.articleSlug}`}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  {contribution.articleTitle}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold tracking-tight">
          {t("reader.title")}
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm">
          {t("reader.subtitle")}
        </p>
        <div className="mt-4">
          <ReaderModeForm initialMode={readerMode} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold tracking-tight">
          {t("displayName.title")}
        </h2>
        <div className="mt-4">
          <DisplayNameForm initialName={sessionUser.name} />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl font-bold tracking-tight">
          {t("password.title")}
        </h2>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </section>
    </div>
  );
}
