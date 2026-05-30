import { Fragment, type ReactNode } from "react";

type Props = {
  body: string;
  claimCount: number;
};

// Tiny markdown subset renderer for rewritten articles.
// Supports: ##/### headings, paragraphs, **bold**, [text](url) links, and
// our own [[claim:N]] markers — turned into superscript anchors to #claim-N.
export function RewriteBody({ body, claimCount }: Props) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);

  return (
    <div className="space-y-4">
      {blocks.map((raw, idx) => {
        const block = raw.trim();
        if (!block) return null;

        if (block.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="mt-6 font-serif text-lg font-semibold tracking-tight"
            >
              {renderInline(block.slice(4), claimCount)}
            </h3>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h2
              key={idx}
              className="mt-8 font-serif text-xl font-bold tracking-tight"
            >
              {renderInline(block.slice(3), claimCount)}
            </h2>
          );
        }

        return (
          <p key={idx} className="font-serif text-lg leading-[1.7] text-pretty">
            {renderInline(block, claimCount)}
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
        parts.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary underline"
          >
            {linkMatch[1]}
          </a>,
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
