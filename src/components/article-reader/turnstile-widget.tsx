"use client";

import Script from "next/script";

// Cloudflare Turnstile widget, rendered only when a site key is configured.
// Turnstile auto-renders the `.cf-turnstile` element and injects a hidden
// `cf-turnstile-response` input into the enclosing form, which the server
// action verifies. The site key is public (hence the NEXT_PUBLIC_ env).
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function TurnstileWidget() {
  if (!SITE_KEY) {
    return null;
  }
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
      />
      <div className="cf-turnstile" data-sitekey={SITE_KEY} />
    </>
  );
}
