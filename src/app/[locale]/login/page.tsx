import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { LoginForm } from "@/components/admin/login-form";
import { getPublishedArticlesCountLastSevenDays } from "@/lib/articles";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const weeklyVerifiedCount = await getPublishedArticlesCountLastSevenDays();

  return <LoginForm weeklyVerifiedCount={weeklyVerifiedCount} />;
}
