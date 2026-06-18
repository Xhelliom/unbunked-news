"use server";

import { cookies } from "next/headers";

import {
  parseReaderMode,
  READER_MODE_COOKIE,
  type ReaderMode,
} from "@/lib/reader-mode";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Persists the reader display density as a device cookie. The wire is untyped,
// so the value is coerced back to a known mode before it is stored.
export async function setReaderMode(mode: string): Promise<ReaderMode> {
  const parsed = parseReaderMode(mode);
  const store = await cookies();
  store.set(READER_MODE_COOKIE, parsed, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  return parsed;
}
