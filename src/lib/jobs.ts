import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { jobs } from "@/db/schema";

// Inserts a pending job row and returns its id. Execution is decoupled: jobs
// are run by the queue worker (see src/lib/pipeline/worker.ts), so they survive
// pod restarts and run on whichever process drains the queue. The admin UI
// polls getJob() for progress.
export async function createAnalysisJob(url: string): Promise<string> {
  const [job] = await db
    .insert(jobs)
    .values({ url })
    .returning({ id: jobs.id });

  return job.id;
}

export async function getJob(id: string) {
  return db.query.jobs.findFirst({ where: eq(jobs.id, id) });
}
