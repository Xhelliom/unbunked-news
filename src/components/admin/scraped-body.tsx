import { useTranslations } from "next-intl";

// Read-only dump of the raw scraped article body, collapsed by default, so an
// operator can spot a bad scrape (paywall teaser, navigation menu) without
// opening the database. Native <details> keeps this a server component.
export function ScrapedBody({ content }: { content: string | null }) {
  const t = useTranslations("admin.review");
  const paragraphs = (content ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  return (
    <details className="rounded-lg border">
      <summary className="cursor-pointer p-4 text-sm font-semibold">
        {t("scrapedBody")}
        <span className="text-muted-foreground ml-2 font-normal">
          {t("scrapedBodyChars", { count: content?.length ?? 0 })}
        </span>
      </summary>
      <div className="border-t p-4">
        {paragraphs.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("scrapedBodyEmpty")}
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
