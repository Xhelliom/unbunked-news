import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";

// Authoritative session lookup for server components, route handlers and
// server actions. Per Next.js guidance, auth must be verified here rather than
// relied upon in proxy alone.
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
