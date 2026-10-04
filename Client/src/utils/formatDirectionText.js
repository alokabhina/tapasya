// src/utils/formatDirectionText.js
// Exam papers almost always open a shared direction block (Puzzle/DI/RC/
// whatever the topic) with one generic boilerplate instruction sentence —
// "Study the following information carefully and answer the questions
// given below." / "...answer the following questions." / "...answer the
// questions that follow." — and THEN the actual puzzle scenario / passage
// / data starts, usually on its own line in the source paper.
//
// When that boilerplate sentence and the real content get imported as one
// continuous string with no line break between them, it all runs together
// visually (see Puzzle Set 7 screenshot — "...given below. Eight persons
// A, B, C..." on one line). This is a render-time fix, not a data fix —
// it doesn't touch what's stored, just inserts a blank line after that
// first boilerplate sentence if one isn't already there. Runs on
// direction.content only (questions/options don't have this pattern).
// Topic-agnostic on purpose — same boilerplate shows up across Puzzles,
// Data Interpretation, Reading Comprehension, Coding-Decoding, etc.

const INSTRUCTION_SENTENCE = /^(.*?answer the (?:questions?(?: given below| that follow)?|following questions?)[.:])(\s*)/is

export function insertInstructionLineBreak(content) {
  if (!content) return content
  const match = content.match(INSTRUCTION_SENTENCE)
  if (!match) return content

  const [, sentence, trailingWhitespace] = match
  if (trailingWhitespace.includes('\n')) return content // already on its own line

  const rest = content.slice(match[0].length)
  if (!rest) return content

  return `${sentence}\n\n${rest}`
}

// Reasoning papers routinely list several clauses separated by ";" on one
// line in the raw text — coded-language clue lists ("'A' is coded as 'x';
// 'B' is coded as 'y'; ..."), Inequality/Syllogism statement chains
// ("L > M ≤ N; N ≥ Q = R"), Puzzle clue dumps, etc. The source paper
// almost always prints one per line; collapsed into a single paragraph is
// the "sab saath mein chipka hai" complaint. Keeps the semicolon (matches
// how these are actually punctuated) and just adds the line break after it.
// [ \t]+ (not \s+) so it never eats a newline already inserted by an
// earlier step in the pipeline below.
export function breakSemicolonList(text) {
  if (!text) return text
  return text.replace(/;[ \t]+/g, ';\n')
}

// "Statement:", "Conclusions:", "Assumptions:", "Courses of Action:",
// "Arguments:" — common Inequality/Syllogism/Decision-Making section
// labels that sometimes land mid-paragraph instead of starting their own
// (blank-line-preceded) line, e.g. "...accordingly. Statement: L > M...".
const SECTION_LABELS = ['Statements?', 'Conclusions?', 'Assumptions?', 'Courses? of Action', 'Arguments?']
const SECTION_LABEL_RE = new RegExp(`(?<!\\n)\\s+((?:${SECTION_LABELS.join('|')}):)`, 'g')

export function breakSectionLabels(text) {
  if (!text) return text
  return text.replace(SECTION_LABEL_RE, '\n\n$1')
}

// Roman-numeral list items (I. / II. / III. / IV. ...) — Inequality and
// Syllogism "Conclusions: I. ... II. ..." blocks are the main case, but
// this covers any inline Roman-numeral list up to X. Ordered longest-first
// so e.g. "II." isn't matched as just "I." leaving a stray "I." behind.
const ROMAN_ORDER = ['VIII', 'VII', 'III', 'II', 'IV', 'IX', 'VI', 'I', 'V', 'X']
const ROMAN_ITEM_RE = new RegExp(`(?<!\\n)\\s+(${ROMAN_ORDER.join('|')})\\.\\s`, 'g')

export function breakRomanNumeralList(text) {
  if (!text) return text
  return text.replace(ROMAN_ITEM_RE, '\n$1. ')
}

// Colon-label pass + a single opening-sentence break. Breaks after every
// ":" (Statement:/Conclusions:/etc. — handled generically here in case
// breakSectionLabels' fixed label list doesn't cover some variant), and
// after only the FIRST "." in the text — separating an opening sentence
// from what follows once, not turning every sentence of a long prose
// paragraph (Puzzle body text, RC passages) into its own line, which made
// those look too fragmented. Semicolon/Roman-numeral/section-label
// breaking above is unaffected — those are genuine list items and still
// break on every occurrence.
// Two guards keep this from misfiring:
// - [ \t]+ instead of \s+ — never re-collapses a newline/blank-line another
//   step already inserted (e.g. insertInstructionLineBreak's blank line, or
//   breakSectionLabels'/breakRomanNumeralList's line breaks above).
// - the ROMAN_ORDER lookbehind on the period rule — without it, "I. R ≤ P"
//   (already correctly placed on its own line by breakRomanNumeralList)
//   would get re-split into "I." and "R ≤ P", which is wrong.
// Decimals (0.25), ratios (3:2), and times (10:30) are naturally safe since
// there's no space right after the punctuation in those.
const ROMAN_LOOKBEHIND = `(?<!\\b(?:${ROMAN_ORDER.join('|')}))`
// Only the FIRST "." in the text gets a break (no 'g' flag — .replace()
// with a non-global regex stops after one match) — this is meant to
// separate an opening sentence from what follows it once, not turn every
// sentence of a long prose paragraph (Puzzle body text, RC passages) into
// its own line, which made those look too fragmented. Semicolon/Roman-
// numeral/section-label breaking above is unaffected — those are genuine
// list items and still break on every occurrence.
const SENTENCE_END_RE = new RegExp(`${ROMAN_LOOKBEHIND}\\.[ \\t]+(?=[A-Z0-9"'“(])`)

export function breakSentences(text) {
  if (!text) return text
  return text
    .replace(/:[ \t]+/g, ':\n')
    .replace(SENTENCE_END_RE, '.\n')
}

// Single entry point used by both SplitQuestionView.jsx (live test) and
// PracticeTestSolutions.jsx (review) — runs the whole set of reasoning-
// content line-break fixes in one call, in an order where each step's
// output is safe for the next (see breakSentences' guards above).
// `isDirection: true` additionally runs insertInstructionLineBreak, which
// only makes sense for a shared direction block (questions don't open
// with that boilerplate sentence).
export function formatReasoningText(text, { isDirection = false } = {}) {
  if (!text) return text
  let out = typeof text === 'string' ? text : String(text)
  if (isDirection) out = insertInstructionLineBreak(out)
  out = breakSectionLabels(out)
  out = breakRomanNumeralList(out)
  out = breakSemicolonList(out)
  out = breakSentences(out)
  return out
}