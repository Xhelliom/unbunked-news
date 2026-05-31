import "server-only";

import { and, asc, eq, lt, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { jobs } from "@/db/schema";

// A running job is considered stalled (pod killed mid-run) once its updatedAt
// heartbeat is older than this. runPipeline refreshes updatedAt at every step
// via $onUpdate, so an actively-running job never crosses this cutoff.
const JOB_STALL_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_JOB_ATTEMPTS = 3;

// Atomically claim the oldest pending job. FOR UPDATE SKIP LOCKED lets many
// worker pods race for jobs without blocking or double-claiming.
export async function claimNextJob(): Promise<{ id: string } | null> {
  return db.transaction(async (tx) => {
    const [next] = await tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.status, "pending"))
      .orderBy(asc(jobs.createdAt))
      .limit(1)
      .for("update", { skipLocked: true });

    if (!next) return null;

    await tx
      .update(jobs)
      .set({
        status: "running",
        startedAt: new Date(),
        attempts: sql`${jobs.attempts} + 1`,
      })
      .where(eq(jobs.id, next.id));

    return { id: next.id };
  });
}

// Recover jobs stuck in "running" past the stall cutoff. Guarded UPDATEs make
// this idempotent across concurrent reapers on multiple pods. Returns the
// number of rows affected (best effort).
export async function reapStalledJobs(): Promise<number> {
  const cutoff = new Date(Date.now() - JOB_STALL_TIMEOUT_MS);

  const requeued = await db
    .update(jobs)
    .set({ status: "pending", startedAt: null, step: null, progress: 0 })
    .where(
      and(
        eq(jobs.status, "running"),
        lt(jobs.updatedAt, cutoff),
        lt(jobs.attempts, MAX_JOB_ATTEMPTS),
      ),
    );

  const failed = await db
    .update(jobs)
    .set({
      status: "failed",
      error: "Job stalled and exceeded retry limit",
      finishedAt: new Date(),
    })
    .where(
      and(
        eq(jobs.status, "running"),
        lt(jobs.updatedAt, cutoff),
        sql`${jobs.attempts} >= ${MAX_JOB_ATTEMPTS}`,
      ),
    );

  return rowCount(requeued) + rowCount(failed);
}

function rowCount(result: unknown): number {
  if (
    typeof result === "object" &&
    result !== null &&
    "count" in result &&
    typeof (result as { count: unknown }).count === "number"
  ) {
    return (result as { count: number }).count;
  }
  return 0;
}
