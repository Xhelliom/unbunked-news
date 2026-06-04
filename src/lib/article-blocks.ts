// Structural block vocabulary shared by three sides that must agree on the same
// markdown subset: the original-article extractor (which serialises the source
// HTML into it), the AI rewrite (which is told to mirror it), and the two
// renderers (which parse it back). Keeping the syntax in one place stops the
// extractor from emitting a marker the renderer doesn't understand.

export const BLOCK_KINDS = [
  "heading",
  "subheading",
  "quote",
  "code",
  "para",
] as const;

export type BlockKind = (typeof BLOCK_KINDS)[number];

export type ArticleBlock = { kind: BlockKind; text: string };

const HEADING_PREFIX = "## ";
const SUBHEADING_PREFIX = "### ";
const QUOTE_PREFIX = "> ";
const CODE_FENCE = "```";

export function serializeBlock(block: ArticleBlock): string {
  switch (block.kind) {
    case "heading":
      return HEADING_PREFIX + block.text;
    case "subheading":
      return SUBHEADING_PREFIX + block.text;
    case "quote":
      return QUOTE_PREFIX + block.text;
    case "code":
      return `${CODE_FENCE}\n${block.text}\n${CODE_FENCE}`;
    case "para":
      return block.text;
  }
}

// Parses one block (already split on blank lines) back into its kind and the
// marker-free text. A code fence keeps its internal newlines; every other kind
// is single-line. Anything without a recognised marker is plain prose, so this
// is safe on legacy bodies stored before structure was preserved.
export function parseBlock(raw: string): ArticleBlock {
  const trimmed = raw.trim();
  if (trimmed.startsWith(CODE_FENCE)) {
    const text = trimmed
      .replace(/^```[^\n]*\n?/, "")
      .replace(/\n?```\s*$/, "");
    return { kind: "code", text };
  }
  if (trimmed.startsWith(SUBHEADING_PREFIX)) {
    return { kind: "subheading", text: trimmed.slice(SUBHEADING_PREFIX.length) };
  }
  if (trimmed.startsWith(HEADING_PREFIX)) {
    return { kind: "heading", text: trimmed.slice(HEADING_PREFIX.length) };
  }
  if (trimmed.startsWith(QUOTE_PREFIX)) {
    return { kind: "quote", text: trimmed.slice(QUOTE_PREFIX.length) };
  }
  return { kind: "para", text: trimmed };
}
