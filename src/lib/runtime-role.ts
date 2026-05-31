// Pure env logic — deliberately free of server-only/db imports so it can be
// pulled into the (possibly non-nodejs) instrumentation pass.

export const APP_ROLES = ["web", "worker", "hybrid"] as const;
export type AppRole = (typeof APP_ROLES)[number];

const DEFAULT_APP_ROLE: AppRole = "hybrid";

function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export function getAppRole(): AppRole {
  const raw = process.env.APP_ROLE?.trim().toLowerCase() ?? "";
  return isAppRole(raw) ? raw : DEFAULT_APP_ROLE;
}

export function shouldRunWorker(role: AppRole): boolean {
  return role === "worker" || role === "hybrid";
}
