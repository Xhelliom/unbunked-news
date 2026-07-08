export const VERDICTS = [
  "reliable",
  "nuanced",
  "fragile",
  "debunked",
  "unverifiable",
] as const;

export type Verdict = (typeof VERDICTS)[number];

// Narrows an untrusted value (form field, stored snapshot string) to a Verdict,
// or null when it is absent or not a known verdict.
export function toVerdict(value: unknown): Verdict | null {
  return typeof value === "string" &&
    (VERDICTS as readonly string[]).includes(value)
    ? (value as Verdict)
    : null;
}

// Solid accent color (status dot, bars), per verdict.
export const verdictDotClasses: Record<Verdict, string> = {
  reliable: "bg-verdict-reliable",
  nuanced: "bg-verdict-nuanced",
  fragile: "bg-verdict-fragile",
  debunked: "bg-verdict-debunked",
  unverifiable: "bg-verdict-unverifiable",
};

// Readable text colour per verdict, for the underlined label treatment.
export const verdictTextClasses: Record<Verdict, string> = {
  reliable: "text-verdict-reliable-fg",
  nuanced: "text-verdict-nuanced-fg",
  fragile: "text-verdict-fragile-fg",
  debunked: "text-verdict-debunked-fg",
  unverifiable: "text-verdict-unverifiable-fg",
};
