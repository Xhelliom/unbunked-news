import "server-only";

import { runPipeline } from "./run";
import { claimNextJob, reapStalledJobs } from "./queue";

// How long to wait before polling again when the queue is empty.
const WORKER_POLL_INTERVAL_MS = 3000;
// Backoff after an unexpected error in the loop body, so a transient DB blip
// doesn't spin the process at 100% CPU.
const WORKER_ERROR_BACKOFF_MS = 5000;
// How often to sweep for stalled jobs.
const REAPER_INTERVAL_MS = 60 * 1000;

let started = false;
let stopping = false;

export function startWorker(): void {
  if (started) return;
  started = true;

  // On shutdown we stop claiming new work; an in-flight job finishes on its
  // own, or the reaper on another pod recovers it after the stall timeout.
  process.once("SIGTERM", () => {
    stopping = true;
  });
  process.once("SIGINT", () => {
    stopping = true;
  });

  void reap();
  setInterval(() => {
    void reap();
  }, REAPER_INTERVAL_MS);

  void loop();
}

async function reap(): Promise<void> {
  try {
    await reapStalledJobs();
  } catch (error) {
    console.error("[worker] reaper failed", error);
  }
}

// One job at a time per process bounds Chromium/LLM memory: jobs are never run
// in parallel within a single pod. Add replicas (SKIP LOCKED is safe) instead.
async function loop(): Promise<void> {
  if (stopping) return;

  try {
    const job = await claimNextJob();
    if (!job) {
      setTimeout(() => void loop(), WORKER_POLL_INTERVAL_MS);
      return;
    }

    try {
      // runPipeline already records failures on the job row; the wrap only
      // stops a thrown error from killing the loop.
      await runPipeline(job.id);
    } catch (error) {
      console.error(`[worker] job ${job.id} threw`, error);
    }

    void loop();
  } catch (error) {
    console.error("[worker] loop error", error);
    setTimeout(() => void loop(), WORKER_ERROR_BACKOFF_MS);
  }
}
