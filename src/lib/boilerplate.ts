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

// The reader comment thread always trails the article, opening with a heading
// or CTA ("Commentaires (42)", "Laisser un commentaire", "Réagir", "Show
// comments"). Extractors sometimes capture it along with the body, dragging in
// usernames, timestamps and off-topic replies. We detect that opener and cut
// everything after it.
//
// Anchored and mostly standalone on purpose: a prose sentence that merely
// mentions a comment ("le ministre a refusé de commenter") must not trip it,
// and an editorial aside titled "Commentaire de la rédaction" must survive — so
// the bare-word patterns require the line to be essentially just the header.
const COMMENT_SECTION_PATTERNS: RegExp[] = [
  /^\d+\s+commentaires?\b/i,
  /^commentaires?\s*\(?\s*\d*\s*\)?\s*$/i,
  /^(voir|afficher|lire|masquer|tous? les)\s+(les\s+)?(\d+\s+)?commentaires?/i,
  /^(laisser|poster|ajouter|[ée]crire|publier|d[ée]poser)\s+un\s+commentaire/i,
  /^commenter\s+cet\s+article\b/i,
  /^r[ée]agir\s*(à\s+cet\s+article)?\s*$/i,
  /^r[ée]agissez\b/i,
  /^vos\s+r[ée]actions\s*$/i,
  /^donnez\s+votre\s+avis\b/i,
  /^(rejoignez|participez)\b.*\b(conversation|discussion|d[ée]bat)\b/i,
  /^connectez[\s-]?vous\s+pour\s+(commenter|r[ée]agir|poster)/i,
  /^\d+\s+comments?\b/i,
  /^comments?\s*\(?\s*\d*\s*\)?\s*$/i,
  /^(show|view|hide|read)\s+(all\s+)?(\d+\s+)?comments?\b/i,
  /^(leave|post|add|write)\s+a\s+(comment|reply)\b/i,
  /^join\s+the\s+(conversation|discussion)\b/i,
  /^be\s+the\s+first\s+to\s+comment\b/i,
  /^sign\s+in\s+to\s+comment\b/i,
];

// A comment-section opener is short; a long paragraph that happens to start with
// one of these words is prose, not a thread header.
const MAX_COMMENT_HEADER_CHARS = 80;

export function isCommentSectionHeader(line: string): boolean {
  const text = line.trim();
  if (text.length === 0 || text.length > MAX_COMMENT_HEADER_CHARS) return false;
  return COMMENT_SECTION_PATTERNS.some((pattern) => pattern.test(text));
}

// Truncates the paragraph list at the first comment-section opener, dropping it
// and everything after.
export function dropCommentSection(paragraphs: string[]): string[] {
  const index = paragraphs.findIndex(isCommentSectionHeader);
  return index === -1 ? paragraphs : paragraphs.slice(0, index);
}

// Cleans a stored "\n\n"-joined article body in place.
export function cleanArticleContent(content: string): string {
  return dropCommentSection(
    stripBoilerplate(
      content
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0),
    ),
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
// A paywall/consent wall always sits at the very top of the captured body, so we
// only scan the opening for its markers. Scanning the whole text would reject a
// legitimately recovered article that merely mentions "inscrivez-vous à la
// newsletter" or "connectez-vous" somewhere in its prose.
const PAYWALL_SCAN_CHARS = 500;
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
// artefact. Used by scrapeArticle() to trigger the AI body-recovery fallback
// and, if the recovered body is still bad, to fail the job with an operator-
// readable reason.
export function assessScrapeQuality(content: string): ScrapeQuality {
  const text = content.trim();
  if (text.length < MIN_ARTICLE_CONTENT_CHARS) {
    return {
      ok: false,
      reason: `scraped body is too short (${text.length} chars, expected at least ${MIN_ARTICLE_CONTENT_CHARS})`,
    };
  }
  const opening = text.slice(0, PAYWALL_SCAN_CHARS);
  if (PAYWALL_MARKERS.some((pattern) => pattern.test(opening))) {
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
