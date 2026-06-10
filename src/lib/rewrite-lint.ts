import { safeHttpUrl } from "@/lib/safe-url";

// Editor-side warnings for a rewrite body, mirroring what RewriteBody silently
// drops at render time so the editor can surface it before save: claim anchors
// outside the claim range or malformed, and links the renderer won't linkify.
export type RewriteWarning =
  | { kind: "claimOutOfRange"; number: number }
  | { kind: "claimMalformed"; raw: string }
  | { kind: "badLink"; target: string };

const CLAIM_ANCHOR = /\[\[claim:([^\]]*)\]\]/g;
const MARKDOWN_LINK = /\[[^\]]+\]\(([^)]+)\)/g;

export function lintRewriteBody(
  body: string,
  claimCount: number,
): RewriteWarning[] {
  const warnings: RewriteWarning[] = [];

  for (const match of body.matchAll(CLAIM_ANCHOR)) {
    const inner = match[1].trim();
    if (!/^\d+$/.test(inner)) {
      warnings.push({ kind: "claimMalformed", raw: match[0] });
      continue;
    }
    const number = Number(inner);
    if (number < 1 || number > claimCount) {
      warnings.push({ kind: "claimOutOfRange", number });
    }
  }

  for (const match of body.matchAll(MARKDOWN_LINK)) {
    if (!safeHttpUrl(match[1])) {
      warnings.push({ kind: "badLink", target: match[1] });
    }
  }

  return warnings;
}
