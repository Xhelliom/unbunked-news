// Strips site chrome that the article extractor frequently leaves inside the
// body: ad slots, social / newsletter CTAs, image credits, "publié le …"
// stamps, stray counters, "à lire aussi" / "codes promo" footers, etc.
//
// Conservative by design: a paragraph is dropped only if it is empty, a bare
// number (comment/share counters), an image credit starting with "©", or it
// matches one of the known boilerplate patterns below. Real prose is never
// touched.

const BOILERPLATE_PATTERNS: RegExp[] = [
  /^publicit[ée]/i,
  /contenu continue ci[\s-]?dessous/i,
  /^en ce moment\b/i,
  /^nos r[ée]seaux\b/i,
  /^suivez[\s-]?nous\b/i,
  /suivez toute l['’]actualit[ée]/i,
  /ajoutez[\s-]?nous à vos favoris/i,
  /^publi[ée] le\b/i,
  /^mis à jour le\b/i,
  /codes? promo/i,
  /envie de faire encore plus d['’][ée]conomies/i,
  /publications qui peuvent vous int[ée]resser/i,
  /^(à lire aussi|lire aussi|sur le m[êe]me sujet|à voir aussi|à découvrir)\b/i,
  /^partagez?\b/i,
  /cha[îi]ne whatsapp/i,
  /google actualit[ée]s/i,
  /^newsletter\b/i,
  /abonnez[\s-]?vous\b/i,
  /^(j['’]accepte|tout accepter|accepter (les|et continuer))/i,
];

export function isBoilerplateLine(line: string): boolean {
  const text = line.trim();
  if (text === "") return true;
  if (/^\d{1,4}$/.test(text)) return true; // stray counters ("4", "5")
  if (/^©/.test(text)) return true; // image credits
  return BOILERPLATE_PATTERNS.some((pattern) => pattern.test(text));
}

export function stripBoilerplate(paragraphs: string[]): string[] {
  return paragraphs.filter((paragraph) => !isBoilerplateLine(paragraph));
}

// Cleans a stored "\n\n"-joined article body in place.
export function cleanArticleContent(content: string): string {
  return stripBoilerplate(
    content
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0),
  ).join("\n\n");
}

// Markers of a paywall / consent wall captured in place of the article body:
// the extractor returns non-null content (a subscription teaser, cookie banner
// or bare navigation menu) that normalize() happily accepts, so the cheap fetch
// never falls back to the renderer and every claim quote ends up unlocatable
// downstream (the right "Vérification" column renders empty).
const PAYWALL_MARKERS: RegExp[] = [
  /cet article vous est (offert|r[ée]serv[ée])/i,
  /r[ée]serv[ée]e? aux abonn[ée]s/i,
  /connectez[\s-]?vous/i,
  /inscrivez[\s-]?vous/i,
  /d[ée]j[àa] abonn[ée]/i,
  /pour lire la suite/i,
  /pour continuer (la lecture|à lire)/i,
  /il vous reste \d+\s?%/i,
  /acc[ée]dez à (l['’]int[ée]gralit[ée]|tous les articles)/i,
];

// Below this, a "body" is a teaser, not an article.
const MIN_ARTICLE_CONTENT_CHARS = 600;
// Above this share of tokens that merely repeat their immediate predecessor,
// the text is a navigation menu ("Politique Politique PSG PSG"), not prose.
const REPEATED_TOKEN_RATIO_LIMIT = 0.15;
const MIN_TOKENS_FOR_REPETITION_CHECK = 20;

function hasNavMenuRepetition(text: string): boolean {
  const tokens = text.toLowerCase().match(/\p{L}{3,}/gu) ?? [];
  if (tokens.length < MIN_TOKENS_FOR_REPETITION_CHECK) return false;
  let repeats = 0;
  for (let i = 1; i < tokens.length; i += 1) {
    if (tokens[i] === tokens[i - 1]) repeats += 1;
  }
  return repeats / tokens.length > REPEATED_TOKEN_RATIO_LIMIT;
}

export type ScrapeQuality = { ok: true } | { ok: false; reason: string };

// Verdict on whether a scraped body is real article prose or a paywall/nav
// artefact. Used by scrapeArticle() to force the Puppeteer fallback and, if the
// rendered body is still bad, to fail the job with an operator-readable reason.
export function assessScrapeQuality(content: string): ScrapeQuality {
  const text = content.trim();
  if (text.length < MIN_ARTICLE_CONTENT_CHARS) {
    return {
      ok: false,
      reason: `scraped body is too short (${text.length} chars, expected at least ${MIN_ARTICLE_CONTENT_CHARS})`,
    };
  }
  if (PAYWALL_MARKERS.some((pattern) => pattern.test(text))) {
    return {
      ok: false,
      reason: "scraped body looks like a paywall or consent wall, not the article",
    };
  }
  if (hasNavMenuRepetition(text)) {
    return {
      ok: false,
      reason: "scraped body looks like a navigation menu, not article prose",
    };
  }
  return { ok: true };
}
