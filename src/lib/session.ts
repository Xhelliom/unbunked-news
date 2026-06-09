import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db/client";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof UnauthorizedError;
}

// Authoritative session lookup for server components, route handlers and
// server actions. Per Next.js guidance, auth must be verified here rather than
// relied upon in proxy alone.
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

function toSessionUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") {
    return null;
  }
  const userValue = (session as Record<string, unknown>).user;
  if (!userValue || typeof userValue !== "object") {
    return null;
  }
  const idValue = (userValue as Record<string, unknown>).id;
  return typeof idValue === "string" && idValue.length > 0 ? idValue : null;
}

export type SessionUser = { id: string; name: string; email: string };

// Defensively extract the public user fields from a session. Returns null when
// there is no signed-in user.
export function toSessionUser(session: unknown): SessionUser | null {
  if (!session || typeof session !== "object") {
    return null;
  }
  const userValue = (session as Record<string, unknown>).user;
  if (!userValue || typeof userValue !== "object") {
    return null;
  }
  const { id, name, email } = userValue as Record<string, unknown>;
  if (typeof id !== "string" || id.length === 0) {
    return null;
  }
  return {
    id,
    name: typeof name === "string" ? name : "",
    email: typeof email === "string" ? email : "",
  };
}

// Require any signed-in user and return their id. Used by non-admin boundaries
// (e.g. submitting a contribution) where the admin flag is irrelevant.
export async function requireUserId(): Promise<string> {
  const session = await requireSession();
  const userId = toSessionUserId(session);
  if (!userId) {
    throw new UnauthorizedError();
  }
  return userId;
}

export async function requireAdminSession() {
  const session = await requireSession();
  const userId = toSessionUserId(session);
  if (!userId) {
    throw new UnauthorizedError();
  }

  // We re-check the admin flag in the DB on every admin boundary.
  const sessionUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { isAdmin: true },
  });
  if (!sessionUser?.isAdmin) {
    throw new UnauthorizedError();
  }

  return { session, userId };
}
