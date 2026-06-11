import type { ClaimStatus } from "@/lib/pipeline/schemas";
import { absoluteUrl, SITE_NAME, SITE_SAME_AS, SITE_URL } from "@/lib/seo/site";

export type JsonLd = Record<string, unknown>;

// Stable @id fragments so the WebSite/Article nodes can reference the single
// Organization node instead of repeating it.
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

// Google's ClaimReview rating runs 1 (false) … 5 (true). Map our claim statuses
// onto it so the verdict badge can surface as a fact-check rich result.
const CLAIM_STATUS_RATING: Record<ClaimStatus, number> = {
  supported: 5,
  partly_true: 4,
  unverifiable: 3,
  misleading: 2,
  false: 1,
};

const RATING_BEST = 5;
const RATING_WORST = 1;

export function organizationSchema(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: "Unbunked News",
    url: SITE_URL,
    logo: `${SITE_URL}/logo-icon.svg`,
    ...(SITE_SAME_AS.length > 0 ? { sameAs: [...SITE_SAME_AS] } : {}),
  };
}

export function websiteSchema(locale: string): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: locale,
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/recherche", locale)}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function newsArticleSchema(input: {
  title: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: Date | null;
  modifiedAt: Date;
  locale: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    mainEntityOfPage: input.url,
    inLanguage: input.locale,
    ...(input.imageUrl ? { image: [input.imageUrl] } : {}),
    ...(input.publishedAt
      ? { datePublished: input.publishedAt.toISOString() }
      : {}),
    dateModified: input.modifiedAt.toISOString(),
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function claimReviewSchema(input: {
  claimText: string;
  status: ClaimStatus;
  ratingLabel: string;
  articleUrl: string;
  originalUrl: string;
  locale: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ClaimReview",
    url: input.articleUrl,
    claimReviewed: input.claimText,
    inLanguage: input.locale,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    reviewRating: {
      "@type": "Rating",
      ratingValue: CLAIM_STATUS_RATING[input.status],
      bestRating: RATING_BEST,
      worstRating: RATING_WORST,
      alternateName: input.ratingLabel,
    },
    itemReviewed: {
      "@type": "Claim",
      appearance: { "@type": "CreativeWork", url: input.originalUrl },
    },
  };
}
