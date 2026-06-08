"use server";

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db/client";
import { contributions } from "@/db/contributions-schema";
import { articles, claims } from "@/db/schema";
import {
  CONTRIBUTION_BODY_MAX_CHARS,
  type AiModerationVerdict,
  type ContributionStatus,
} from "@/lib/contributions/constants";
import { isRateLimited } from "@/lib/contributions/rate-limit";
import { isAiModerationEnabled, moderateContribution } from "@/lib/moderation/moderate";
import { isUnauthorizedError, requireUserId } from "@/lib/session";
import { isTurnstileEnabled, verifyTurnstile } from "@/lib/turnstile";
import { parseUrl } from "@/lib/url";

export type SubmitContributionState =
  | { status: "idle" }
  | { status: "error"; code: string }
  | { status: "success" };

function clientIp(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded ? (forwarded.split(",")[0]?.trim() ?? null) : null;
}

export async function submitContribution(
  _prev: SubmitContributionState,
  formData: FormData,
): Promise<SubmitContributionState> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return { status: "error", code: "unauthenticated" };
    }
    throw error;
  }

  const articleId = String(formData.get("articleId") ?? "");
  const claimIdRaw = String(formData.get("claimId") ?? "").trim();
  const claimId = claimIdRaw.length > 0 ? claimIdRaw : null;
  const body = String(formData.get("body") ?? "").trim();
  const sourceUrlRaw = String(formData.get("sourceUrl") ?? "").trim();

  // The article must exist, be published, and have contributions enabled.
  const article = await db.query.articles.findFirst({
    where: and(eq(articles.id, articleId), isNull(articles.deletedAt)),
    columns: { id: true, published: true, contributionsEnabled: true },
  });
  if (!article || !article.published || !article.contributionsEnabled) {
    return { status: "error", code: "contributionsDisabled" };
  }

  // A targeted claim must belong to this article.
  if (claimId) {
    const claim = await db.query.claims.findFirst({
      where: and(eq(claims.id, claimId), eq(claims.articleId, articleId)),
      columns: { id: true },
    });
    if (!claim) {
      return { status: "error", code: "invalidClaim" };
    }
  }

  if (!body) {
    return { status: "error", code: "empty" };
  }
  if (body.length > CONTRIBUTION_BODY_MAX_CHARS) {
    return { status: "error", code: "tooLong" };
  }

  let sourceUrl: string | null = null;
  if (sourceUrlRaw) {
    sourceUrl = parseUrl(sourceUrlRaw);
    if (!sourceUrl) {
      return { status: "error", code: "invalidUrl" };
    }
  }

  const headerList = await headers();
  if (isTurnstileEnabled()) {
    const token = String(formData.get("cf-turnstile-response") ?? "");
    const passed = await verifyTurnstile(token || null, clientIp(headerList));
    if (!passed) {
      return { status: "error", code: "turnstile" };
    }
  }

  if (await isRateLimited(userId)) {
    return { status: "error", code: "rateLimited" };
  }

  // Optional, gated AI pre-moderation: pre-classify so the admin queue is
  // lighter. It never auto-publishes; an obvious-spam verdict auto-rejects.
  let status: ContributionStatus = "pending";
  let aiVerdict: AiModerationVerdict | null = null;
  let aiReason: string | null = null;
  let aiModel: string | null = null;
  if (await isAiModerationEnabled()) {
    try {
      const result = await moderateContribution({ body, sourceUrl });
      aiVerdict = result.verdict;
      aiReason = result.reason;
      aiModel = result.model;
      if (result.verdict === "spam") {
        status = "rejected";
      }
    } catch (error) {
      // Degrade gracefully: a moderation outage must never block the user. The
      // contribution stays pending for a human to review.
      console.error("AI moderation failed, leaving contribution pending:", error);
    }
  }

  await db.insert(contributions).values({
    articleId,
    claimId,
    userId,
    body,
    sourceUrl,
    status,
    aiVerdict,
    aiReason,
    aiModel,
  });

  // No revalidate: contributions are never published until an admin approves.
  return { status: "success" };
}
