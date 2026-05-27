"use server";

import { db } from "@/db/client";
import { proposals } from "@/db/schema";

export type ProposeState = { ok?: boolean; error?: string };

function parseUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

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
