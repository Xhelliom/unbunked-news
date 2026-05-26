export const VERDICTS = [
  "reliable",
  "nuanced",
  "biased",
  "debunked",
  "unverifiable",
] as const;

export type Verdict = (typeof VERDICTS)[number];

// Soft badge styles (tinted background + readable text), per verdict.
export const verdictBadgeClasses: Record<Verdict, string> = {
  reliable:
    "bg-verdict-reliable-bg text-verdict-reliable-fg ring-verdict-reliable/30",
  nuanced:
    "bg-verdict-nuanced-bg text-verdict-nuanced-fg ring-verdict-nuanced/30",
  biased: "bg-verdict-biased-bg text-verdict-biased-fg ring-verdict-biased/30",
  debunked:
    "bg-verdict-debunked-bg text-verdict-debunked-fg ring-verdict-debunked/30",
  unverifiable:
    "bg-verdict-unverifiable-bg text-verdict-unverifiable-fg ring-verdict-unverifiable/40",
};

// Solid accent color (status dot, bars), per verdict.
export const verdictDotClasses: Record<Verdict, string> = {
  reliable: "bg-verdict-reliable",
  nuanced: "bg-verdict-nuanced",
  biased: "bg-verdict-biased",
  debunked: "bg-verdict-debunked",
  unverifiable: "bg-verdict-unverifiable",
};
