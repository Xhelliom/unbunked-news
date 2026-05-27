"use server";

import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";

import { db } from "@/db/client";
import { articles, proposals } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { createAnalysisJob } from "@/lib/jobs";
import { requireSession } from "@/lib/session";
import { VERDICTS, type Verdict } from "@/lib/verdicts";

export type ActionState = { error?: string };

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
  const score = Number(formData.get("reliabilityScore"));

  await db
    .update(articles)
    .set({
      title: String(formData.get("title") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      verdict,
      reliabilityScore: Number.isFinite(score)
        ? Math.min(100, Math.max(0, Math.round(score)))
        : null,
    })
    .where(eq(articles.id, id));

  redirect({ href: `/admin/articles/${id}`, locale: await getLocale() });
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
