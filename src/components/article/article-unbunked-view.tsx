import { getTranslations } from "next-intl/server";

import { ClaimCard, type ClaimCardData } from "@/components/claim-card";
import { RewriteBody } from "@/components/rewrite-body";

type Props = {
  title: string;
  body: string;
  isFallback: boolean;
  claimCards: ClaimCardData[];
};

// The "unbunked" view: the editorial rewrite (markdown with [[claim:N]] anchors)
// followed by the full claim grid the anchors link to.
export async function ArticleUnbunkedView({
  title,
  body,
  isFallback,
  claimCards,
}: Props) {
  const t = await getTranslations("article");

  return (
    <section className="mt-12 max-w-[760px]">
      <header>
        <p className="text-muted-foreground text-sm">
          {t("unbunkedRewrite.intro")}
        </p>
        {isFallback && (
          <p className="text-muted-foreground mt-2 text-xs italic">
            {t("unbunkedRewrite.fallbackNotice")}
          </p>
        )}
      </header>

      <h2 className="mt-6 font-serif text-3xl leading-[1.15] font-bold tracking-tight text-balance">
        {title}
      </h2>

      <div className="mt-6">
        <RewriteBody body={body} claimCount={claimCards.length} />
      </div>

      {claimCards.length > 0 && (
        <div className="mt-14 border-t pt-8">
          <h3 className="font-serif text-xl font-bold tracking-tight">
            {t("unbunkedRewrite.claimsTitle")}
          </h3>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {claimCards.map((claim, index) => (
              <div
                key={index}
                id={`claim-${index + 1}`}
                className="scroll-mt-24"
              >
                <ClaimCard
                  claim={claim}
                  sourcesLabel={t("sourcesConsulted")}
                  verificationLabel={t("verificationTag")}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
