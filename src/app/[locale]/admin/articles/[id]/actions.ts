"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getLocale } from "next-intl/server";

import { db } from "@/db/client";
import { articleRewrites, articles } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import { restoreArticleSnapshot } from "@/lib/article-snapshot-restore";
import { REVALIDATE_PROFILE } from "@/lib/cache";
import { createAnalysisJob } from "@/lib/jobs";
import {
  CRITERION_COLUMN,
  SCORE_CRITERIA,
  clampScore,
  type CriterionScores,
} from "@/lib/score-criteria";
import { requireAdminSession } from "@/lib/session";
import { toVerdict } from "@/lib/verdicts";
import type { ActionState } from "@/app/[locale]/admin/actions";

// A blank field (cleared global score, or an optional criterion whose disabled
// slider is omitted from the form data) means "unscored" -> null.
function parseScore(raw: FormDataEntryValue | null): number | null {
  return raw === null || raw === "" ? null : clampScore(raw);
}

export async function saveArticle(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const verdict = toVerdict(formData.get("verdict"));
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
      contributionsEnabled: formData.get("contributionsEnabled") === "true",
      verdict,
      reliabilityScore: parseScore(formData.get("reliabilityScore")),
      ...criterionScores,
    })
    .where(eq(articles.id, id));

  revalidateTag(ARTICLES_CACHE_TAG, REVALIDATE_PROFILE);
  redirect({ href: `/admin/articles/${id}`, locale: await getLocale() });
  return {};
}

// Lets an editor manually clean up the raw scraped body (a stray ad, menu
// label, or leftover word the extractor didn't strip) without re-scraping.
export async function updateScrapedContent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const content = String(formData.get("content") ?? "").trim();

  await db
    .update(articles)
    .set({ content: content || null })
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

// Soft delete: hide the article from every public read and the dashboard's
// default list, and unpublish it so it can't resurface, while keeping the row
// so it can be restored or relaunched.
export async function setDeleted(formData: FormData): Promise<void> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  await db
    .update(articles)
    .set({ deletedAt: new Date(), published: false, publishedAt: null })
    .where(eq(articles.id, id));
  revalidateTag(ARTICLES_CACHE_TAG, REVALIDATE_PROFILE);
  redirect({ href: `/admin/articles/${id}`, locale: await getLocale() });
}

// Brings a soft-deleted article back as a draft (it does not auto-republish).
export async function restoreArticle(formData: FormData): Promise<void> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  await db
    .update(articles)
    .set({ deletedAt: null })
    .where(eq(articles.id, id));
  revalidateTag(ARTICLES_CACHE_TAG, REVALIDATE_PROFILE);
  redirect({ href: `/admin/articles/${id}`, locale: await getLocale() });
}

// Re-runs the pipeline on the original URL and overwrites this article in place:
// the prior version is snapshotted (article_snapshots) then replaced, keeping the
// article's id, slug and publication state. Used to refresh a review when the
// source or its corroborating evidence has evolved.
export async function relaunchArticle(formData: FormData): Promise<void> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const article = await db.query.articles.findFirst({
    where: eq(articles.id, id),
    columns: { urlOrigine: true },
  });
  if (!article) {
    redirect({ href: "/admin", locale: await getLocale() });
    return;
  }
  const jobId = await createAnalysisJob(article.urlOrigine, {
    targetArticleId: id,
  });
  redirect({ href: `/admin/jobs/${jobId}`, locale: await getLocale() });
}

// Rolls an article back to a captured version. The current state is archived
// first (so the restore can itself be undone), then the article is overwritten
// in place — id, slug and publication state are preserved.
export async function restoreSnapshot(formData: FormData): Promise<void> {
  await requireAdminSession();
  const snapshotId = String(formData.get("snapshotId") ?? "");
  const articleId = await restoreArticleSnapshot(snapshotId);
  revalidateTag(ARTICLES_CACHE_TAG, REVALIDATE_PROFILE);
  redirect({
    href: articleId ? `/admin/articles/${articleId}` : "/admin",
    locale: await getLocale(),
  });
}
