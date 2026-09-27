// server/utils/topicNormalizer.js
// Solves the "RC" vs "Reading Comprehension" problem (plan doc Section 6.1)
// so the same topic never splits into two rows in weak/strong-topic
// analysis just because the AI phrased it differently on two uploads.
//
// Two layers, in order:
//   1. A small built-in alias map for common exam-prep abbreviations.
//   2. Fuzzy-match against topics that already exist for this subject.
// Anything "close but not exact" is NOT auto-merged — it comes back as a
// `suggestion` for the admin's upload-review screen to confirm or reject.

const ALIAS_MAP = {
  'rc': 'Reading Comprehension',
  'di': 'Data Interpretation',
  'ns': 'Number Series',
  'pj': 'Para Jumble',
  'sa': 'Seating Arrangement',
  'syl': 'Syllogism',
  'coding decoding': 'Coding-Decoding',
  'blood relation': 'Blood Relations',
  'blood relations': 'Blood Relations',
  'da': 'Data Analysis',
  'qa': 'Quadratic Equation',
  'quant': 'Quantitative Aptitude',
  'eng': 'English Language',
}

function clean(str) {
  return String(str || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')
}

// Small Levenshtein distance — topic names are short strings, so plain
// O(n*m) is fine here, no need to pull in a library for this.
function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function similarity(a, b) {
  const ca = clean(a), cb = clean(b)
  if (!ca || !cb) return 0
  if (ca === cb) return 1
  const dist = levenshtein(ca, cb)
  return 1 - dist / Math.max(ca.length, cb.length)
}

const SIMILARITY_THRESHOLD = 0.85

// existingTopics: string[] — every distinct `topic` already saved under this
// PracticeSubject. Returns { topic, topicRaw, matched, suggestion }.
// `suggestion` is only set for a close-but-not-exact match.
export function normalizeTopic(rawTopic, existingTopics = []) {
  const topicRaw = String(rawTopic || '').trim()
  if (!topicRaw) return { topic: 'General', topicRaw: '', matched: null, suggestion: null }

  const key = clean(topicRaw)

  // 1. Alias map — exact key hit (e.g. "rc" -> "Reading Comprehension")
  if (ALIAS_MAP[key]) {
    return { topic: ALIAS_MAP[key], topicRaw, matched: 'alias', suggestion: null }
  }

  // 2. Exact match (case/punctuation-insensitive) against an existing topic
  const exact = existingTopics.find((t) => clean(t) === key)
  if (exact) return { topic: exact, topicRaw, matched: 'exact', suggestion: null }

  // 3. Fuzzy match — close but not exact -> flag, do NOT merge silently
  let best = null, bestScore = 0
  for (const t of existingTopics) {
    const score = similarity(topicRaw, t)
    if (score > bestScore) { bestScore = score; best = t }
  }
  if (best && bestScore >= SIMILARITY_THRESHOLD) {
    return { topic: topicRaw, topicRaw, matched: null, suggestion: { topic: best, score: +bestScore.toFixed(2) } }
  }

  // 4. Genuinely new topic
  return { topic: topicRaw, topicRaw, matched: 'new', suggestion: null }
}

// Batch helper used by the validator — normalizes every question's topic in
// one pass (so later questions in the same upload can match against topics
// introduced earlier in that same upload too), collecting suggestions for
// the admin's review screen.
export function normalizeAllTopics(questions, existingTopics = []) {
  const seen = new Set(existingTopics)
  const suggestions = []
  const normalized = questions.map((q) => {
    const result = normalizeTopic(q.topic, [...seen])
    if (result.suggestion) suggestions.push({ qNo: q.qNo, rawTopic: q.topic, suggestion: result.suggestion })
    seen.add(result.topic)
    return { ...q, topic: result.topic, topicRaw: result.topicRaw || q.topic }
  })
  return { questions: normalized, suggestions }
}
