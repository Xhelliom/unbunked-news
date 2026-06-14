"use server";

import { randomUUID } from "node:crypto";

import { and, eq, ne, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { revalidateTag } from "next/cache";
import { getLocale } from "next-intl/server";

import { db } from "@/db/client";
import {
  account,
  articleRewrites,
  articles,
  jobs,
  proposals,
  user,
} from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import { restoreArticleSnapshot } from "@/lib/article-snapshot-restore";
import { REVALIDATE_PROFILE } from "@/lib/cache";
import { createAnalysisJob, getJob } from "@/lib/jobs";
import { clampMaxClaims, clampMaxSearchRounds } from "@/lib/pipeline/limits";
import { DEFAULT_REASONING_MODEL, isReasoningModel } from "@/lib/pipeline/models";
import { safeHttpUrl } from "@/lib/safe-url";
import { requireAdminSession } from "@/lib/session";
import {
  CRITERION_COLUMN,
  SCORE_CRITERIA,
  clampScore,
  type CriterionScores,
} from "@/lib/score-criteria";
import { toVerdict } from "@/lib/verdicts";

export type ActionState = { error?: string };

const MEMBERS_ROUTE = "/admin/members";
const MEMBER_ERROR_PARAM = "error";
const ACCOUNT_ROUTE = "/admin/account";
const ACCOUNT_ERROR_PARAM = "error";
const ACCOUNT_SUCCESS_PARAM = "updated";

const MEMBER_ERROR = {
  MISSING_ID: "missingMemberId",
  MISSING_NAME: "missingMemberName",
  MISSING_EMAIL: "missingMemberEmail",
  MISSING_PASSWORD: "missingMemberPassword",
  WEAK_PASSWORD: "weakPassword",
  EMAIL_EXISTS: "memberEmailAlreadyExists",
  MEMBER_NOT_FOUND: "memberNotFound",
  SELF_DEMOTE: "cannotDemoteSelf",
  SELF_DELETE: "cannotDeleteSelf",
  LAST_ADMIN: "cannotDemoteLastAdmin",
} as const;

type MemberErrorCode = (typeof MEMBER_ERROR)[keyof typeof MEMBER_ERROR];

function memberErrorHref(code: MemberErrorCode): string {
  return `${MEMBERS_ROUTE}?${MEMBER_ERROR_PARAM}=${code}`;
}

const ACCOUNT_ERROR = {
  MISSING_NAME: "missingName",
  MISSING_EMAIL: "missingEmail",
  WEAK_PASSWORD: "weakPassword",
  EMAIL_EXISTS: "emailAlreadyExists",
  USER_NOT_FOUND: "userNotFound",
} as const;

type AccountErrorCode = (typeof ACCOUNT_ERROR)[keyof typeof ACCOUNT_ERROR];

function accountErrorHref(code: AccountErrorCode): string {
  return `${ACCOUNT_ROUTE}?${ACCOUNT_ERROR_PARAM}=${code}`;
}

const CREDENTIAL_PROVIDER_ID = "credential";
const MIN_PASSWORD_LENGTH = 8;

// A blank field (cleared global score, or an optional criterion whose disabled
// slider is omitted from the form data) means "unscored" -> null.
function parseScore(raw: FormDataEntryValue | null): number | null {
  return raw === null || raw === "" ? null : clampScore(raw);
}

// A blank/absent numeric field becomes NaN so the clamp helpers fall back to
// their default rather than coercing "" to 0.
function numericField(raw: FormDataEntryValue | null): number {
  return raw === null || raw === "" ? Number.NaN : Number(raw);
}

export async function submitUrl(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminSession();
  const url = safeHttpUrl(String(formData.get("url") ?? ""));
  if (!url) {
    return { error: "invalidUrl" };
  }
  // The select posts a model id, but the wire is untyped: fall back to the
  // default tier on anything unrecognised rather than trusting the value.
  const modelRaw = formData.get("model");
  const reasoningModel = isReasoningModel(modelRaw)
    ? modelRaw
    : DEFAULT_REASONING_MODEL;
  const jobId = await createAnalysisJob(url, { reasoningModel });
  redirect({ href: `/admin/jobs/${jobId}`, locale: await getLocale() });
  return {};
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

// Resumes a run paused by the long-article preflight gate. The chosen limits are
// clamped and stored on the job, pauseAck is set so the gate is crossed once,
// and the job is re-queued (status -> pending) for the worker to pick up. The
// resumed run re-scrapes from the URL, then proceeds straight through.
export async function resumeJob(formData: FormData): Promise<void> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const job = await getJob(id);
  if (!job || job.status !== "paused") {
    redirect({
      href: id ? `/admin/jobs/${id}` : "/admin/jobs",
      locale: await getLocale(),
    });
    return;
  }
  const maxClaims = clampMaxClaims(numericField(formData.get("maxClaims")));
  const maxSearchRounds = clampMaxSearchRounds(
    numericField(formData.get("maxSearchRounds")),
  );
  await db
    .update(jobs)
    .set({
      status: "pending",
      pauseAck: true,
      maxClaims,
      maxSearchRounds,
      pauseInfo: null,
      step: null,
      progress: 0,
      error: null,
      startedAt: null,
      // A resume is a deliberate fresh start; reset the claim counter so the
      // re-run gets the full stall-retry budget a first-time job has.
      attempts: 0,
    })
    .where(eq(jobs.id, id));
  redirect({ href: `/admin/jobs/${id}`, locale: await getLocale() });
}

// Re-queues a job's URL as a fresh analysis. Used from the runs table to retry
// a failed run or re-analyse a finished one; the original job row is untouched.
export async function relaunchJob(formData: FormData): Promise<void> {
  await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  const job = await getJob(id);
  if (!job) {
    redirect({ href: "/admin/jobs", locale: await getLocale() });
    return;
  }
  const newJobId = await createAnalysisJob(job.url);
  redirect({ href: `/admin/jobs/${newJobId}`, locale: await getLocale() });
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

export async function createMember(formData: FormData): Promise<void> {
  await requireAdminSession();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const isAdmin = formData.get("isAdmin") === "true";

  if (!name) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.MISSING_NAME), locale: await getLocale() });
  }
  if (!email) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.MISSING_EMAIL), locale: await getLocale() });
  }
  if (!password) {
    redirect({
      href: memberErrorHref(MEMBER_ERROR.MISSING_PASSWORD),
      locale: await getLocale(),
    });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.WEAK_PASSWORD), locale: await getLocale() });
  }

  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true },
  });
  if (existingUser) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.EMAIL_EXISTS), locale: await getLocale() });
  }

  const userId = randomUUID();
  const hashedPassword = await hashPassword(password);

  // We create both BetterAuth user row and credential account in one flow.
  await db.insert(user).values({
    id: userId,
    name,
    email,
    isAdmin,
    emailVerified: true,
  });
  await db.insert(account).values({
    id: randomUUID(),
    accountId: email,
    providerId: CREDENTIAL_PROVIDER_ID,
    userId,
    password: hashedPassword,
  });

  redirect({ href: MEMBERS_ROUTE, locale: await getLocale() });
}

export async function updateMember(formData: FormData): Promise<void> {
  const { userId: actingUserId } = await requireAdminSession();
  const targetUserId = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const shouldBeAdmin = formData.get("isAdmin") === "true";

  if (!targetUserId) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.MISSING_ID), locale: await getLocale() });
  }
  if (!name) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.MISSING_NAME), locale: await getLocale() });
  }
  if (!email) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.MISSING_EMAIL), locale: await getLocale() });
  }

  const targetUser = await db.query.user.findFirst({
    where: eq(user.id, targetUserId),
    columns: { id: true, email: true, isAdmin: true },
  });
  if (!targetUser) {
    redirect({
      href: memberErrorHref(MEMBER_ERROR.MEMBER_NOT_FOUND),
      locale: await getLocale(),
    });
    return;
  }

  if (!shouldBeAdmin && targetUserId === actingUserId) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.SELF_DEMOTE), locale: await getLocale() });
  }

  // On évite tout doublon d'email au moment de l'édition.
  const existingUserWithEmail = await db.query.user.findFirst({
    where: and(eq(user.email, email), ne(user.id, targetUserId)),
    columns: { id: true },
  });
  if (existingUserWithEmail) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.EMAIL_EXISTS), locale: await getLocale() });
  }

  // Même règle que pour la suppression/rétrogradation: garder au moins 1 admin.
  if (targetUser.isAdmin && !shouldBeAdmin) {
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
    .set({ name, email, isAdmin: shouldBeAdmin })
    .where(eq(user.id, targetUserId));

  // BetterAuth credential utilise accountId (ici l'email) pour le login.
  // On le synchronise si l'email utilisateur a changé.
  if (targetUser.email !== email) {
    await db
      .update(account)
      .set({ accountId: email })
      .where(and(eq(account.userId, targetUserId), eq(account.providerId, CREDENTIAL_PROVIDER_ID)));
  }

  redirect({ href: MEMBERS_ROUTE, locale: await getLocale() });
}

export async function setMemberPassword(formData: FormData): Promise<void> {
  await requireAdminSession();
  const targetUserId = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!targetUserId) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.MISSING_ID), locale: await getLocale() });
  }
  if (!password) {
    redirect({
      href: memberErrorHref(MEMBER_ERROR.MISSING_PASSWORD),
      locale: await getLocale(),
    });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.WEAK_PASSWORD), locale: await getLocale() });
  }

  const targetUser = await db.query.user.findFirst({
    where: eq(user.id, targetUserId),
    columns: { id: true, email: true },
  });
  if (!targetUser) {
    redirect({
      href: memberErrorHref(MEMBER_ERROR.MEMBER_NOT_FOUND),
      locale: await getLocale(),
    });
    return;
  }

  const hashedPassword = await hashPassword(password);
  const credentialAccount = await db.query.account.findFirst({
    where: eq(account.userId, targetUserId),
    columns: { id: true },
  });

  if (credentialAccount) {
    await db
      .update(account)
      .set({ password: hashedPassword })
      .where(eq(account.id, credentialAccount.id));
  } else {
    // Some users might exist without local credentials (future OAuth usage).
    await db.insert(account).values({
      id: randomUUID(),
      accountId: targetUser.email,
      providerId: CREDENTIAL_PROVIDER_ID,
      userId: targetUserId,
      password: hashedPassword,
    });
  }

  redirect({ href: MEMBERS_ROUTE, locale: await getLocale() });
}

export async function updateOwnProfile(formData: FormData): Promise<void> {
  const { userId } = await requireAdminSession();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) {
    redirect({ href: accountErrorHref(ACCOUNT_ERROR.MISSING_NAME), locale: await getLocale() });
  }
  if (!email) {
    redirect({ href: accountErrorHref(ACCOUNT_ERROR.MISSING_EMAIL), locale: await getLocale() });
  }
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    redirect({ href: accountErrorHref(ACCOUNT_ERROR.WEAK_PASSWORD), locale: await getLocale() });
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, email: true },
  });
  if (!currentUser) {
    redirect({ href: accountErrorHref(ACCOUNT_ERROR.USER_NOT_FOUND), locale: await getLocale() });
    return;
  }

  // On empêche de prendre l'email d'un autre membre.
  if (email !== currentUser.email) {
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, email),
      columns: { id: true },
    });
    if (existingUser) {
      redirect({
        href: accountErrorHref(ACCOUNT_ERROR.EMAIL_EXISTS),
        locale: await getLocale(),
      });
    }
  }

  await db.update(user).set({ name, email }).where(eq(user.id, userId));

  const credentialAccount = await db.query.account.findFirst({
    where: eq(account.userId, userId),
    columns: { id: true },
  });

  if (credentialAccount) {
    // L'accountId doit rester aligné sur l'email de connexion, même si
    // l'utilisateur ne change pas son mot de passe dans ce formulaire.
    if (password) {
      const hashedPassword = await hashPassword(password);
      await db
        .update(account)
        .set({ password: hashedPassword, accountId: email })
        .where(eq(account.id, credentialAccount.id));
    } else {
      await db
        .update(account)
        .set({ accountId: email })
        .where(eq(account.id, credentialAccount.id));
    }
  } else if (password) {
    const hashedPassword = await hashPassword(password);
    await db.insert(account).values({
      id: randomUUID(),
      accountId: email,
      providerId: CREDENTIAL_PROVIDER_ID,
      userId,
      password: hashedPassword,
    });
  }

  redirect({
    href: `${ACCOUNT_ROUTE}?${ACCOUNT_SUCCESS_PARAM}=1`,
    locale: await getLocale(),
  });
}

export async function deleteMember(formData: FormData): Promise<void> {
  const { userId: actingUserId } = await requireAdminSession();
  const targetUserId = String(formData.get("id") ?? "");

  if (!targetUserId) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.MISSING_ID), locale: await getLocale() });
  }
  if (targetUserId === actingUserId) {
    redirect({ href: memberErrorHref(MEMBER_ERROR.SELF_DELETE), locale: await getLocale() });
  }

  const targetUser = await db.query.user.findFirst({
    where: eq(user.id, targetUserId),
    columns: { isAdmin: true },
  });
  if (!targetUser) {
    redirect({
      href: memberErrorHref(MEMBER_ERROR.MEMBER_NOT_FOUND),
      locale: await getLocale(),
    });
    return;
  }

  // If deleting an admin, we enforce at least one admin remains.
  if (targetUser.isAdmin) {
    const adminCountResult = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(user)
      .where(eq(user.isAdmin, true));
    const adminCount = adminCountResult[0]?.value ?? 0;
    if (adminCount <= 1) {
      redirect({ href: memberErrorHref(MEMBER_ERROR.LAST_ADMIN), locale: await getLocale() });
    }
  }

  await db.delete(user).where(eq(user.id, targetUserId));
  redirect({ href: MEMBERS_ROUTE, locale: await getLocale() });
}
