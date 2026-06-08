import { Fragment, type ReactNode } from "react";

import { parseBlock } from "@/lib/article-blocks";
import { safeHttpUrl } from "@/lib/safe-url";

type Props = {
  body: string;
  claimCount: number;
};

// Tiny markdown subset renderer for rewritten articles. Shares its block
// vocabulary (headings, subheadings, blockquotes, code) with the original-text
// extractor via parseBlock, so structure preserved at extraction survives the
// rewrite instead of flattening into paragraphs. Inline: **bold**, [text](url)
// links, and our own [[claim:N]] markers — turned into anchors to #claim-N.
export function RewriteBody({ body, claimCount }: Props) {
  const rawBlocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <div className="space-y-4">
      {rawBlocks.map((raw, idx) => {
        if (!raw.trim()) return null;
        const block = parseBlock(raw);

        if (block.kind === "code") {
          return (
            <pre
              key={idx}
              className="bg-muted overflow-x-auto rounded-md p-4 font-mono text-sm"
            >
              {block.text}
            </pre>
          );
        }
        if (block.kind === "heading") {
          return (
            <h2
              key={idx}
              className="mt-8 font-serif text-xl font-bold tracking-tight"
            >
              {renderInline(block.text, claimCount)}
            </h2>
          );
        }
        if (block.kind === "subheading") {
          return (
            <h3
              key={idx}
              className="mt-6 font-serif text-lg font-semibold tracking-tight"
            >
              {renderInline(block.text, claimCount)}
            </h3>
          );
        }
        if (block.kind === "quote") {
          return (
            <blockquote
              key={idx}
              className="border-border text-muted-foreground border-l-2 pl-4 font-serif text-lg leading-[1.7] italic"
            >
              {renderInline(block.text, claimCount)}
            </blockquote>
          );
        }

        return (
          <p key={idx} className="font-serif text-lg leading-[1.7] text-pretty">
            {renderInline(block.text, claimCount)}
          </p>
        );
      })}
    </div>
  );
}

const TOKEN = /(\[\[claim:(\d+)\]\]|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

function renderInline(input: string, claimCount: number): ReactNode {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of input.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push(input.slice(lastIndex, start));
    }

    const token = match[0];
    if (token.startsWith("[[claim:")) {
      const n = Number(match[2]);
      if (Number.isFinite(n) && n >= 1 && n <= claimCount) {
        parts.push(<ClaimAnchor key={key++} number={n} />);
      }
    } else if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        // The rewrite body is LLM-generated markdown; only turn real http(s)
        // targets into links so `[x](javascript:…)` renders as plain text.
        const href = safeHttpUrl(linkMatch[2]);
        parts.push(
          href ? (
            <a
              key={key++}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary underline"
            >
              {linkMatch[1]}
            </a>
          ) : (
            <Fragment key={key++}>{linkMatch[1]}</Fragment>
          ),
        );
      }
    }

    lastIndex = start + token.length;
  }

  if (lastIndex < input.length) {
    parts.push(input.slice(lastIndex));
  }

  return <Fragment>{parts}</Fragment>;
}

function ClaimAnchor({ number }: { number: number }) {
  return (
    <a
      href={`#claim-${number}`}
      className="bg-primary/10 text-primary hover:bg-primary/20 ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 align-super text-xs font-semibold no-underline transition-colors"
      aria-label={`Voir le claim ${number}`}
    >
      {number}
    </a>
  );
}
