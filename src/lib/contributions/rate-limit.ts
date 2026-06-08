import "server-only";

import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/db/client";
import { contributions } from "@/db/contributions-schema";
import {
  CONTRIBUTION_RATE_MAX_PER_WINDOW,
  CONTRIBUTION_RATE_WINDOW_MS,
} from "@/lib/contributions/constants";

// True when the user has already submitted the maximum allowed contributions
// within the sliding window. Backed by the (user_id, created_at) index.
export async function isRateLimited(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - CONTRIBUTION_RATE_WINDOW_MS);
  const [row] = await db
    .select({ value: count() })
    .from(contributions)
    .where(
      and(
        eq(contributions.userId, userId),
        gte(contributions.createdAt, since),
      ),
    );
  return (row?.value ?? 0) >= CONTRIBUTION_RATE_MAX_PER_WINDOW;
}
