"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const TRACK_ENDPOINT = "/api/track";

type PrivacySignals = Navigator & { globalPrivacyControl?: boolean };

function hasOptedOut(): boolean {
  const nav = navigator as PrivacySignals;
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

// Sends one cookieless pageview beacon per navigation. No state, no storage:
// the server derives an anonymous daily visitor hash from the request itself.
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
    if (hasOptedOut()) return;

    let referrer: string | null = null;
    if (document.referrer) {
      try {
        const url = new URL(document.referrer);
        // Only external referrers are interesting; same-host is in-app nav.
        referrer = url.host === window.location.host ? null : url.hostname;
      } catch {
        referrer = null;
      }
    }

    const body = JSON.stringify({
      path: window.location.pathname,
      referrer,
    });
    navigator.sendBeacon(
      TRACK_ENDPOINT,
      new Blob([body], { type: "application/json" }),
    );
  }, [pathname]);

  return null;
}
