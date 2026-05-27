import { cn } from "@/lib/utils";
import type { Verdict } from "@/lib/verdicts";

type ArticleImageProps = {
  src: string | null;
  verdict: Verdict | null;
  label: string;
  className?: string;
};

export function ArticleImage({
  src,
  verdict,
  label,
  className,
}: ArticleImageProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
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
      <span className="px-6 text-center text-sm font-semibold tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}
