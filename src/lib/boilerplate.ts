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
