"use client";

import { useEffect, useRef } from "react";

const TRACK_ENDPOINT = "/api/track";

type PrivacySignals = Navigator & { globalPrivacyControl?: boolean };

// Fires a single cookieless "read" beacon when the reader scrolls past the end
// of the article. Same privacy guarantees as the pageview tracker.
export function ArticleReadTracker() {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof navigator === "undefined" || !navigator.sendBeacon) {
      return;
    }
    const nav = navigator as PrivacySignals;
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const body = JSON.stringify({
        path: window.location.pathname,
        kind: "read",
      });
      navigator.sendBeacon(
        TRACK_ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={sentinel} aria-hidden className="h-px w-full" />;
}
