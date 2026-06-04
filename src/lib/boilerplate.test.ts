import { test } from "node:test";
import assert from "node:assert/strict";

import { assessScrapeQuality, cleanArticleContent } from "./boilerplate";

// A plausible real body: long enough, no paywall markers, no nav repetition.
const REAL_BODY = Array.from(
  { length: 12 },
  (_, i) =>
    `Le thermomètre mondial persiste depuis trois ans au-dessus des moyennes saisonnières attendues, selon les relevés ${i} publiés cette semaine.`,
).join("\n\n");

test("accepts a real article body", () => {
  assert.deepEqual(assessScrapeQuality(REAL_BODY), { ok: true });
});

test("rejects a Le Monde paywall teaser", () => {
  // Long enough to clear the length floor, so the rejection can only come from
  // a paywall marker — otherwise this test would silently pass even if every
  // PAYWALL_MARKERS pattern were removed.
  const teaser = [
    "Cet article vous est offert.",
    "Cet article est réservé aux abonnés, connectez-vous pour le lire.",
    "Inscrivez-vous pour accéder à l'intégralité des articles du journal et profiter de nos offres.",
    Array.from(
      { length: 8 },
      (_, i) =>
        `Le contexte de cette affaire ${i} a été longuement débattu dans les médias au cours des derniers mois.`,
    ).join(" "),
  ].join(" ");
  assert.ok(teaser.length >= 600, "teaser must clear the length floor");
  const quality = assessScrapeQuality(teaser);
  assert.equal(quality.ok, false);
  assert.match(quality.ok ? "" : quality.reason, /paywall or consent wall/);
});

test("accepts a real body whose only paywall marker is past the opening", () => {
  const lead = Array.from(
    { length: 6 },
    (_, i) =>
      `La réforme adoptée cette semaine ${i} modifie en profondeur les règles applicables aux salariés concernés, selon le rapport publié mardi.`,
  ).join(" ");
  const body = `${lead} Pour aller plus loin, inscrivez-vous à notre newsletter hebdomadaire.`;
  assert.equal(/inscrivez/i.test(body.slice(0, 500)), false);
  assert.deepEqual(assessScrapeQuality(body), { ok: true });
});

test("rejects a body shorter than the minimum", () => {
  const quality = assessScrapeQuality("Trop court.");
  assert.equal(quality.ok, false);
  assert.match(quality.ok ? "" : quality.reason, /too short/);
});

test("rejects a scraped navigation menu", () => {
  const menu = Array(40).fill("Politique").join(" ");
  const quality = assessScrapeQuality(menu);
  assert.equal(quality.ok, false);
});

test("cleanArticleContent drops boilerplate lines", () => {
  const cleaned = cleanArticleContent(
    "Abonnez-vous\n\nLe vrai paragraphe de l'article reste en place.\n\n© Agence",
  );
  assert.equal(cleaned, "Le vrai paragraphe de l'article reste en place.");
});

test("cleanArticleContent cuts the reader comment thread", () => {
  const cleaned = cleanArticleContent(
    [
      "Le corps de l'article se termine ici, après une longue analyse.",
      "Commentaires (42)",
      "Jean72 — il y a 2 heures",
      "Tout à fait d'accord avec cette analyse, merci.",
      "Répondre",
    ].join("\n\n"),
  );
  assert.equal(
    cleaned,
    "Le corps de l'article se termine ici, après une longue analyse.",
  );
});

test("cleanArticleContent cuts an English comment thread too", () => {
  const cleaned = cleanArticleContent(
    [
      "The article body ends here after a thorough investigation.",
      "12 Comments",
      "user_x: Great piece, thanks.",
    ].join("\n\n"),
  );
  assert.equal(
    cleaned,
    "The article body ends here after a thorough investigation.",
  );
});

test("comment detection ignores prose and editorial asides", () => {
  const body = [
    "Le ministre a refusé de commenter cet article publié par nos confrères.",
    "Commentaire de la rédaction : cette décision était attendue de longue date.",
    "L'enquête se poursuit dans les prochaines semaines selon les autorités.",
  ].join("\n\n");
  // Nothing is cut: the mention is mid-sentence and the editorial aside is not a
  // thread header.
  assert.equal(cleanArticleContent(body), body);
});
