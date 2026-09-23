import { LEVEL_BANDS, type Level, type ScoreCriterion } from "@/lib/score-criteria";

// Prompt-facing rubric: the definition, checklist, level anchors and worked
// calibration examples the tool schema hands the model for each criterion.
// English, like the other pipeline prompts; the user-facing labels live in
// next-intl (messages/*.json). The numbers, weights and pure functions stay in
// score-criteria.ts — this file only carries the text the model reads.
//
// v1.3 rewrote the level wording of factuality, completeness and transparency.
// Measured on the first 16 published articles, every one of them landed in the
// 60-84 band: L3 demanded perfection nobody reaches (funding disclosed on the
// article page, zero trivial slips, zero gaps), so "reliable" was unreachable
// by construction. See docs/SCORING.md §0.a.

type CriterionRubric = {
  definition: string;
  checklist: readonly string[];
  levels: Record<Level, string>;
  // One worked example per band boundary, to stop the model parking in the
  // middle of a 25-point band. The scores they quote are written out in prose,
  // so they need re-checking by hand if LEVEL_BANDS ever moves.
  anchors: readonly string[];
};

// The level the worked example in BAND_USAGE is drawn from, and how wide the
// "just below the next level" slice at the top of a band is.
const EXAMPLE_LEVEL: Level = 2;
const BAND_TOP_SLICE = 4;
const EXAMPLE_BAND_TOP = LEVEL_BANDS[EXAMPLE_LEVEL][1];

// Shared instruction on how to spend the refined score inside a band. Injected
// once into the aggregate system prompt rather than repeated per criterion.
export const BAND_USAGE = [
  "Use the FULL width of each band. The top of a band is for a criterion that",
  "only just misses the next level up; the bottom is for one that nearly falls",
  "to the level below. A criterion that meets its level comfortably and fails",
  `the next one only on a detail belongs near the top (e.g. ${EXAMPLE_BAND_TOP - BAND_TOP_SLICE}-${EXAMPLE_BAND_TOP} in L${EXAMPLE_LEVEL}),`,
  "NOT in the middle. Do not default to round mid-band numbers.",
].join(" ");

export const CRITERION_RUBRIC: Record<ScoreCriterion, CriterionRubric> = {
  factuality: {
    definition:
      "Are the article's factual claims true and verified against the sources?",
    checklist: [
      "Are central claims attributed to a verifiable source?",
      "Checked against sources, are they accurate (no truncated quotes, no distorted data)?",
      "Are any claims contradicted by solid evidence?",
      "Are figures, dates, places and names consistent and correct?",
    ],
    levels: {
      3: "Every central claim checks out. Trivial slips that change nothing for a reader — a one-day date error, a rounded figure, a misspelt name — STAY at this level.",
      2: "Central claims hold, but ≥1 secondary claim is wrong or distorted in a way a reader would notice.",
      1: "≥1 central claim unsupported/doubtful, or a distortion of a central claim.",
      0: "A demonstrated central falsehood (→ raise fabricationDetected).",
    },
    anchors: [
      "A wire report where 9 of 10 claims are confirmed and the tenth dates an event one day early: L3, 88 — the slip is real but changes nothing.",
      "A feature whose headline figure is right but which misattributes a study to the wrong institution: L2, 80.",
    ],
  },
  corroboration: {
    definition:
      "Are the central facts confirmed by independent external sources you actually retrieved (not the same wire copy reprinted)?",
    checklist: [
      "Does the central fact appear in ≥2 genuinely independent sources?",
      "Are those sources reliable (not themselves dubious)?",
      "Does an existing fact-check confirm or refute the fact?",
      "Are the found sources independent of each other, or one origin recopied?",
    ],
    levels: {
      3: "≥2 reliable independent sources confirm.",
      2: "1 reliable source confirms, or partial convergence.",
      1: "No corroboration despite searching, or only non-independent reprints.",
      0: "Reliable sources contradict the central fact (→ consider centralClaimDebunked).",
    },
    anchors: [
      "Two national outlets and the originating institution all report the same figure: L3, 92.",
      "Only the primary dataset backs the claim and no third party has picked it up: L2, 78.",
    ],
  },
  sourcing: {
    definition:
      "Are the references cited by the article solid: named, independent, primary, verifiable?",
    checklist: [
      "How many sources does the article cite? Named or anonymous?",
      "Primary (document, direct witness) or only secondary (reprint)?",
      "≥2 sources on contested points?",
      "Verifiable, working links/references?",
    ],
    levels: {
      3: "Sources named and traceable, primary where it matters, ≥2 on contested points. A source named in the text without a hyperlink still counts as verifiable.",
      2: "Mostly credible, some secondary/weakly attributed.",
      1: "Mostly anonymous/unverifiable, or a central point on a single source.",
      0: "No sources, or non-existent/fabricated sources.",
    },
    anchors: [
      "A report quoting a named minister on the record and citing the institution that published the figures, without hyperlinks: L3, 86.",
      "A piece attributing its central figure to 'several studies' with none named: L1, 52.",
    ],
  },
  completeness: {
    definition:
      "Are the important facts present, or does the article distort by strategic omission or context deformation? Do NOT penalise tone — only omissions that change understanding.",
    checklist: [
      "Is the context essential to understanding present?",
      "Is a known fact missing that would reverse the reading?",
      "Are relevant nuances/counter-arguments mentioned?",
      "Are any quotes taken out of context?",
    ],
    levels: {
      3: "Essential context present. A gap that does not change how a reader reads the piece STAYS at this level — no article says everything.",
      2: "One omission a reader would have wanted, though it does not reverse the reading.",
      1: "Strategic omission of an important element.",
      0: "Severe distortion by omission (decisive facts knowingly dropped).",
    },
    anchors: [
      "A news report that covers the event and its immediate context but leaves out historical background a reader does not need to follow it: L3, 88.",
      "A study write-up that reports the correlation and never mentions the authors' own causality caveat: L2, 72.",
    ],
  },
  transparency: {
    definition:
      "Can a reader tell who wrote this, when, and which publisher stands behind it? Opacity IS the defect — a site hiding its author or owner gets a low level, never null. Funding disclosure is a bonus, not a requirement: almost no outlet publishes it on the article page.",
    checklist: [
      "Author identified (full name, ideally bio/contact)?",
      "Publication date present?",
      "Site owner/publisher identifiable (masthead, legal notice, about page)?",
      "Funding and conflicts of interest disclosed, where the subject calls for it?",
    ],
    levels: {
      3: "Named author, publication date and an identifiable publisher with a masthead. Undisclosed funding does NOT bar this level.",
      2: "Author and date present, publisher identifiable only indirectly.",
      1: "Minimal or no byline, opaque publisher.",
      0: "Anonymous and opaque.",
    },
    anchors: [
      "An established outlet: signed piece, dated, masthead and legal notice reachable, no funding statement: L3, 90.",
      "A trade site publishing under a first name only, with a company behind it named in the footer: L2, 66.",
    ],
  },
  recency: {
    definition:
      "Is the information up to date, or stale/superseded by later facts? Return null ONLY for timeless content where recency does not apply.",
    checklist: [
      "Is a date present?",
      "Do later facts invalidate the information?",
      "Is the topic time-sensitive or timeless?",
    ],
    levels: {
      3: "Up to date.",
      2: "Dated but still valid.",
      1: "Partly superseded.",
      0: "Stale, presented as current.",
    },
    anchors: [
      "Published this week on a running story, nothing has since overtaken it: L3, 95.",
      "A two-year-old explainer whose figures have been updated once since: L2, 74.",
    ],
  },
};
