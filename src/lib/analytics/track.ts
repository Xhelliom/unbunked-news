import "server-only";

import { createHash } from "node:crypto";

import { db } from "@/db/client";
import { analyticsEvents } from "@/db/schema";
import { resolveArticleIdBySlug } from "@/lib/articles";
import { routing } from "@/i18n/routing";

import {
  MAX_TRACK_PATH_LENGTH,
  type DeviceType,
  type EventKind,
} from "./constants";

// Daily-rotating salt: combining the date with a server secret makes the
// visitor hash impossible to reverse or correlate across days without the
// secret, so it is not a persistent identifier. Resolved lazily (not at import)
// so `next build` — which evaluates this module without runtime env — doesn't
// fail; a missing secret throws only when an event is actually recorded, which
// is correct: hashing with an empty salt would make the IP/UA brute-forceable.
function saltBase(): string {
  const salt = process.env.ANALYTICS_SALT ?? process.env.BETTER_AUTH_SECRET;
  if (!salt) {
    throw new Error(
      "ANALYTICS_SALT or BETTER_AUTH_SECRET must be set: refusing to hash visitor data with an empty salt",
    );
  }
  return salt;
}

const ARTICLE_PATH = /^\/(?:[a-z]{2}\/)?article\/([^/]+)\/?$/;

export type TrackEvent = {
  path: string;
  referrer: string | null;
  kind: EventKind;
  ip: string;
  userAgent: string;
};

// Strip query string and hash; keep a leading-slash pathname under the cap.
// Returns null when the input can't be a real internal path.
export function normalizePath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.length > MAX_TRACK_PATH_LENGTH) {
    return null;
  }
  const path = trimmed.split(/[?#]/, 1)[0];
  return path.length > 0 ? path : null;
}

function localeFromPath(path: string): string {
  const segment = path.split("/")[1];
  return (routing.locales as readonly string[]).includes(segment)
    ? segment
    : routing.defaultLocale;
}

function articleSlugFromPath(path: string): string | null {
  const match = ARTICLE_PATH.exec(path);
  return match ? decodeURIComponent(match[1]) : null;
}

// Keep only the host of an external referrer; drop the full URL for privacy.
export function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.hostname || null;
  } catch {
    return null;
  }
}

const TABLET_RE = /ipad|tablet|playbook|silk|android(?!.*mobile)/i;
const MOBILE_RE = /mobi|iphone|ipod|android|blackberry|iemobile|opera mini/i;

// Coarse 3-way classification only; the raw user-agent is never persisted.
function deviceTypeFromUserAgent(userAgent: string): DeviceType {
  if (TABLET_RE.test(userAgent)) return "tablet";
  if (MOBILE_RE.test(userAgent)) return "mobile";
  return "desktop";
}

function dailyVisitorHash(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${day}:${saltBase()}:${ip}:${userAgent}`)
    .digest("hex");
}

export async function recordEvent(event: TrackEvent): Promise<void> {
  const path = normalizePath(event.path);
  if (!path) {
    throw new Error("Invalid analytics path");
  }

  const slug = articleSlugFromPath(path);
  const articleId = slug ? await resolveArticleIdBySlug(slug) : null;

  // A "read" event is only meaningful when it maps to an article.
  if (event.kind === "read" && !articleId) {
    return;
  }

  await db.insert(analyticsEvents).values({
    path,
    articleId,
    locale: localeFromPath(path),
    referrerHost: referrerHost(event.referrer),
    deviceType: deviceTypeFromUserAgent(event.userAgent),
    kind: event.kind,
    visitorHash: dailyVisitorHash(event.ip, event.userAgent),
  });
}
