import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { getArticleBySlug } from "@/lib/articles";
import { CLAIM_STATUSES, type ClaimStatus } from "@/lib/pipeline/schemas";
import { absoluteUrl } from "@/lib/seo/site";
import {
  claimReviewSchema,
  newsArticleSchema,
  type JsonLd,
} from "@/lib/seo/structured-data";
import { ArticleView } from "@/components/article/article-view";
import { JsonLd as JsonLdScript } from "@/components/seo/json-ld";

function isClaimStatus(value: string): value is ClaimStatus {
  return (CLAIM_STATUSES as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const article = await getArticleBySlug(slug);
  if (!article) {
    return {};
  }

  // Articles are single-locale: canonicalize to their native-locale URL so the
  // prefixed and unprefixed paths don't compete as duplicates.
  const canonical = absoluteUrl(`/article/${article.slug}`, article.locale);
  const description = article.summary ?? undefined;

  return {
    title: article.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: article.title,
      description,
      ...(article.publishedAt
        ? { publishedTime: article.publishedAt.toISOString() }
        : {}),
      modifiedTime: article.updatedAt.toISOString(),
      ...(article.imageUrl ? { images: [article.imageUrl] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      ...(article.imageUrl ? { images: [article.imageUrl] } : {}),
    },
  };
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const article = await getArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  const { view } = await searchParams;

  const articleLocale = hasLocale(routing.locales, article.locale)
    ? article.locale
    : routing.defaultLocale;
  const canonical = absoluteUrl(`/article/${article.slug}`, articleLocale);
  const statusLabels = await getTranslations({
    locale: articleLocale,
    namespace: "claimStatus",
  });

  const structuredData: JsonLd[] = [
    newsArticleSchema({
      title: article.title,
      description: article.summary,
      url: canonical,
      imageUrl: article.imageUrl,
      publishedAt: article.publishedAt,
      modifiedAt: article.updatedAt,
      locale: articleLocale,
    }),
    ...article.claims.flatMap((claim) => {
      if (!isClaimStatus(claim.status)) return [];
      return [
        claimReviewSchema({
          claimText: claim.claimText,
          status: claim.status,
          ratingLabel: statusLabels(claim.status),
          articleUrl: canonical,
          originalUrl: article.urlOrigine,
          locale: articleLocale,
        }),
      ];
    }),
  ];

  return (
    <>
      <JsonLdScript data={structuredData} />
      <ArticleView article={article} locale={locale} requestedView={view} />
    </>
  );
}
