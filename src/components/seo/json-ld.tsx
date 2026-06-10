import type { JsonLd } from "@/lib/seo/structured-data";

// Renders one or more JSON-LD nodes as a script tag. The payload comes from our
// own schema builders (never user input), so serializing it is safe; we still
// escape "<" to keep a stray sequence from closing the script element early.
export function JsonLd({ data }: { data: JsonLd | JsonLd[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
