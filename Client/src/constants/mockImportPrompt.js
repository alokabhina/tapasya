// src/constants/mockImportPrompt.js
// Copied to clipboard by the "AI se paste karo" tab. The user pastes their
// mock result page's text (or describes a screenshot) after this, gives it
// to any AI (ChatGPT/Claude/Gemini), and pastes the JSON reply back in.
export const MOCK_IMPORT_PROMPT = `Neeche maine ek mock test ka result page ka text/screenshot diya hai. Isse saara available data nikaal ke SIRF ek valid JSON object return karo, koi extra text/explanation nahi, koi markdown code-fence bhi nahi — bas raw JSON.

Jo field na mile use null rakho, koi field zabardasti mat banao ya andaza mat lagao.

{
  "mode": "full" ya "sectional",
  "title": string ya null,
  "platform": string ya null,
  "overall": {
    "score": number ya null, "maxScore": number ya null,
    "rank": number ya null, "outOf": number ya null, "percentile": number ya null,
    "accuracy": number ya null, "attempted": number ya null, "totalQuestions": number ya null,
    "correct": number ya null, "incorrect": number ya null, "unattempted": number ya null,
    "timeTakenSec": number ya null, "timeAllottedSec": number ya null, "cutoff": number ya null
  },
  "sections": [
    {
      "sectionName": string, "score": number ya null, "maxScore": number ya null,
      "attempted": number ya null, "totalQuestions": number ya null,
      "correct": number ya null, "incorrect": number ya null, "unattempted": number ya null,
      "accuracy": number ya null, "timeTakenSec": number ya null, "cutoff": number ya null,
      "topics": [{ "name": string, "correctPct": number ya null, "correct": number ya null, "total": number ya null }]
    }
  ],
  "topperCompare": { "score": number, "accuracy": number, "correct": number, "wrong": number, "time": string } ya null,
  "averageCompare": { "score": number, "accuracy": number, "correct": number, "wrong": number, "time": string } ya null,
  "marksDistribution": [{ "bucketLabel": string, "count": number }] ya null
}

Yahan result ka text/screenshot hai:
`

// Pulls a JSON object out of the AI's reply even if it added extra text or
// a \`\`\`json fence around it — so a slightly messy paste doesn't just fail.
export function extractJson(raw) {
  const trimmed = raw.trim()
  try { return JSON.parse(trimmed) } catch { /* try to salvage below */ }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()) } catch { /* fall through */ }
  }
  const braceMatch = trimmed.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]) } catch { /* give up */ }
  }
  throw new Error('JSON parse nahi ho paya')
}