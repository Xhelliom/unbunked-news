// Reader display density for the annotated article. "light" is the default:
// it drops the per-paragraph colour bar and keeps the scroll thumb neutral, so
// the only colour left is the text highlight and the rail dots. "full" keeps
// every colour cue. Stored as a device cookie (works for anonymous readers),
// toggled from the account page. No DB, no server-only here so client
// components can share the type and the option list.

export const READER_MODES = ["light", "full"] as const;

export type ReaderMode = (typeof READER_MODES)[number];

export const DEFAULT_READER_MODE: ReaderMode = "light";

export const READER_MODE_COOKIE = "reader-mode";

export function parseReaderMode(value: string | undefined | null): ReaderMode {
  return READER_MODES.includes(value as ReaderMode)
    ? (value as ReaderMode)
    : DEFAULT_READER_MODE;
}
