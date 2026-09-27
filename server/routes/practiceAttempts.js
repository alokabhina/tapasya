// server/routes/practiceAttempts.js
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import practiceAdminMiddleware from '../middleware/practiceAdmin.js'
import PracticeAttempt from '../models/PracticeAttempt.js'
import PracticeTest from '../models/PracticeTest.js'
import PracticeReport from '../models/PracticeReport.js'
import { scoreSection, scoreOverall } from '../utils/practiceScoring.js'
import {
  buildSectionalSummary, buildTopicBreakdown, buildTimeSplit,
  buildStrongWeakZones, buildAttemptCompare,
} from '../utils/practiceAnalysis.js'
import { syncAttemptToMockTracker } from '../utils/practiceMockSync.js'

const router = express.Router()
router.use(authMiddleware)

// Answer-stripping for the mid-test payload — kept local to this route
// since it owns "what can the client see while an attempt is in-progress".
function sanitizeQuestion({ correctKey, explanation, topic, topicRaw, ...q }) { return q }
function sanitizeTest(test) {
  return { ...test, sections: test.sections.map((s) => ({ ...s, questions: s.questions.map(sanitizeQuestion) })) }
}

// POST /api/practice-attempts — start (or resume) an attempt. Body: { testId }
router.post('/', async (req, res) => {
  try {
    const { testId } = req.body
    const test = await PracticeTest.findById(testId)
    if (!test || test.status !== 'published') return res.status(404).json({ error: 'Test nahi mila' })

    // Ek hi user ka ek hi test pe ek se zyada "in-progress" attempt kabhi na
    // ho — refresh/re-click pe existing wahi resume ho jaye.
    const existing = await PracticeAttempt.findOne({ userId: req.user.id, testId, status: 'in-progress' })
    if (existing) return res.json({ attempt: existing, test: sanitizeTest(test.toObject()) })

    const lastAttemptNumber = await PracticeAttempt.countDocuments({ userId: req.user.id, testId })

    if (!test.hasAttempts) { test.hasAttempts = true; await test.save() }

    const attempt = await PracticeAttempt.create({
      userId: req.user.id,
      testId,
      attemptNumber: lastAttemptNumber + 1,
      status: 'in-progress',
      currentSectionIndex: 0,
      sectionState: test.sections.map((s) => ({
        sectionName: s.name,
        startedAt: null,
        responses: s.questions.map((q) => ({ qNo: q.qNo, status: 'not-visited' })),
      })),
    })
    res.json({ attempt, test: sanitizeTest(test.toObject()) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/practice-attempts/:id — resume payload: attempt + answer-stripped test
router.get('/:id', async (req, res) => {
  try {
    const attempt = await PracticeAttempt.findOne({ _id: req.params.id, userId: req.user.id })
    if (!attempt) return res.status(404).json({ error: 'Not found' })
    const test = await PracticeTest.findById(attempt.testId).lean()
    res.json({ attempt, test: sanitizeTest(test) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/practice-attempts/:id/progress — periodic autosave (plan doc
// Section 13). Body: { sectionIndex, responses: [{qNo, selectedKey, status,
// timeSpentSec}], currentSectionIndex }. timeSpentSec is always a *delta* to
// add, never an absolute value — so retried/duplicate syncs never overwrite
// accumulated time with a smaller number.
router.patch('/:id/progress', async (req, res) => {
  try {
    const attempt = await PracticeAttempt.findOne({ _id: req.params.id, userId: req.user.id, status: 'in-progress' })
    if (!attempt) return res.status(404).json({ error: 'Not found ya already submit ho chuka hai' })

    const { sectionIndex, responses, currentSectionIndex } = req.body
    if (sectionIndex != null && Array.isArray(responses)) {
      const state = attempt.sectionState[sectionIndex]
      if (!state) return res.status(400).json({ error: 'Invalid sectionIndex' })
      if (!state.startedAt) state.startedAt = new Date()

      const byQNo = new Map(state.responses.map((r) => [r.qNo, r]))
      for (const incoming of responses) {
        const existing = byQNo.get(incoming.qNo)
        if (!existing) continue
        if (incoming.selectedKey !== undefined) existing.selectedKey = incoming.selectedKey
        if (incoming.status !== undefined) existing.status = incoming.status
        if (incoming.timeSpentSec) existing.timeSpentSec += incoming.timeSpentSec
      }
    }
    if (currentSectionIndex != null) attempt.currentSectionIndex = currentSectionIndex

    await attempt.save()
    res.json({ saved: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/practice-attempts/:id/report — the in-test red-flag button.
// Body: { scope: 'question'|'test', sectionIndex?, qNo?, message? }. Student
// flags a specific question (wrong option/typo/etc.) or the whole paper as
// having an issue; admin reviews these via the /admin/reports endpoints
// below. Doesn't block or alter the attempt in any way — pure side-channel.
router.post('/:id/report', async (req, res) => {
  try {
    const attempt = await PracticeAttempt.findOne({ _id: req.params.id, userId: req.user.id })
    if (!attempt) return res.status(404).json({ error: 'Not found' })

    const { scope, sectionIndex = null, qNo = null, message = '' } = req.body
    if (!['question', 'test'].includes(scope)) return res.status(400).json({ error: 'Invalid scope' })

    const report = await PracticeReport.create({
      userId: req.user.id,
      testId: attempt.testId,
      attemptId: attempt._id,
      scope,
      sectionIndex: scope === 'question' ? sectionIndex : null,
      qNo: scope === 'question' ? qNo : null,
      message: (message || '').slice(0, 1000),
    })
    res.json({ reported: true, reportId: report._id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/practice-attempts/report-general — the "Report" bottom-nav
// button (replaces the old "Math" shortcut there, see BottomNav.jsx).
// Works anywhere in the app, not just mid-test. Body: { page, message }.
router.post('/report-general', async (req, res) => {
  try {
    const { page = '', message = '' } = req.body
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message zaroori hai' })
    const report = await PracticeReport.create({
      userId: req.user.id,
      scope: 'app',
      page: page.slice(0, 200),
      message: message.slice(0, 1000),
    })
    res.json({ reported: true, reportId: report._id })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Admin — red-flag reports (practice-tests/admin/reports page) ────────

// GET /api/practice-attempts/admin/reports?status=open — newest first,
// enriched with the test title and reporting user's name/email so the
// admin list doesn't need N+1 lookups client-side.
router.get('/admin/reports', practiceAdminMiddleware, async (req, res) => {
  try {
    const filter = {}
    if (req.query.status && ['open', 'resolved'].includes(req.query.status)) filter.status = req.query.status
    const reports = await PracticeReport.find(filter)
      .sort({ createdAt: -1 })
      .populate('testId', 'title')
      .populate('userId', 'displayName email')
      .lean()
    res.json(reports)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/practice-attempts/admin/reports/:reportId — toggle open/resolved.
router.patch('/admin/reports/:reportId', practiceAdminMiddleware, async (req, res) => {
  try {
    const { status } = req.body
    if (!['open', 'resolved'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
    const report = await PracticeReport.findByIdAndUpdate(req.params.reportId, { status }, { new: true })
    if (!report) return res.status(404).json({ error: 'Not found' })
    res.json(report)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/practice-attempts/:id/submit-section — plan doc Section 7.6
// flows #1 (mid-test section submit) and #2/#3 (final section submit,
// manual or auto). Body: { sectionIndex, timeLeftAtSubmitSec, auto? }
router.post('/:id/submit-section', async (req, res) => {
  try {
    const attempt = await PracticeAttempt.findOne({ _id: req.params.id, userId: req.user.id, status: 'in-progress' })
    if (!attempt) return res.status(404).json({ error: 'Not found ya already submit ho chuka hai' })
    const test = await PracticeTest.findById(attempt.testId)

    const { sectionIndex, timeLeftAtSubmitSec, auto } = req.body
    const section = test.sections[sectionIndex]
    const state = attempt.sectionState[sectionIndex]
    if (!section || !state) return res.status(400).json({ error: 'Invalid sectionIndex' })

    const scored = scoreSection(section, state.responses)
    Object.assign(state, scored, { submittedAt: new Date(), timeLeftAtSubmitSec: timeLeftAtSubmitSec ?? null })

    const isLastSection = sectionIndex === test.sections.length - 1
    if (isLastSection) {
      attempt.overall = scoreOverall(test, attempt.sectionState)
      attempt.status = auto ? 'auto-submitted' : 'submitted'
      attempt.submittedAt = new Date()
    } else {
      attempt.currentSectionIndex = sectionIndex + 1
      if (attempt.sectionState[sectionIndex + 1]) attempt.sectionState[sectionIndex + 1].startedAt = new Date()
    }

    await attempt.save()

    if (attempt.status !== 'in-progress') {
      await syncAttemptToMockTracker(test, attempt, req.user.id) // Section 11, idempotent
    }

    res.json({ attempt, isLastSection })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/practice-attempts/:id/result — Result page cards (plan doc Section 9)
router.get('/:id/result', async (req, res) => {
  try {
    const attempt = await PracticeAttempt.findOne({ _id: req.params.id, userId: req.user.id })
    if (!attempt || attempt.status === 'in-progress') return res.status(404).json({ error: 'Abhi submit nahi hua hai' })

    const previous = await PracticeAttempt.findOne({
      userId: req.user.id, testId: attempt.testId, attemptNumber: attempt.attemptNumber - 1,
    }).select('overall.score').lean()

    res.json({
      testId: attempt.testId,
      overall: attempt.overall,
      attemptNumber: attempt.attemptNumber,
      previousScore: previous?.overall?.score ?? null,
      submittedAt: attempt.submittedAt,
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/practice-attempts/:id/analysis — everything the Analysis page
// needs in one call (plan doc Section 10).
router.get('/:id/analysis', async (req, res) => {
  try {
    const attempt = await PracticeAttempt.findOne({ _id: req.params.id, userId: req.user.id })
    if (!attempt || attempt.status === 'in-progress') return res.status(404).json({ error: 'Abhi submit nahi hua hai' })
    const test = await PracticeTest.findById(attempt.testId).lean()

    const allAttempts = await PracticeAttempt.find({ userId: req.user.id, testId: attempt.testId }).lean()

    res.json({
      sectionalSummary: buildSectionalSummary(test, attempt),
      topicBreakdown: buildTopicBreakdown(test, attempt),
      timeSplit: buildTimeSplit(test, attempt),
      strongWeakZones: buildStrongWeakZones(test, attempt),
      attemptCompare: buildAttemptCompare(allAttempts),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/practice-attempts/:id/solutions — question-by-question review.
// Answers/explanations are only ever revealed through this endpoint, and
// only once the attempt is no longer in-progress.
//
// Also computes a community per-question average time: across every OTHER
// submitted attempt on this same test (any user, any attempt number),
// average out timeSpentSec per (sectionIndex, qNo) so the Solutions screen
// can show "you took Xs · class average Ys" next to each question. A
// response nobody actually opened (timeSpentSec === 0) is excluded so it
// doesn't drag the average toward zero.
router.get('/:id/solutions', async (req, res) => {
  try {
    const attempt = await PracticeAttempt.findOne({ _id: req.params.id, userId: req.user.id })
    if (!attempt || attempt.status === 'in-progress') return res.status(404).json({ error: 'Abhi submit nahi hua hai' })
    const test = await PracticeTest.findById(attempt.testId).lean()

    const allAttempts = await PracticeAttempt.find({ testId: attempt.testId, status: { $ne: 'in-progress' } })
      .select('sectionState.responses')
      .lean()
    const timeAgg = new Map() // `${sectionIndex}:${qNo}` -> { total, count }
    for (const a of allAttempts) {
      ;(a.sectionState || []).forEach((st, sIdx) => {
        for (const r of st.responses || []) {
          if (!r.timeSpentSec) continue
          const key = `${sIdx}:${r.qNo}`
          const cur = timeAgg.get(key) || { total: 0, count: 0 }
          cur.total += r.timeSpentSec
          cur.count += 1
          timeAgg.set(key, cur)
        }
      })
    }

    const sections = test.sections.map((section, i) => {
      const responseMap = new Map((attempt.sectionState[i]?.responses || []).map((r) => [r.qNo, r]))
      return {
        name: section.name,
        directions: section.directions,
        questions: section.questions.map((q) => {
          const agg = timeAgg.get(`${i}:${q.qNo}`)
          return {
            ...q,
            userAnswer: responseMap.get(q.qNo)?.selectedKey ?? null,
            wasCorrect: responseMap.get(q.qNo)?.selectedKey === q.correctKey,
            userTimeSec: responseMap.get(q.qNo)?.timeSpentSec ?? 0,
            avgTimeSec: agg ? +(agg.total / agg.count).toFixed(1) : null,
            avgTimeSampleSize: agg?.count ?? 0,
          }
        }),
      }
    })
    res.json({ testId: attempt.testId, sections })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/practice-attempts/history/:testId — every past attempt for this
// user+test (test-card "3 attempts, best 71", and the reattempt picker).
router.get('/history/:testId', async (req, res) => {
  try {
    const attempts = await PracticeAttempt.find({ userId: req.user.id, testId: req.params.testId })
      .select('attemptNumber status overall.score overall.accuracy submittedAt')
      .sort({ attemptNumber: -1 })
      .lean()
    res.json(attempts)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router