import { cn } from "@/lib/utils";

// Brand wordmark — "Un" in indigo + "bunked" in ink, underlined by the five
// verdict colours in their canonical order (Fiable → Nuancé → Orienté →
// Débunké → Non vérifiable). Built as live text per the brand handoff so it
// inherits Source Serif 4 and adapts to light/dark through design tokens.
// Size it by passing a font-size class on `className`; the spectrum bar and
// gaps are em-relative and scale with the text.
const SPECTRUM = [
  "bg-verdict-reliable",
  "bg-verdict-nuanced",
  "bg-verdict-fragile",
  "bg-verdict-debunked",
  "bg-verdict-unverifiable",
] as const;

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className="font-serif font-bold tracking-[-0.015em]">
        <span className="text-primary">Un</span>
        <span className="text-foreground">bunked</span>
      </span>
      <span aria-hidden className="-mt-[0.12em] ml-[0.12em] mr-0 flex h-[0.16em] gap-[0.08em]">
        {SPECTRUM.map((color) => (
          <i key={color} className={cn("flex-1 rounded-full", color)} />
        ))}
      </span>
    </span>
  );
}
