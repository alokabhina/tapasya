// server/routes/mockExams.js
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import MockExam from '../models/MockExam.js'
import MockAttempt from '../models/MockAttempt.js'
import { buildTrend, buildFullTrend, buildSectionalDashboards, buildSubjectAccuracy, buildWeakTopics, buildStrongTopics, buildSummaryStats } from '../utils/mockStats.js'

const router = express.Router()
router.use(authMiddleware)

// ── Exam profiles ─────────────────────────────────────────────────────────

// POST /api/mock-exams   { name, sections: [string], linkedExamId? }
router.post('/', async (req, res) => {
  try {
    const { name, sections = [], linkedExamId } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Exam name required' })
    const exam = await MockExam.create({
      userId: req.user.id,
      name: name.trim(),
      sections: sections.filter((s) => s?.trim()).map((s) => ({ name: s.trim() })),
      linkedExamId: linkedExamId || null,
    })
    res.json(exam)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/mock-exams   → list with attempts count + last score
router.get('/', async (req, res) => {
  try {
    const exams = await MockExam.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
    const withStats = await Promise.all(exams.map(async (exam) => {
      const attempts = await MockAttempt.find({ examProfileId: exam._id }).sort({ attemptedOn: -1 }).select('overall attemptedOn mode').lean()
      return {
        ...exam,
        attemptsCount: attempts.length,
        lastScore: attempts[0]?.overall?.score ?? null,
        lastAttemptedOn: attempts[0]?.attemptedOn ?? null,
        trend: attempts.slice(0, 10).reverse().map((a) => a.overall?.score ?? null), // small sparkline, oldest→newest
      }
    }))
    res.json(withStats)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/mock-exams/:id
router.get('/:id', async (req, res) => {
  try {
    const exam = await MockExam.findOne({ _id: req.params.id, userId: req.user.id })
    if (!exam) return res.status(404).json({ error: 'Not found' })
    res.json(exam)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/mock-exams/:id
router.patch('/:id', async (req, res) => {
  try {
    const updates = {}
    if (req.body.name !== undefined) updates.name = req.body.name.trim()
    if (req.body.sections !== undefined) updates.sections = req.body.sections.filter((s) => s?.trim()).map((s) => ({ name: s.trim() }))
    if (req.body.linkedExamId !== undefined) updates.linkedExamId = req.body.linkedExamId || null

    const exam = await MockExam.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, updates, { new: true })
    if (!exam) return res.status(404).json({ error: 'Not found' })
    res.json(exam)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/mock-exams/:id   — also deletes all its attempts
router.delete('/:id', async (req, res) => {
  try {
    const exam = await MockExam.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!exam) return res.status(404).json({ error: 'Not found' })
    await MockAttempt.deleteMany({ examProfileId: exam._id, userId: req.user.id })
    res.json({ deleted: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Attempts ─────────────────────────────────────────────────────────────

// POST /api/mock-exams/:id/attempts
router.post('/:id/attempts', async (req, res) => {
  try {
    const exam = await MockExam.findOne({ _id: req.params.id, userId: req.user.id })
    if (!exam) return res.status(404).json({ error: 'Exam profile not found' })

    const { mode, title, platform, attemptedOn, overall, sections, topperCompare, averageCompare, marksDistribution, rawImportedText, notes } = req.body
    if (!['full', 'sectional'].includes(mode)) return res.status(400).json({ error: 'mode must be full or sectional' })

    const attempt = await MockAttempt.create({
      userId: req.user.id,
      examProfileId: exam._id,
      mode,
      title: title || null,
      platform: platform || null,
      attemptedOn: attemptedOn || Date.now(),
      overall: overall || {},
      sections: sections || [],
      topperCompare: topperCompare || null,
      averageCompare: averageCompare || null,
      marksDistribution: marksDistribution || [],
      rawImportedText: rawImportedText || null,
      notes: notes || '',
    })
    res.json(attempt)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/mock-exams/:id/attempts?mode=full|sectional
router.get('/:id/attempts', async (req, res) => {
  try {
    const filter = { examProfileId: req.params.id, userId: req.user.id }
    if (req.query.mode) filter.mode = req.query.mode
    const attempts = await MockAttempt.find(filter).sort({ attemptedOn: -1 })
    res.json(attempts)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/mock-exams/:id/attempts/:attemptId
router.get('/:id/attempts/:attemptId', async (req, res) => {
  try {
    const attempt = await MockAttempt.findOne({ _id: req.params.attemptId, examProfileId: req.params.id, userId: req.user.id })
    if (!attempt) return res.status(404).json({ error: 'Not found' })
    res.json(attempt)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/mock-exams/:id/attempts/:attemptId
router.patch('/:id/attempts/:attemptId', async (req, res) => {
  try {
    const allowed = ['title', 'platform', 'attemptedOn', 'overall', 'sections', 'topperCompare', 'averageCompare', 'marksDistribution', 'notes']
    const updates = {}
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key]

    const attempt = await MockAttempt.findOneAndUpdate(
      { _id: req.params.attemptId, examProfileId: req.params.id, userId: req.user.id },
      updates,
      { new: true }
    )
    if (!attempt) return res.status(404).json({ error: 'Not found' })
    res.json(attempt)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/mock-exams/:id/attempts/:attemptId
router.delete('/:id/attempts/:attemptId', async (req, res) => {
  try {
    const attempt = await MockAttempt.findOneAndDelete({ _id: req.params.attemptId, examProfileId: req.params.id, userId: req.user.id })
    if (!attempt) return res.status(404).json({ error: 'Not found' })
    res.json({ deleted: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Dashboard ────────────────────────────────────────────────────────────

// GET /api/mock-exams/:id/dashboard
router.get('/:id/dashboard', async (req, res) => {
  try {
    const exam = await MockExam.findOne({ _id: req.params.id, userId: req.user.id })
    if (!exam) return res.status(404).json({ error: 'Not found' })

    const attempts = await MockAttempt.find({ examProfileId: exam._id, userId: req.user.id }).sort({ attemptedOn: 1 }).lean()

    const sectionalDashboards = buildSectionalDashboards(attempts)
    res.json({
      exam,
      summary: buildSummaryStats(attempts),
      trend: buildTrend(attempts),
      fullTrend: buildFullTrend(attempts),
      // kept for backward compat with anything reading just the trend arrays
      sectionalTrends: Object.fromEntries(Object.entries(sectionalDashboards).map(([k, v]) => [k, v.trend])),
      sectionalDashboards,
      subjectAccuracy: buildSubjectAccuracy(attempts),
      weakTopics: buildWeakTopics(attempts),
      strongTopics: buildStrongTopics(attempts),
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router