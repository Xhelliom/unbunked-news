import type { ReactNode } from "react";

import { AnalyticsTracker } from "@/components/analytics-tracker";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <AnalyticsTracker />
    </>
  );
}
