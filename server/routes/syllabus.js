import express from 'express'
import authMiddleware from '../middleware/auth.js'
import SyllabusTopic from '../models/Syllabus.js'

const router = express.Router()
router.use(authMiddleware)

// GET /api/syllabus — all topics for the logged-in user (across all exams)
router.get('/', async (req, res) => {
  try {
    const topics = await SyllabusTopic.find({ userId: req.user.id }).sort({ order: 1, createdAt: 1 })
    res.json(topics)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/syllabus/stats — aggregate completion stats by exam & by subject
router.get('/stats', async (req, res) => {
  try {
    const topics = await SyllabusTopic.find({ userId: req.user.id })

    const total = topics.length
    const done = topics.filter(t => t.done).length
    const pct = total ? Math.round((done / total) * 100) : 0

    const byExam = {}
    const bySubject = {}

    for (const t of topics) {
      const eid = String(t.examId)
      const sid = String(t.subjectId)

      if (!byExam[eid]) byExam[eid] = { total: 0, done: 0 }
      byExam[eid].total++
      if (t.done) byExam[eid].done++

      if (!bySubject[sid]) bySubject[sid] = { total: 0, done: 0 }
      bySubject[sid].total++
      if (t.done) bySubject[sid].done++
    }

    res.json({ total, done, pct, byExam, bySubject })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/syllabus — create one topic ({examId, subjectId, name, source})
// or many topics at once ({examId, subjectId, topics: [names], source})
router.post('/', async (req, res) => {
  try {
    const { examId, subjectId, name, topics, source } = req.body
    if (!examId || !subjectId) return res.status(400).json({ error: 'examId and subjectId required' })

    if (Array.isArray(topics) && topics.length) {
      const docs = topics
        .map(n => (typeof n === 'string' ? n.trim() : ''))
        .filter(Boolean)
        .map(n => ({
          userId: req.user.id,
          examId,
          subjectId,
          name: n,
          source: source || 'manual',
        }))
      if (!docs.length) return res.status(400).json({ error: 'No valid topic names provided' })
      const created = await SyllabusTopic.insertMany(docs)
      return res.json(created)
    }

    if (!name || !name.trim()) return res.status(400).json({ error: 'name or topics required' })
    const topic = await SyllabusTopic.create({
      userId: req.user.id,
      examId,
      subjectId,
      name: name.trim(),
      source: source || 'manual',
    })
    res.json(topic)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PATCH /api/syllabus/:id — update a single topic (done, confidence, notes, revisionN, etc.)
router.patch('/:id', async (req, res) => {
  try {
    const topic = await SyllabusTopic.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    )
    if (!topic) return res.status(404).json({ error: 'Topic not found' })
    res.json(topic)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/syllabus/:id — delete a single topic
router.delete('/:id', async (req, res) => {
  try {
    const topic = await SyllabusTopic.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!topic) return res.status(404).json({ error: 'Topic not found' })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router