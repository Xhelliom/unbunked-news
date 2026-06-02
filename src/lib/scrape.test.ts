import { test } from "node:test";
import assert from "node:assert/strict";

import { buildCandidateBlocks } from "./scrape";

const PROSE =
  "Le Parlement a définitivement adopté mardi un texte transposant dans la loi un accord conclu entre partenaires sociaux au mois de février dernier.";

test("keeps prose paragraphs and drops navigation chrome", () => {
  const html = `
    <nav><ul><li>Politique</li><li>Société</li><li>Sport</li></ul></nav>
    <article>
      <p class="article__paragraph">${PROSE}</p>
      <p>Abonnez-vous à la newsletter</p>
    </article>
    <footer>© Le Monde 2026</footer>
  `;
  const blocks = buildCandidateBlocks(html);
  assert.ok(
    blocks.some((block) => block.includes("Le Parlement a définitivement adopté")),
    "the article paragraph must survive",
  );
  assert.ok(
    !blocks.some((block) => /Politique|Société|Sport/.test(block)),
    "single nav words are too short to qualify as prose",
  );
  assert.ok(
    !blocks.some((block) => /Abonnez-vous/.test(block)),
    "newsletter CTA is boilerplate",
  );
});

test("strips scripts and deduplicates repeated blocks", () => {
  const html = `
    <script>var x = ${JSON.stringify({ a: 1, b: 2, c: 3 })};</script>
    <p>${PROSE}</p>
    <p>${PROSE}</p>
  `;
  const blocks = buildCandidateBlocks(html);
  assert.equal(blocks.length, 1);
  assert.ok(!blocks[0].includes("var x"));
});
