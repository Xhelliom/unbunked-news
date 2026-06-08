import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

// Cloudflare Turnstile (anti-spam on contribution submission) loads a script and
// an iframe from this host. Only widen the CSP for it when Turnstile is actually
// configured, so the default policy stays as tight as possible.
const TURNSTILE_HOST = "https://challenges.cloudflare.com";
const turnstileSrc = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  ? ` ${TURNSTILE_HOST}`
  : "";

// Content-Security-Policy. `img-src` must allow arbitrary https hosts (and
// data:) because article hero images are served straight from the source
// publisher. Inline scripts/styles are allowed because Next's app-router
// streaming injects inline bootstrap scripts and the pre-paint theme script runs
// inline; a nonce-based policy would force every page to render dynamically.
// `'unsafe-eval'` is React's dev-only requirement. `frame-ancestors 'none'`
// (mirrored by X-Frame-Options) is the anti-clickjacking control.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${turnstileSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self'",
  `connect-src 'self'${turnstileSrc}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  `frame-src 'self'${turnstileSrc}`,
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
