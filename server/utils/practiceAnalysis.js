// server/utils/practiceAnalysis.js
// Aggregation helpers for the Analysis page (plan doc Section 10) — same
// "pure functions, no DB access" pattern as utils/mockStats.js, so the
// route stays thin and these stay unit-testable on their own.

// Section-by-section table: Attempted/Correct/Incorrect/Skipped/Unseen/
// Accuracy/Score/Time + a grand-total row (plan doc Image 12 reference).
export function buildSectionalSummary(test, attempt) {
  const rows = test.sections.map((section, i) => {
    const state = attempt.sectionState[i] || {}
    const responses = state.responses || []
    const skipped = responses.filter((r) => r.selectedKey == null && r.status !== 'not-visited').length
    const unseen = responses.filter((r) => r.status === 'not-visited').length
    return {
      sectionName: section.name,
      attempted: (state.correct || 0) + (state.incorrect || 0),
      totalQuestions: section.questions.length,
      correct: state.correct || 0,
      incorrect: state.incorrect || 0,
      skipped, unseen,
      accuracy: state.accuracy || 0,
      score: state.score || 0,
      cutoff: section.cutoff,
      timeTakenSec: state.timeTakenSec || 0,
    }
  })

  const total = rows.reduce((acc, r) => ({
    attempted: acc.attempted + r.attempted,
    totalQuestions: acc.totalQuestions + r.totalQuestions,
    correct: acc.correct + r.correct,
    incorrect: acc.incorrect + r.incorrect,
    skipped: acc.skipped + r.skipped,
    unseen: acc.unseen + r.unseen,
    score: acc.score + r.score,
    timeTakenSec: acc.timeTakenSec + r.timeTakenSec,
  }), { attempted: 0, totalQuestions: 0, correct: 0, incorrect: 0, skipped: 0, unseen: 0, score: 0, timeTakenSec: 0 })
  total.accuracy = (total.correct + total.incorrect) > 0
    ? +((total.correct / (total.correct + total.incorrect)) * 100).toFixed(1)
    : 0

  return { rows, total }
}

// Per-topic breakdown, grouped by section — "Know Your Weakness" panel
// (plan doc Image 13): question chips (correct/wrong/skipped/unseen) +
// correct/total count, pre-sorted both weak-first and strong-first so the
// frontend just picks whichever tab is active.
export function buildTopicBreakdown(test, attempt) {
  const bySection = {}

  test.sections.forEach((section, i) => {
    const state = attempt.sectionState[i]
    const responseMap = new Map((state?.responses || []).map((r) => [r.qNo, r]))
    const topics = {}

    for (const q of section.questions) {
      const r = responseMap.get(q.qNo)
      const isAttempted = !!(r && r.selectedKey != null && (r.status === 'answered' || r.status === 'answered-marked'))
      const isCorrect = isAttempted && r.selectedKey === q.correctKey

      if (!topics[q.topic]) topics[q.topic] = { name: q.topic, correct: 0, total: 0, questions: [] }
      topics[q.topic].total++
      if (isCorrect) topics[q.topic].correct++
      topics[q.topic].questions.push({
        qNo: q.qNo,
        status: !r || r.status === 'not-visited' ? 'unseen' : !isAttempted ? 'skipped' : isCorrect ? 'correct' : 'wrong',
        timeSpentSec: r?.timeSpentSec || 0,
      })
    }

    const topicList = Object.values(topics).map((t) => ({ ...t, correctPct: t.total ? +((t.correct / t.total) * 100).toFixed(1) : 0 }))
    bySection[section.name] = {
      weakness: [...topicList].sort((a, b) => a.correctPct - b.correctPct),
      strength: [...topicList].sort((a, b) => b.correctPct - a.correctPct),
    }
  })

  return bySection
}

// Correct/Wrong/Skipped time totals — section-wise (Image 14) and, per
// section, topic-wise (Image 15).
export function buildTimeSplit(test, attempt) {
  const sectionWise = []
  const topicWiseBySection = {}
  const overallTotals = { correctSec: 0, wrongSec: 0, skippedSec: 0 }

  test.sections.forEach((section, i) => {
    const state = attempt.sectionState[i]
    const responseMap = new Map((state?.responses || []).map((r) => [r.qNo, r]))
    const totals = { correctSec: 0, wrongSec: 0, skippedSec: 0 }
    const topicTotals = {}

    for (const q of section.questions) {
      const r = responseMap.get(q.qNo)
      const t = r?.timeSpentSec || 0
      const isAttempted = !!(r && r.selectedKey != null && (r.status === 'answered' || r.status === 'answered-marked'))
      const bucket = isAttempted ? (r.selectedKey === q.correctKey ? 'correctSec' : 'wrongSec') : 'skippedSec'

      totals[bucket] += t
      overallTotals[bucket] += t

      if (!topicTotals[q.topic]) topicTotals[q.topic] = { name: q.topic, correctSec: 0, wrongSec: 0, skippedSec: 0 }
      topicTotals[q.topic][bucket] += t
    }

    sectionWise.push({ sectionName: section.name, ...totals })
    topicWiseBySection[section.name] = Object.values(topicTotals)
  })

  return { sectionWise, overallTotals, topicWiseBySection }
}

// "Strong Zones & Weak Zones" — per-section need-improvement topic chips
// (plan doc Image 16). Anything below the accuracy threshold is flagged
// "need improvement", the rest count as strengths.
export function buildStrongWeakZones(test, attempt, weakThreshold = 60) {
  const breakdown = buildTopicBreakdown(test, attempt)
  const result = {}
  for (const [sectionName, { weakness }] of Object.entries(breakdown)) {
    result[sectionName] = {
      needImprovement: weakness.filter((t) => t.correctPct < weakThreshold).map((t) => t.name),
      strong: weakness.filter((t) => t.correctPct >= weakThreshold).map((t) => t.name),
    }
  }
  return result
}

// Previous-attempts compare table (plan doc Section 10.6) — pass every
// PracticeAttempt (any status) for this user+test; in-progress ones are
// filtered out here so the caller doesn't have to remember to.
export function buildAttemptCompare(attempts) {
  const scored = attempts
    .filter((a) => a.status !== 'in-progress')
    .map((a) => ({
      attemptNumber: a.attemptNumber,
      date: a.submittedAt,
      score: a.overall?.score ?? null,
      accuracy: a.overall?.accuracy ?? null,
      correct: a.overall?.correct ?? null,
      incorrect: a.overall?.incorrect ?? null,
      timeTakenSec: a.overall?.totalTimeSec ?? null,
    }))
    .sort((a, b) => a.attemptNumber - b.attemptNumber)

  const bestScore = scored.reduce((max, a) => (a.score != null && a.score > max ? a.score : max), -Infinity)
  return scored.map((a) => ({ ...a, isBest: a.score === bestScore }))
}
