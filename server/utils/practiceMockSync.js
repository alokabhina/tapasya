// server/utils/practiceMockSync.js
// Pushes a submitted PracticeAttempt into the existing Mock Tracker models
// (MockExam / MockAttempt) so its already-built dashboard (utils/mockStats.js
// — trend, weak topics, sectional dashboards) works on this data without any
// changes there. See practice-test-feature-plan.md Section 11.
//
// NOTE: requires the `sourceAttemptId` field added to models/MockAttempt.js
// (see the plan's Section 0 file-edit list) — optional/nullable, so this is
// backward-compatible with every existing manually-imported MockAttempt.
import MockExam from '../models/MockExam.js'
import MockAttempt from '../models/MockAttempt.js'
import { buildSectionalSummary, buildTopicBreakdown } from './practiceAnalysis.js'

export async function syncAttemptToMockTracker(test, attempt, userId) {
  if (attempt.syncedToMockTracker) return null // idempotent — never double-write on a retried submit call

  const examName = test.examTag?.trim() || test.title

  let mockExam = await MockExam.findOne({ userId, name: examName })
  if (!mockExam) {
    mockExam = await MockExam.create({
      userId,
      name: examName,
      sections: test.sections.map((s) => ({ name: s.name })),
    })
  }

  const { rows } = buildSectionalSummary(test, attempt)
  const topicBreakdown = buildTopicBreakdown(test, attempt)

  const sections = rows.map((row) => {
    const section = test.sections.find((s) => s.name === row.sectionName)
    return {
      sectionName: row.sectionName,
      score: row.score,
      maxScore: section.questions.length * section.marksCorrect,
      attempted: row.attempted,
      totalQuestions: row.totalQuestions,
      correct: row.correct,
      incorrect: row.incorrect,
      unattempted: row.totalQuestions - row.attempted,
      accuracy: row.accuracy,
      timeTakenSec: row.timeTakenSec,
      cutoff: row.cutoff,
      topics: (topicBreakdown[row.sectionName]?.weakness || []).map((t) => ({
        name: t.name,
        correctPct: t.correctPct,
        correct: t.correct,
        total: t.total,
        questionNumbers: t.questions.map((q) => q.qNo),
      })),
    }
  })

  const mockAttempt = await MockAttempt.create({
    userId,
    examProfileId: mockExam._id,
    mode: test.sections.length > 1 ? 'full' : 'sectional',
    title: test.title,
    platform: 'Practice Test',
    attemptedOn: attempt.submittedAt || new Date(),
    overall: {
      score: attempt.overall.score,
      maxScore: attempt.overall.maxScore,
      accuracy: attempt.overall.accuracy,
      attempted: attempt.overall.attempted,
      totalQuestions: attempt.overall.totalQuestions,
      correct: attempt.overall.correct,
      incorrect: attempt.overall.incorrect,
      unattempted: attempt.overall.totalQuestions - attempt.overall.attempted,
      timeTakenSec: attempt.overall.totalTimeSec,
      timeAllottedSec: test.totalDurationSec,
      cutoff: attempt.overall.cutoff,
    },
    sections,
    sourceAttemptId: attempt._id,
  })

  attempt.syncedToMockTracker = true
  await attempt.save()

  return mockAttempt
}
