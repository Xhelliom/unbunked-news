"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getLocale } from "next-intl/server";

import { db } from "@/db/client";
import { articleRewrites, articles, proposals } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import { createAnalysisJob } from "@/lib/jobs";
import { requireSession } from "@/lib/session";
import {
  CRITERION_COLUMN,
  SCORE_CRITERIA,
  clampScore,
  type CriterionScores,
} from "@/lib/score-criteria";
import { VERDICTS, type Verdict } from "@/lib/verdicts";

export type ActionState = { error?: string };

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
  await requireSession();
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
  await requireSession();
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
  await requireSession();
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
  await requireSession();
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
  await requireSession();
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
  await requireSession();
  const id = String(formData.get("id") ?? "");
  await db
    .update(proposals)
    .set({ status: "rejected" })
    .where(eq(proposals.id, id));
  redirect({ href: `/admin/proposals`, locale: await getLocale() });
}
