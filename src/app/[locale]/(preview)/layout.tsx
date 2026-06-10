import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { requireAdminSession } from "@/lib/session";

// Chrome-free shell for the admin article preview: no sidebar, no public nav, so
// a draft renders exactly as it will publish. Still admin-gated — the preview
// exposes unpublished content.
export default async function PreviewLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireAdminSession();
  } catch {
    redirect({
      href: { pathname: "/login", query: { next: "/admin" } },
      locale: await getLocale(),
    });
  }

  return <>{children}</>;
}
