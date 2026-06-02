"use server";

import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getLocale } from "next-intl/server";

import { db } from "@/db/client";
import { articleRewrites, articles, proposals, user } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import { createAnalysisJob } from "@/lib/jobs";
import { requireAdminSession } from "@/lib/session";
import {
  CRITERION_COLUMN,
  SCORE_CRITERIA,
  clampScore,
  type CriterionScores,
} from "@/lib/score-criteria";
import { VERDICTS, type Verdict } from "@/lib/verdicts";

export type ActionState = { error?: string };

const MEMBERS_ROUTE = "/admin/members";
const MEMBER_ERROR_PARAM = "error";

const MEMBER_ERROR = {
  MISSING_ID: "missingMemberId",
  SELF_DEMOTE: "cannotDemoteSelf",
  LAST_ADMIN: "cannotDemoteLastAdmin",
} as const;

type MemberErrorCode = (typeof MEMBER_ERROR)[keyof typeof MEMBER_ERROR];

function memberErrorHref(code: MemberErrorCode): string {
  return `${MEMBERS_ROUTE}?${MEMBER_ERROR_PARAM}=${code}`;
}

// Next 16's revalidateTag takes a cache profile as its second argument; "max"
// fully invalidates every entry carrying the tag.
const REVALIDATE_PROFILE = "max";

// A blank field (cleared global score, or an optional criterion whose disabled
// slider is omitted from the form data) means "unscored" -> null.
function parseScore(raw: FormDataEntryValue | null): number | null {
  return raw === null || raw === "" ? null : clampScore(raw);
}

function parseUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function submitUrl(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminSession();
  const url = parseUrl(String(formData.get("url") ?? ""));
  if (!url) {
    return { error: "invalidUrl" };
  }
  const jobId = await createAnalysisJob(url);
  redirect({ href: `/admin/jobs/${jobId}`, locale: await getLocale() });
  return {};
}

export async function saveArticle(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const verdictValue = String(formData.get("verdict") ?? "");
  const verdict = (VERDICTS as readonly string[]).includes(verdictValue)
    ? (verdictValue as Verdict)
    : null;
  const criterionScores = Object.fromEntries(
    SCORE_CRITERIA.map((criterion) => {
      const column = CRITERION_COLUMN[criterion];
      return [column, parseScore(formData.get(column))];
    }),
  ) as CriterionScores;

  await db
    .update(articles)
    .set({
      title: String(formData.get("title") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      originalSummary: String(formData.get("originalSummary") ?? "") || null,
      showOriginal: formData.get("showOriginal") === "true",
      verdict,
      reliabilityScore: parseScore(formData.get("reliabilityScore")),
      ...criterionScores,
    })
    .where(eq(articles.id, id));

  revalidateTag(ARTICLES_CACHE_TAG, REVALIDATE_PROFILE);
  redirect({ href: `/admin/articles/${id}`, locale: await getLocale() });
  return {};
}

export async function saveRewrite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminSession();
  const articleId = String(formData.get("articleId") ?? "");
  const localeRaw = String(formData.get("locale") ?? "");
  if (!(routing.locales as readonly string[]).includes(localeRaw)) {
    return { error: "invalidLocale" };
  }
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) {
    return { error: "empty" };
  }

  await db
    .insert(articleRewrites)
    .values({ articleId, locale: localeRaw, title, body })
    .onConflictDoUpdate({
      target: [articleRewrites.articleId, articleRewrites.locale],
      set: { title, body },
    });

  revalidateTag(ARTICLES_CACHE_TAG, REVALIDATE_PROFILE);
  redirect({ href: `/admin/articles/${articleId}`, locale: await getLocale() });
  return {};
}

export async function setPublished(formData: FormData): Promise<void> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const published = formData.get("published") === "true";
  await db
    .update(articles)
    .set({ published, publishedAt: published ? new Date() : null })
    .where(eq(articles.id, id));
  revalidateTag(ARTICLES_CACHE_TAG, REVALIDATE_PROFILE);
  redirect({ href: `/admin/articles/${id}`, locale: await getLocale() });
}

export async function acceptProposal(formData: FormData): Promise<void> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, id),
  });
  if (!proposal) return;
  await db
    .update(proposals)
    .set({ status: "accepted" })
    .where(eq(proposals.id, id));
  const jobId = await createAnalysisJob(proposal.url);
  redirect({ href: `/admin/jobs/${jobId}`, locale: await getLocale() });
}

export async function rejectProposal(formData: FormData): Promise<void> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  await db
    .update(proposals)
    .set({ status: "rejected" })
    .where(eq(proposals.id, id));
  redirect({ href: `/admin/proposals`, locale: await getLocale() });
}

export async function setMemberAdminStatus(formData: FormData): Promise<void> {
  const { userId: actingUserId } = await requireAdminSession();
  const targetUserId = String(formData.get("id") ?? "");
  const shouldBeAdmin = formData.get("isAdmin") === "true";

  if (!targetUserId) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.MISSING_ID), locale: await getLocale() });
  }

  if (!shouldBeAdmin && targetUserId === actingUserId) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.SELF_DEMOTE), locale: await getLocale() });
  }

  // Keep at least one admin at all times to avoid locking the team out.
  if (!shouldBeAdmin) {
    const adminCountResult = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(user)
      .where(eq(user.isAdmin, true));
    const adminCount = adminCountResult[0]?.value ?? 0;
    if (adminCount <= 1) {
      redirect({ href: memberErrorHref(MEMBER_ERROR.LAST_ADMIN), locale: await getLocale() });
    }
  }

  await db
    .update(user)
    .set({ isAdmin: shouldBeAdmin })
    .where(eq(user.id, targetUserId));

  redirect({ href: MEMBERS_ROUTE, locale: await getLocale() });
}
