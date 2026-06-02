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
