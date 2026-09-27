// server/routes/practiceTests.js
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import practiceAdminMiddleware from '../middleware/practiceAdmin.js'
import PracticeTest from '../models/PracticeTest.js'
import PracticeSubject from '../models/PracticeSubject.js'
import PracticeAttempt from '../models/PracticeAttempt.js'
import { validatePracticeTestPayload } from '../utils/practiceTestValidator.js'

const router = express.Router()
router.use(authMiddleware)

// Strips answers/explanations/topic before a test is sent to a student who's
// about to attempt it (or resume one) — the live engine never receives
// correctKey client-side. Same rule enforced again in practiceAttempts.js
// for the resume payload, since that route owns a second copy of "what can
// the client see mid-test".
function sanitizeForAttempt(test) {
  const obj = test.toObject ? test.toObject() : test
  return {
    ...obj,
    sections: obj.sections.map((s) => ({
      ...s,
      questions: s.questions.map(({ correctKey, explanation, topic, topicRaw, ...q }) => q),
    })),
  }
}

// ── Student-facing ───────────────────────────────────────────────────────

// GET /api/practice-tests?subjectId=... — published only, card-list shape.
// Also attaches this user's own attempt summary per test (subject/test-list
// cards: "Last Attempt <date>", best Score/%, Solution/Analysis/Reattempt
// vs Start Test) — one query across every test in this subject rather than
// an N+1 round-trip per card.
router.get('/', async (req, res) => {
  try {
    const filter = { status: 'published' }
    if (req.query.subjectId) filter.subjectId = req.query.subjectId
    const tests = await PracticeTest.find(filter)
      .select('title subjectId examTag totalQuestions totalMarks totalDurationSec createdAt')
      .sort({ createdAt: -1 })
      .lean()

    const testIds = tests.map((t) => t._id)
    const attempts = testIds.length
      ? await PracticeAttempt.find({ userId: req.user.id, testId: { $in: testIds }, status: { $ne: 'in-progress' } })
          .select('testId attemptNumber overall.score overall.maxScore overall.accuracy submittedAt')
          .sort({ submittedAt: -1 })
          .lean()
      : []

    const byTest = new Map()
    for (const a of attempts) {
      const key = String(a.testId)
      if (!byTest.has(key)) byTest.set(key, { attemptsCount: 0, latest: a, best: a })
      const entry = byTest.get(key)
      entry.attemptsCount += 1
      if ((a.overall?.score ?? -Infinity) > (entry.best.overall?.score ?? -Infinity)) entry.best = a
    }

    const withStats = tests.map((t) => {
      const entry = byTest.get(String(t._id))
      return {
        ...t,
        userStats: entry ? {
          attempted: true,
          attemptsCount: entry.attemptsCount,
          lastAttemptId: entry.latest._id,
          lastAttemptDate: entry.latest.submittedAt,
          bestAttemptId: entry.best._id,
          bestScore: entry.best.overall?.score ?? null,
          bestMaxScore: entry.best.overall?.maxScore ?? null,
          bestAccuracy: entry.best.overall?.accuracy ?? null,
        } : { attempted: false },
      }
    })

    res.json(withStats)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/practice-tests/:id — instructions page metadata (no questions)
router.get('/:id', async (req, res) => {
  try {
    const test = await PracticeTest.findById(req.params.id)
      .select('title subjectId examTag status instructions totalQuestions totalMarks totalDurationSec sections.name sections.durationSec sections.cutoff sections.hasCalculator')
    if (!test || test.status !== 'published') return res.status(404).json({ error: 'Not found' })
    res.json(test)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/practice-tests/:id/attempt-payload — full question set, answers
// stripped. (practiceAttempts.js's start/resume endpoints re-sanitize the
// same way rather than trusting this response, since that's the route that
// actually gates who's allowed to fetch it.)
router.get('/:id/attempt-payload', async (req, res) => {
  try {
    const test = await PracticeTest.findById(req.params.id)
    if (!test || test.status !== 'published') return res.status(404).json({ error: 'Not found' })
    res.json(sanitizeForAttempt(test))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Admin ─────────────────────────────────────────────────────────────────

// GET /api/practice-tests/admin/all?subjectId=... — draft + published, card shape
router.get('/admin/all', practiceAdminMiddleware, async (req, res) => {
  try {
    const filter = {}
    if (req.query.subjectId) filter.subjectId = req.query.subjectId
    const tests = await PracticeTest.find(filter)
      .select('title subjectId examTag status totalQuestions totalMarks totalDurationSec hasAttempts createdAt')
      .sort({ createdAt: -1 })
      .lean()
    res.json(tests)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/practice-tests/:id/full — admin edit/preview screen, everything incl. answers
router.get('/:id/full', practiceAdminMiddleware, async (req, res) => {
  try {
    const test = await PracticeTest.findById(req.params.id)
    if (!test) return res.status(404).json({ error: 'Not found' })
    res.json(test)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/practice-tests/validate — dry-run, no save. Body: { payload, subjectId }
router.post('/validate', practiceAdminMiddleware, async (req, res) => {
  try {
    const { payload, subjectId } = req.body
    const existingTopics = subjectId
      ? await PracticeTest.distinct('sections.questions.topic', { subjectId })
      : []
    const result = validatePracticeTestPayload(payload, existingTopics)
    res.json(result)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/practice-tests — create (draft by default). Body: { subjectId, payload, publish? }
router.post('/', practiceAdminMiddleware, async (req, res) => {
  try {
    const { subjectId, payload, publish } = req.body
    if (!subjectId) return res.status(400).json({ error: 'subjectId required hai' })
    const subject = await PracticeSubject.findById(subjectId)
    if (!subject) return res.status(404).json({ error: 'Subject nahi mila' })

    const existingTopics = await PracticeTest.distinct('sections.questions.topic', { subjectId })
    const { valid, errors, normalized } = validatePracticeTestPayload(payload, existingTopics)
    if (!valid) return res.status(400).json({ error: 'Validation failed', errors })

    const test = await PracticeTest.create({
      subjectId,
      title: normalized.title,
      examTag: normalized.examTag,
      instructions: normalized.instructions,
      sections: normalized.sections,
      totalQuestions: normalized.totalQuestions,
      totalMarks: normalized.totalMarks,
      totalDurationSec: normalized.totalDurationSec,
      status: publish ? 'published' : 'draft',
      sourceJson: payload,
      createdBy: req.user.id,
    })
    res.json(test)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/practice-tests/:id — metadata (title/instructions/status)
// always editable; structural (payload/sections) only allowed while
// hasAttempts is false (plan doc Section 8.3) — otherwise use /clone.
router.patch('/:id', practiceAdminMiddleware, async (req, res) => {
  try {
    const test = await PracticeTest.findById(req.params.id)
    if (!test) return res.status(404).json({ error: 'Not found' })

    const { title, instructions, status, payload } = req.body
    if (title !== undefined) test.title = title.trim()
    if (instructions !== undefined) test.instructions = instructions
    if (status !== undefined) test.status = status

    if (payload !== undefined) {
      if (test.hasAttempts) {
        return res.status(400).json({ error: 'Is test pe already attempts ho chuke hai — questions edit karne ke bajaye "Clone as new test" use karo.' })
      }
      const existingTopics = await PracticeTest.distinct('sections.questions.topic', {
        subjectId: test.subjectId, _id: { $ne: test._id },
      })
      const { valid, errors, normalized } = validatePracticeTestPayload(payload, existingTopics)
      if (!valid) return res.status(400).json({ error: 'Validation failed', errors })
      test.sections = normalized.sections
      test.totalQuestions = normalized.totalQuestions
      test.totalMarks = normalized.totalMarks
      test.totalDurationSec = normalized.totalDurationSec
      test.sourceJson = payload
    }

    await test.save()
    res.json(test)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/practice-tests/:id/clone — plan doc Section 8.3's escape hatch
// once a test already has attempts. Always lands as a fresh draft.
router.post('/:id/clone', practiceAdminMiddleware, async (req, res) => {
  try {
    const source = await PracticeTest.findById(req.params.id).lean()
    if (!source) return res.status(404).json({ error: 'Not found' })
    delete source._id
    delete source.createdAt
    delete source.updatedAt
    const clone = await PracticeTest.create({
      ...source,
      title: `${source.title} (Copy)`,
      status: 'draft',
      hasAttempts: false,
      createdBy: req.user.id,
    })
    res.json(clone)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/practice-tests/:id — previously blocked once attempts
// existed; now allowed, and cascades: every PracticeAttempt for this test
// gets deleted along with it (Mock Tracker sync rows for those attempts
// are left as-is — they're historical records owned by that feature, not
// this one — only the practice-test attempts themselves are removed).
router.delete('/:id', practiceAdminMiddleware, async (req, res) => {
  try {
    const test = await PracticeTest.findById(req.params.id)
    if (!test) return res.status(404).json({ error: 'Not found' })
    if (test.hasAttempts) {
      await PracticeAttempt.deleteMany({ testId: test._id })
    }
    await test.deleteOne()
    res.json({ deleted: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router