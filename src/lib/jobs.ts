import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import type { ReasoningModel } from "@/lib/pipeline/models";

export type CreateAnalysisJobOptions = {
  // Overrides the reasoning tier for this job; omitted (e.g. for proposals)
  // means the default tier.
  reasoningModel?: ReasoningModel;
  // When set, the run re-analyses this article in place (snapshot + overwrite)
  // instead of creating a new one.
  targetArticleId?: string;
};

// Inserts a pending job row and returns its id. Execution is decoupled: jobs
// are run by the queue worker (see src/lib/pipeline/worker.ts), so they survive
// pod restarts and run on whichever process drains the queue. The admin UI
// polls getJob() for progress.
export async function createAnalysisJob(
  url: string,
  options: CreateAnalysisJobOptions = {},
): Promise<string> {
  const [job] = await db
    .insert(jobs)
    .values({
      url,
      model: options.reasoningModel ?? null,
      targetArticleId: options.targetArticleId ?? null,
    })
    .returning({ id: jobs.id });

  return job.id;
}

export async function getJob(id: string) {
  return db.query.jobs.findFirst({ where: eq(jobs.id, id) });
}
