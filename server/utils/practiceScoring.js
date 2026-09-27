// server/utils/practiceScoring.js
// Pure scoring functions — no DB access — so section-submit and final-submit
// routes both reuse the exact same math, and it stays easy to unit-test.

// One section's questions + the user's responses for that section ->
// correct/incorrect/unattempted counts, score, accuracy, time taken.
export function scoreSection(section, responses = []) {
  const responseMap = new Map(responses.map((r) => [r.qNo, r]))
  let correct = 0, incorrect = 0, unattempted = 0, score = 0, timeTakenSec = 0

  for (const q of section.questions) {
    const r = responseMap.get(q.qNo)
    timeTakenSec += r?.timeSpentSec || 0

    // "answered" and "answered-marked" both count as attempted+scored —
    // marking a question for review never changes scoring, it's purely a
    // UI/self-review flag (plan doc Section 14 edge case).
    const attempted = !!(r && r.selectedKey != null && (r.status === 'answered' || r.status === 'answered-marked'))
    if (!attempted) { unattempted++; continue }

    const marksCorrect = q.marksCorrectOverride ?? section.marksCorrect
    const marksWrong = q.marksWrongOverride ?? section.marksWrong

    if (r.selectedKey === q.correctKey) { correct++; score += marksCorrect }
    else { incorrect++; score -= marksWrong }
  }

  const attemptedCount = correct + incorrect
  const accuracy = attemptedCount > 0 ? +((correct / attemptedCount) * 100).toFixed(1) : 0

  return { correct, incorrect, unattempted, score: +score.toFixed(2), accuracy, timeTakenSec }
}

// Rolls every scored section up into the attempt-level `overall` block —
// mirrors the exact Result-page card set (plan doc Section 9): Score /
// Attempted / Correct / Incorrect / Skipped / Unseen, plus Accuracy /
// Total Time / Utilized Time / Wasted Time.
//
// "Skipped" = visited but never answered. "Unseen" = never visited at all
// (Not Visited) — kept as two separate buckets throughout, matching the
// reference result page exactly.
export function scoreOverall(test, sectionState) {
  let score = 0, maxScore = 0, attempted = 0, totalQuestions = 0
  let correct = 0, incorrect = 0, skipped = 0, unseen = 0
  let totalTimeSec = 0, utilizedTimeSec = 0, wastedTimeSec = 0

  test.sections.forEach((section, i) => {
    const state = sectionState[i]
    totalQuestions += section.questions.length
    maxScore += section.questions.length * section.marksCorrect
    score += state?.score || 0
    correct += state?.correct || 0
    incorrect += state?.incorrect || 0
    attempted += (state?.correct || 0) + (state?.incorrect || 0)
    totalTimeSec += state?.timeTakenSec || 0

    for (const r of state?.responses || []) {
      const attemptedThis = !!(r.selectedKey != null && (r.status === 'answered' || r.status === 'answered-marked'))
      if (attemptedThis) utilizedTimeSec += r.timeSpentSec || 0
      else wastedTimeSec += r.timeSpentSec || 0

      if (r.status === 'not-visited') unseen++
      else if (!attemptedThis) skipped++ // visited but never answered (incl. "marked" with no answer selected)
    }
  })

  const accuracy = (correct + incorrect) > 0 ? +((correct / (correct + incorrect)) * 100).toFixed(1) : 0
  const cutoffSum = test.sections.reduce((sum, s) => sum + (s.cutoff || 0), 0)
  const cutoff = test.sections.some((s) => s.cutoff != null) ? cutoffSum : null

  return {
    score: +score.toFixed(2), maxScore, attempted, totalQuestions,
    correct, incorrect, skipped, unseen,
    accuracy, totalTimeSec, utilizedTimeSec, wastedTimeSec,
    cutoff, passedCutoff: cutoff != null ? score >= cutoff : null,
  }
}
