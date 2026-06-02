import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link, redirect } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/session";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/admin/sign-out-button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  let userId = "";
  try {
    const session = await requireAdminSession();
    userId = session.userId;
  } catch {
    redirect({ href: "/login", locale: await getLocale() });
  }

  const t = await getTranslations("admin");
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { name: true, email: true },
  });
  const accountName = currentUser?.name ?? "Admin";
  const accountEmail = currentUser?.email ?? "";

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full">
        <AdminSidebar
          title={t("title")}
          labels={{
            dashboard: t("nav.dashboard"),
            submit: t("nav.submit"),
            proposals: t("nav.proposals"),
            analytics: t("nav.analytics"),
            costs: t("nav.costs"),
            members: t("nav.members"),
            account: t("nav.account"),
          }}
          account={{ name: accountName, email: accountEmail }}
        />
        <SidebarInset>
          <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
            <div className="flex h-14 items-center gap-2 px-4">
              <SidebarTrigger />
              <Link href="/admin" className="font-bold tracking-tight">
                {t("title")}
              </Link>
              <div className="ml-auto flex items-center gap-1">
                <ThemeToggle />
                <LocaleSwitcher />
                <SignOutButton />
              </div>
            </div>
          </header>
          <main className="w-full flex-1 px-4 py-8">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
