// src/constants/practiceTestImportPrompt.js
// The copy-paste prompt shown on the admin Upload Test screen (plan doc
// Section 6) — admin pastes this + the PDF's question text into their own
// AI, pastes the JSON reply back into the upload form. extractJson() below
// mirrors constants/mockImportPrompt.js's helper of the same name (kept as
// its own local copy rather than importing that file, so this constants
// file stays standalone and the two features can't accidentally couple).

export const PRACTICE_TEST_IMPORT_PROMPT = `Below is the text of an exam question paper (copy-pasted from a PDF). Convert it into a
single valid JSON object that follows the EXACT schema given below. Return ONLY the raw JSON —
no explanation, no markdown code-fence, no extra text before or after it.

RULES:

1. DIRECTION GROUPS — Questions inside a section go under a shared "direction group" whenever
   they share a passage / puzzle description / data table / instruction line that applies to
   more than one question.
   - If 5-10 questions share one passage/puzzle/table (e.g. "Study the following information
     carefully..."), give all of those questions the same groupId, and put that shared content
     only once in the section's "directions" array.
   - If a set of standalone questions only repeats one generic instruction line above them
     (e.g. "Choose the most appropriate word..." for a fill-in-the-blank set), still create an
     "instruction" type direction and give its groupId to all of those questions.
   - If a question is completely standalone (no shared context/instruction — just the question
     and its options), set its groupId to null.

2. OPTIONS — Give options keys A, B, C, D, E (as many as the paper actually has).

3. ANSWER ACCURACY IS THE MOST IMPORTANT PART OF THIS TASK. Wrong answers make the whole test
   useless, so follow this process for every single question before writing correctKey:
   a. First check if the paper text includes an official answer key. If it does, and the key is
      unambiguous, use that as your primary source.
   b. Independently work out the answer yourself as well — actually solve/reason through the
      question, don't just skim it. If your own solving disagrees with the printed answer key,
      trust the option that is actually correct by your own worked solution, set correctKey to
      that option, and say so explicitly at the start of the explanation, e.g. "Answer key in the
      paper says C, but solving gives D — used D. [then the normal explanation]".
   c. If there is no answer key in the text at all, solve the question yourself and give your
      best worked answer as correctKey, with a full explanation showing the steps.
   d. If — after genuinely trying — you cannot determine a confident answer (missing data,
      missing diagram/image the question depends on, garbled/incomplete OCR text, or a
      genuinely ambiguous question), do NOT guess an option just to fill the field. Instead:
      - Set correctKey to your single best guess (never leave it blank — the field is required),
      - but start the explanation with the exact tag "ANSWER NOT VERIFIED: " followed by the
        specific reason you couldn't solve it confidently.
      This tag is used on the admin side to flag the question for manual review, so it must
      never be used casually — only when you genuinely could not verify the answer.
   Never invent a plausible-sounding explanation for an answer you have not actually checked.

4. TOPIC field: give the question's type/category from your own knowledge — no fixed list is
   given on purpose, because this must stay exam-agnostic (Banking, SSC, CA/Teaching, or
   anything else later) — use whatever is the standard/common topic name for that exam, using
   your full judgement.
   IMPORTANT: always write the FULL, standard name, never a short-form/abbreviation — e.g.
   write "Reading Comprehension", not "RC"; "Data Interpretation", not "DI"; "Number Series",
   not "NS". This keeps the same topic from splitting into two different buckets (e.g. "RC" and
   "Reading Comprehension" being treated as different topics).

5. SUBTOPIC field: this is what powers weak-topic analysis, so it needs to be a genuinely
   useful sub-classification, not just a repeat of "topic". Be specific about the exact skill or
   question-pattern being tested.
   - This matters especially for Quant "Simplification"/"Approximation" style questions, since
     they otherwise all collapse into one bucket even though they test very different skills.
     For these, classify subTopic by the calculation technique actually involved, for example:
     "BODMAS/VBODMAS", "Fractions & Decimals", "Surds & Indices", "Squares, Cubes & Roots",
     "Approximation", "Percentage-based Simplification", "Algebraic Identities", or similar —
     pick whichever one actually matches what the question is testing, this list is only
     illustrative, use your judgement if a question needs a different label.
   - Apply the same specificity everywhere else too, not just Simplification — e.g. for
     "Quadratic Equations" use subTopics like "Comparison of Roots" or "Forming Equations"; for
     "Puzzles" use the puzzle type like "Circular Seating" or "Floor-based Puzzle"; for "Number
     Series" use "Missing Number" or "Wrong Number", etc. — always the FULL standard name, same
     abbreviation rule as topic above.

6. The test stays fully in English — do not create any Hindi/bilingual fields, even if the
   paper includes a Hindi translation; ignore the Hindi text entirely.

7. If the paper shows a calculator is allowed for a section (usually Quant), set
   hasCalculator: true.

8. If a field genuinely isn't available, leave it out of the JSON entirely (don't write null
   for arrays) — only fill in what you're actually sure of.
   EXCEPTION — "durationSec" (per section) is NEVER optional and must NEVER be left out or set
   to 0, even if the paper doesn't mention a time limit for that section (e.g. a topic-wise
   practice set like "Simplification" instead of a full timed exam). If the paper doesn't state
   a duration, estimate one yourself: roughly 45-60 seconds per question for quant/reasoning,
   30-40 seconds per question for straightforward English/GK questions — round to the nearest
   whole minute (e.g. 20 questions × 50s ≈ 1000s → use 1020 or a clean 1200 for a 20-min slot).
   Always give a positive number in seconds, never null/0/omitted.

9. "marksWrong" is a MAGNITUDE, not a signed adjustment — always give it as a POSITIVE number
   (e.g. 0.25 for "-0.25 negative marking"), never negative. The app subtracts this value itself
   at scoring time, so a negative number here would flip wrong answers into bonus marks instead
   of penalties.

10. OUTPUT VALIDITY — the JSON you return must be complete and syntactically valid all by itself:
    - No trailing commas after the last item in any array or object.
    - Straight double quotes only (") for every key and string — never curly/smart quotes
      (" " ' '), even if the source paper text contains them; convert those to a plain apostrophe
      or straight quote inside the string.
    - Coding-Decoding / word-quoting questions often need a quoted word or phrase INSIDE a
      questionText or direction content, e.g. "MARKET" is coded as "LZSLDS". Every such internal
      double-quote must be escaped as \" — never leave a raw " character inside a JSON string
      value, that alone breaks the whole JSON (this is the single most common real-world cause
      of a failed parse for reasoning papers).
    - Do not cut your response off partway through. If the paper has many questions (30+) and
      you are not confident the ENTIRE valid JSON will fit in one response, say so in plain text
      instead of silently returning a half-finished JSON object — suggest splitting the paper
      into 2+ batches (e.g. by section) rather than truncating mid-array.
    - Before finalizing, mentally check that every opening brace has a matching closing brace
      and every opening bracket has a matching closing bracket — the whole reply must be one
      single parseable JSON object, nothing after the final closing brace.

SCHEMA:
{
  "title": string,
  "subjectName": string,
  "examTag": string,
  "instructions": string,
  "sections": [
    {
      "name": string,
      "durationSec": number,
      "marksCorrect": number,
      "marksWrong": number,
      "cutoff": number,
      "hasCalculator": boolean,
      "directions": [
        { "groupId": string, "type": "passage"|"puzzle"|"data-table"|"sentence-set"|"instruction",
          "title": string, "content": string }
      ],
      "questions": [
        { "qNo": number, "groupId": string|null,
          "questionText": string,
          "options": [{ "key": string, "text": string }],
          "correctKey": string, "explanation": string,
          "topic": string, "subTopic": string, "difficulty": "easy"|"medium"|"hard" }
      ]
    }
  ]
}

The source paper is provided one of two ways — use whichever is actually present:
- Pasted as plain text right after this prompt (see "Here is the paper's text:" below), OR
- Attached directly as a PDF/image file alongside this prompt, with no text pasted below.
If a file is attached, read the questions straight from it (including any tables/diagrams the
image shows) instead of waiting for pasted text — an empty or missing "paper's text" section below
just means the file attachment is the source for this run.

Here is the paper's text (leave this section empty/ignore it if you were given a PDF/image
attachment instead):
`

// Pulls a JSON object out of the AI's reply even if it added extra text or
// a \`\`\`json fence around it — so a slightly messy paste doesn't just fail.
// Keeps the real JSON.parse error (message + position) from every attempt so
// the caller can show *why* it failed instead of a flat "parse nahi hua" —
// that position number is usually enough to find the broken spot by hand.
export function extractJson(raw) {
  const trimmed = raw.trim()
  let lastErr = null

  try { return JSON.parse(trimmed) } catch (e) { lastErr = e }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()) } catch (e) { lastErr = e }
  }

  const braceMatch = trimmed.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]) } catch (e) { lastErr = e }
  }

  const reason = lastErr?.message || 'invalid JSON'
  throw new Error(
    `JSON parse nahi ho paya — ${reason}. Common wajah: (1) AI ka response beech mein kat gaya `
    + `(truncated — "Unexpected end of JSON input" isi ka sign hai, response bahut lamba tha), `
    + `(2) trailing comma kisi array/object ke last item ke baad, (3) curly/smart quotes ("  " ' ') `
    + `seedhe quotes (") ki jagah. Poora AI response paste hua hai (shuru se end tak) yeh check karo.`
  )
}

// A question's explanation is tagged with this exact prefix by the prompt
// above when the AI could not confidently verify its own answer — admin
// UI (TestPreviewModal) scans for this to flag questions for manual review
// before publishing. Kept here so the tag string only lives in one place.
export const UNVERIFIED_ANSWER_TAG = 'ANSWER NOT VERIFIED:'

export function isAnswerUnverified(explanation) {
  return typeof explanation === 'string' && explanation.trim().startsWith(UNVERIFIED_ANSWER_TAG)
}