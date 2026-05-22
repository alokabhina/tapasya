// utils/opentdbFetcher.js
// Auto-fetches English vocabulary questions from OpenTDB when DB count is low
// Free, no API key needed

import Question from '../models/Question.js'

const OPENTDB_URL = 'https://opentdb.com/api.php?amount=20&category=10&difficulty=medium&type=multiple'
const LOW_THRESHOLD = 30

/**
 * Transform a raw OpenTDB result into our Question schema shape
 */
function transformOpenTDB(item) {
  const allOptions = [...item.incorrect_answers, item.correct_answer]
  // Simple shuffle
  for (let i = allOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]]
  }

  return {
    gameType:     'vocab',
    questionText: decodeHtml(item.question),
    options:      allOptions.map(decodeHtml),
    answer:       decodeHtml(item.correct_answer),
    explanation:  '',
    difficulty:   item.difficulty || 'medium',
    topic:        'english-general',
    tags:         ['opentdb', 'english'],
    timeLimit:    8,
    level:        1,
    source:       'opentdb',
  }
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
}

/**
 * Check vocab count and fetch from OpenTDB if below threshold
 * Call this at server startup and optionally on a schedule
 */
export async function checkAndFetchVocab() {
  try {
    const count = await Question.countDocuments({ gameType: 'vocab' })
    if (count >= LOW_THRESHOLD) {
      console.log(`✅ Vocab questions OK (${count} in DB)`)
      return
    }

    console.log(`⚠️  Vocab count low (${count}), fetching from OpenTDB...`)
    const res = await fetch(OPENTDB_URL)
    if (!res.ok) throw new Error(`OpenTDB HTTP ${res.status}`)

    const data = await res.json()
    if (data.response_code !== 0) throw new Error(`OpenTDB response_code: ${data.response_code}`)

    const docs = data.results.map(transformOpenTDB)
    await Question.insertMany(docs, { ordered: false })
    console.log(`✅ Inserted ${docs.length} vocab questions from OpenTDB`)
  } catch (e) {
    // Non-fatal — server still works without new vocab
    console.warn('⚠️  OpenTDB fetch failed (non-fatal):', e.message)
  }
}
