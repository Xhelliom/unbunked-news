import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import type { ReasoningModel } from "@/lib/pipeline/models";

// Inserts a pending job row and returns its id. Execution is decoupled: jobs
// are run by the queue worker (see src/lib/pipeline/worker.ts), so they survive
// pod restarts and run on whichever process drains the queue. The admin UI
// polls getJob() for progress. `reasoningModel` overrides the reasoning tier
// for this job; omitted (e.g. for proposals) means the default tier.
export async function createAnalysisJob(
  url: string,
  reasoningModel?: ReasoningModel,
): Promise<string> {
  const [job] = await db
    .insert(jobs)
    .values({ url, model: reasoningModel ?? null })
    .returning({ id: jobs.id });

  return job.id;
}

export async function getJob(id: string) {
  return db.query.jobs.findFirst({ where: eq(jobs.id, id) });
}
