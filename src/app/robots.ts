import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/site";

// Crawlers may index the public reader surface; everything authenticated,
// API-only or transactional stays out of the index.
const DISALLOWED_PATHS = [
  "/admin",
  "/api",
  "/preview",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/profile",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
