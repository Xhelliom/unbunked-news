import type { PublicArticle } from "@/lib/articles";
import {
  getApprovedContributions,
  type PublicContribution,
} from "@/lib/contributions/queries";
import { buildReadingModel } from "@/lib/reading";
import { routing } from "@/i18n/routing";
import { getSession } from "@/lib/session";
import { getSuggestedArticles } from "@/lib/suggestions";
import { ArticleReadTracker } from "@/components/article-read-tracker";
import { ArticleContributions } from "@/components/article-reader/article-contributions";
import { ArticleViewSwitcher } from "@/components/article-view-switcher";
import { ArticleSuggestions } from "@/components/article-suggestions";
import { ArticleHeader } from "@/components/article/article-header";
import { ArticleAnalysisView } from "@/components/article/article-analysis-view";
import { ArticleUnbunkedView } from "@/components/article/article-unbunked-view";
import { toClaimCardData } from "@/components/article/claim-card-data";

type View = "analysis" | "unbunked";

type Props = {
  article: PublicArticle;
  locale: string;
  requestedView: string | undefined;
  // Admin preview renders the exact reader view of an unpublished draft; it must
  // not emit an analytics read event the way a real public visit does.
  isPreview?: boolean;
};

// The reader-facing article, shared by the public route and the admin preview so
// a draft is seen exactly as it will publish. Owns the rendering-time data
// derivation (reading model, contributions, suggestions, session) and delegates
// the masthead and the two body views to dedicated components.
export async function ArticleView({
  article,
  locale,
  requestedView,
  isPreview = false,
}: Props) {
  const reading = buildReadingModel(
    article.showOriginal ? article.content : null,
    article.claims,
  );
  const { paragraphs, claims: locatedClaims, orphans } = reading;
  const hasBody = paragraphs.length > 0;
  const showSummaryInstead =
    !hasBody && !article.showOriginal && Boolean(article.originalSummary);

  const rewrite =
    article.rewrites.find((r) => r.locale === locale) ??
    article.rewrites.find((r) => r.locale === routing.defaultLocale) ??
    null;
  const rewriteIsFallback = rewrite !== null && rewrite.locale !== locale;
  const view: View =
    requestedView === "unbunked" && rewrite ? "unbunked" : "analysis";

  const suggestions = await getSuggestedArticles(article.id);

  // Approved contributions, split into article-level and per-claim (aligned by
  // index with the located reader claims).
  const approvedContributions = await getApprovedContributions(article.id);
  const contributionsByClaim = new Map<string, PublicContribution[]>();
  const articleContributions: PublicContribution[] = [];
  for (const contribution of approvedContributions) {
    if (contribution.claimId === null) {
      articleContributions.push(contribution);
      continue;
    }
    const list = contributionsByClaim.get(contribution.claimId) ?? [];
    list.push(contribution);
    contributionsByClaim.set(contribution.claimId, list);
  }
  const claimContributions = locatedClaims.map(
    (claim) => contributionsByClaim.get(claim.id) ?? [],
  );
  const claimIds = locatedClaims.map((claim) => claim.id);

  // Only the contribution form needs the session, so skip the per-request auth
  // lookup on the hot path otherwise.
  const isAuthenticated = article.contributionsEnabled
    ? (await getSession()) !== null
    : false;

  return (
    <article className="mx-auto max-w-6xl px-4 pt-8 pb-16 sm:px-6">
      <ArticleHeader article={article} />

      {rewrite && (
        <div className="mt-10 flex justify-center">
          <ArticleViewSwitcher current={view} />
        </div>
      )}

      {view === "analysis" && (
        <ArticleAnalysisView
          paragraphs={paragraphs}
          readerClaims={locatedClaims.map(toClaimCardData)}
          claimContributions={claimContributions}
          claimIds={claimIds}
          orphanCards={orphans.map(toClaimCardData)}
          articleId={article.id}
          isAuthenticated={isAuthenticated}
          showSummaryInstead={showSummaryInstead}
          originalSummary={article.originalSummary}
        />
      )}

      {view === "unbunked" && rewrite && (
        <ArticleUnbunkedView
          title={rewrite.title}
          body={rewrite.body}
          isFallback={rewriteIsFallback}
          claimCards={article.claims.map(toClaimCardData)}
        />
      )}

      <ArticleContributions
        articleId={article.id}
        articleContributions={articleContributions}
        contributionsEnabled={article.contributionsEnabled}
        isAuthenticated={isAuthenticated}
      />

      <ArticleSuggestions articles={suggestions} />

      {!isPreview && <ArticleReadTracker />}
    </article>
  );
}
