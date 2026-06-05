import { cn } from "@/lib/utils";
import { safeHttpUrl } from "@/lib/safe-url";
import type { Verdict } from "@/lib/verdicts";

type ArticleImageProps = {
  src: string | null;
  verdict: Verdict | null;
  label: string;
  className?: string;
  // Overrides the typography of the source label shown on the abstract
  // fallback (hero, secondary and feed cards each size it differently).
  labelClassName?: string;
};

export function ArticleImage({
  src,
  verdict,
  label,
  className,
  labelClassName,
}: ArticleImageProps) {
  // The image URL comes from the scraped page; only render real http(s) URLs so
  // a `data:`/`javascript:` payload can never reach the DOM (falls back to the
  // abstract placeholder otherwise).
  const safeSrc = safeHttpUrl(src);
  if (safeSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={safeSrc}
        alt={label}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  // Abstract fallback keyed to the verdict colour.
  const background = verdict ? `var(--verdict-${verdict}-bg)` : "var(--muted)";
  const color = verdict
    ? `var(--verdict-${verdict}-fg)`
    : "var(--muted-foreground)";

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center",
        className,
      )}
      style={{ backgroundColor: background, color }}
    >
      <span
        className={cn(
          "px-6 text-center text-sm font-semibold tracking-wide uppercase",
          labelClassName,
        )}
      >
        {label}
      </span>
    </div>
  );
}
