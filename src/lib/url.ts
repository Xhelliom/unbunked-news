// Parse and normalise a user-supplied URL, accepting only http/https. Returns
// the normalised string or null when the input isn't a valid web URL. Shared by
// every boundary that persists or fetches a user-provided link.
export function parseUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
