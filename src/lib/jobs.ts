import "server-only";

import { eq } from "drizzle-orm";
import { after } from "next/server";

import { db } from "@/db/client";
import { jobs } from "@/db/schema";
import { runPipeline } from "@/lib/pipeline/run";

// Creates a job row and runs the (30-60s) pipeline in-process after the
// response is sent. The admin UI polls getJob() for progress.
export async function createAnalysisJob(url: string): Promise<string> {
  const [job] = await db
    .insert(jobs)
    .values({ url })
    .returning({ id: jobs.id });

  after(async () => {
    await runPipeline(job.id);
  });

  return job.id;
}

export async function getJob(id: string) {
  return db.query.jobs.findFirst({ where: eq(jobs.id, id) });
}
