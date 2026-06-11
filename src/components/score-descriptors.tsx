import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { ContentType, Framing } from "@/lib/score-criteria";

// Unscored descriptors shown as separate chips, deliberately kept OUT of the
// reliability bar: framing (orientation) and content type never affect the
// score (docs/SCORING.md §4). Renders nothing when both are absent.
export function ScoreDescriptors({
  framing,
  contentType,
}: {
  framing: Framing | null;
  contentType: ContentType | null;
}) {
  const t = useTranslations("descriptors");
  if (!framing && !contentType) return null;

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold">{t("caption")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {contentType && (
          <Badge variant="outline" className="gap-1">
            <span className="text-muted-foreground">
              {t("contentTypeTitle")}:
            </span>
            {t(`contentType.${contentType}`)}
          </Badge>
        )}
        {framing && (
          <Badge variant="outline" className="gap-1">
            <span className="text-muted-foreground">{t("framingTitle")}:</span>
            {t(`framing.${framing}`)}
          </Badge>
        )}
      </div>
    </div>
  );
}
