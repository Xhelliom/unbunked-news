import { getAppRole, shouldRunWorker } from "@/lib/runtime-role";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // `next build` evaluates instrumentation; never start the loop during build.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (!shouldRunWorker(getAppRole())) return;

  // Dynamic import keeps the server-only/db graph out of any non-nodejs
  // instrumentation pass.
  const { startWorker } = await import("@/lib/pipeline/worker");
  startWorker();
}
