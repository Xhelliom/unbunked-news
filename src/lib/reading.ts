// Builds the annotated reading model: splits the article body into paragraphs
// and locates each claim's verbatim quote as a character range inside its
// paragraph, so the quote can be highlighted inline (a paragraph may carry
// several claims of different statuses). Claims whose quote can't be located
// fall back to `orphans`.
//
// Matching runs on a normalised *character stream* (letters and digits only,
// accent-folded, lowercased) with a map back to original indices. Ignoring all
// spacing and punctuation makes it survive scraping artefacts such as a stray
// space inside a word ("l e secteur" ≡ "le secteur") or a space before a full
// stop ("2026 ." ≡ "2026.").

type Stream = { text: string; map: number[] };

const ALNUM = /[\p{L}\p{N}]/u;

function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Builds the alnum-only stream of `text`; map[k] is the original index of the
// k-th stream character.
function buildStream(text: string): Stream {
  let stream = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    for (const ch of fold(text[i])) {
      if (ALNUM.test(ch)) {
        stream += ch;
        map.push(i);
      }
    }
  }
  return { text: stream, map };
}

function normalizeQuote(quote: string): string {
  let out = "";
  for (const ch of fold(quote)) {
    if (ALNUM.test(ch)) out += ch;
  }
  return out;
}

function locate(
  stream: Stream,
  quote: string | null,
): { start: number; end: number } | null {
  if (!quote) return null;
  const needle = normalizeQuote(quote);
  if (needle.length < 8) return null;

  let index = stream.text.indexOf(needle);
  let length = needle.length;

  // Fall back to a prefix for quotes truncated or that run past the paragraph.
  if (index === -1) {
    const prefix = needle.slice(0, Math.min(needle.length, 48));
    if (prefix.length < 12) return null;
    index = stream.text.indexOf(prefix);
    if (index === -1) return null;
    length = prefix.length;
  }

  return {
    start: stream.map[index],
    end: stream.map[index + length - 1] + 1,
  };
}

export type ReadingSegment = { text: string; claimIndex: number | null };
export type ReadingParagraph = { segments: ReadingSegment[] };
export type ReadingModel<T> = {
  paragraphs: ReadingParagraph[];
  claims: T[];
  orphans: T[];
};

type Placement = { paragraph: number; start: number; end: number };

export function buildReadingModel<T extends { sourceQuote: string | null }>(
  content: string | null,
  claims: T[],
): ReadingModel<T> {
  const paragraphs = (content ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  if (paragraphs.length === 0) {
    return { paragraphs: [], claims: [], orphans: [...claims] };
  }

  const streams = paragraphs.map(buildStream);

  // Place each claim in the first paragraph whose text contains its quote.
  const placed: { claim: T; placement: Placement }[] = [];
  const orphans: T[] = [];
  for (const claim of claims) {
    let placement: Placement | null = null;
    for (let p = 0; p < paragraphs.length; p += 1) {
      const range = locate(streams[p], claim.sourceQuote);
      if (range) {
        placement = { paragraph: p, start: range.start, end: range.end };
        break;
      }
    }
    if (placement) placed.push({ claim, placement });
    else orphans.push(claim);
  }

  // Reading order: by paragraph, then by position within the paragraph.
  placed.sort(
    (a, b) =>
      a.placement.paragraph - b.placement.paragraph ||
      a.placement.start - b.placement.start,
  );

  const orderedClaims = placed.map((entry) => entry.claim);

  const paragraphsOut: ReadingParagraph[] = paragraphs.map((text, p) => {
    const ranges = placed
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.placement.paragraph === p)
      .map(({ entry, index }) => ({
        start: entry.placement.start,
        end: entry.placement.end,
        claimIndex: index,
      }))
      .sort((a, b) => a.start - b.start);

    const segments: ReadingSegment[] = [];
    let cursor = 0;
    for (const range of ranges) {
      if (range.start < cursor) continue; // overlapping quote — skip
      if (range.start > cursor) {
        segments.push({
          text: text.slice(cursor, range.start),
          claimIndex: null,
        });
      }
      segments.push({
        text: text.slice(range.start, range.end),
        claimIndex: range.claimIndex,
      });
      cursor = range.end;
    }
    if (cursor < text.length) {
      segments.push({ text: text.slice(cursor), claimIndex: null });
    }
    if (segments.length === 0) segments.push({ text, claimIndex: null });

    return { segments };
  });

  return { paragraphs: paragraphsOut, claims: orderedClaims, orphans };
}
