import { test } from "node:test";
import assert from "node:assert/strict";

import type { ArticleBlock } from "./article-blocks";
import {
  applyStructureSelection,
  buildStructureCandidates,
  htmlToBlocks,
} from "./scrape";

const PROSE =
  "Le Parlement a définitivement adopté mardi un texte transposant dans la loi un accord conclu entre partenaires sociaux au mois de février dernier.";

test("structure candidates keep prose and structure, drop nav chrome", () => {
  const html = `
    <nav><ul><li>Politique</li><li>Société</li><li>Sport</li></ul></nav>
    <article>
      <h2>Le contexte</h2>
      <p class="article__paragraph">${PROSE}</p>
      <p>Abonnez-vous à la newsletter</p>
    </article>
    <footer>© Le Monde 2026</footer>
  `;
  const texts = buildStructureCandidates(html).map((block) => block.text);
  assert.ok(
    texts.some((text) => text.includes("Le Parlement a définitivement adopté")),
    "the article paragraph must survive",
  );
  assert.ok(
    buildStructureCandidates(html).some(
      (block) => block.kind === "heading" && block.text === "Le contexte",
    ),
    "a real section heading is kept as a structural candidate",
  );
  assert.ok(
    !texts.some((text) => /Politique|Société|Sport/.test(text)),
    "single nav words are too short to qualify as prose",
  );
  assert.ok(
    !texts.some((text) => /Abonnez-vous/.test(text)),
    "newsletter CTA is boilerplate",
  );
});

test("structure candidates strip scripts and deduplicate", () => {
  const html = `
    <script>var x = ${JSON.stringify({ a: 1, b: 2, c: 3 })};</script>
    <p>${PROSE}</p>
    <p>${PROSE}</p>
  `;
  const blocks = buildStructureCandidates(html);
  assert.equal(blocks.length, 1);
  assert.ok(!blocks[0].text.includes("var x"));
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

test("htmlToBlocks tags headings, quotes and code, and keeps mid-body blocks", () => {
  const html = `
    <h2>Le contexte</h2>
    <p>Le premier paragraphe expose les faits de cette affaire en détail.</p>
    <div class="ad">Publicité — abonnez-vous à l'offre premium</div>
    <blockquote>Une citation marquante du protagoniste principal.</blockquote>
    <pre><code>const x = 1;\nconsole.log(x);</code></pre>
    <p>Le dernier paragraphe conclut l'analyse de la rédaction.</p>
  `;
  const blocks = htmlToBlocks(html);
  const kinds = blocks.map((block) => block.kind);

  // Structure is preserved per role rather than flattened to paragraphs…
  assert.deepEqual(kinds, ["heading", "para", "para", "quote", "code", "para"]);
  // …and the mid-body ad is present as its own block, so the AI step (or the
  // boilerplate filter) can drop it without losing the surrounding prose.
  assert.ok(blocks[2].text.includes("Publicité"));
  // Code keeps its internal line break.
  assert.ok(blocks[4].text.includes("\n"));
});
