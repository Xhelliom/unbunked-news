// Anchors fact-check claims to the paragraphs of the original article body by
// matching each claim's verbatim source quote against the paragraph text.
// Matching is whitespace- and accent-insensitive to survive minor differences
// between the LLM's quote and the scraped text.

export type AnchorableClaim = { sourceQuote: string | null };

export type AnchoredParagraph<T> = { text: string; claims: T[] };

export type AnchorResult<T> = {
  paragraphs: AnchoredParagraph<T>[];
  orphans: T[];
};

function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function findParagraph(
  normalizedParagraphs: string[],
  quote: string | null,
): number {
  if (!quote) return -1;
  const normalizedQuote = normalize(quote);
  if (normalizedQuote.length < 8) return -1;

  for (let i = 0; i < normalizedParagraphs.length; i += 1) {
    if (normalizedParagraphs[i].includes(normalizedQuote)) return i;
  }

  // Fall back to a prefix match for quotes that were truncated or that span a
  // paragraph boundary.
  const prefix = normalizedQuote.split(" ").slice(0, 12).join(" ");
  if (prefix.length >= 16) {
    for (let i = 0; i < normalizedParagraphs.length; i += 1) {
      if (normalizedParagraphs[i].includes(prefix)) return i;
    }
  }

  return -1;
}

export function anchorClaims<T extends AnchorableClaim>(
  content: string | null,
  claims: T[],
): AnchorResult<T> {
  const paragraphs = (content ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length === 0) {
    return { paragraphs: [], orphans: [...claims] };
  }

  const normalizedParagraphs = paragraphs.map(normalize);
  const buckets: T[][] = paragraphs.map(() => []);
  const orphans: T[] = [];

  for (const claim of claims) {
    const index = findParagraph(normalizedParagraphs, claim.sourceQuote);
    if (index === -1) {
      orphans.push(claim);
    } else {
      buckets[index].push(claim);
    }
  }

  return {
    paragraphs: paragraphs.map((text, i) => ({ text, claims: buckets[i] })),
    orphans,
  };
}
