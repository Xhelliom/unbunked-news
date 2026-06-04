import { test } from "node:test";
import assert from "node:assert/strict";

import type { ArticleBlock } from "./article-blocks";
import { applyStructureSelection, buildCandidateBlocks } from "./scrape";

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

const STRUCTURE_SOURCE: ArticleBlock[] = [
  { kind: "para", text: "Intro paragraph of the article." },
  { kind: "para", text: "Section title" },
  { kind: "para", text: "Body paragraph that develops the point." },
  { kind: "para", text: "Bob42 — il y a 1 heure" },
];

test("applyStructureSelection rebuilds the body verbatim with AI roles", () => {
  const result = applyStructureSelection(
    [
      { index: 0, kind: "para" },
      { index: 1, kind: "heading" },
      { index: 2, kind: "para" },
    ],
    STRUCTURE_SOURCE,
  );
  assert.deepEqual(result, [
    { kind: "para", text: "Intro paragraph of the article." },
    { kind: "heading", text: "Section title" },
    { kind: "para", text: "Body paragraph that develops the point." },
  ]);
});

test("applyStructureSelection drops invalid, repeated and unselected entries", () => {
  const result = applyStructureSelection(
    [
      { index: 2, kind: "para" }, // reorder is honoured
      { index: 9, kind: "para" }, // out of range
      { index: 0, kind: "para" },
      { index: 0, kind: "para" }, // duplicate
      { index: 1.5, kind: "heading" }, // non-integer
      { index: 1, kind: "bogus" }, // unknown role
      // index 3 (the comment) is simply never selected
    ],
    STRUCTURE_SOURCE,
  );
  assert.deepEqual(result, [
    { kind: "para", text: "Body paragraph that develops the point." },
    { kind: "para", text: "Intro paragraph of the article." },
  ]);
});

test("applyStructureSelection returns empty on a non-array selection", () => {
  assert.deepEqual(applyStructureSelection(null, STRUCTURE_SOURCE), []);
  assert.deepEqual(applyStructureSelection("nope", STRUCTURE_SOURCE), []);
});
