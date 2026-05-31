import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/session";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/admin/sign-out-button";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect({ href: "/login", locale: await getLocale() });
  }

  const t = await getTranslations("admin");

  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link href="/admin" className="font-bold tracking-tight">
            {t("title")}
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/admin"
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1.5"
            >
              {t("nav.dashboard")}
            </Link>
            <Link
              href="/admin/submit"
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1.5"
            >
              {t("nav.submit")}
            </Link>
            <Link
              href="/admin/proposals"
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1.5"
            >
              {t("nav.proposals")}
            </Link>
            <Link
              href="/admin/analytics"
              className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1.5"
            >
              {t("nav.analytics")}
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <LocaleSwitcher />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
