"use server";

import { db } from "@/db/client";
import { proposals } from "@/db/schema";
import { parseUrl } from "@/lib/url";

export type ProposeState = { ok?: boolean; error?: string };

export async function proposeArticle(
  _prev: ProposeState,
  formData: FormData,
): Promise<ProposeState> {
  const url = parseUrl(String(formData.get("url") ?? ""));
  if (!url) {
    return { error: "invalidUrl" };
  }
  const email = String(formData.get("email") ?? "").trim() || null;
  await db.insert(proposals).values({ url, email });
  return { ok: true };
}
