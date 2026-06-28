import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Exam from '../models/Exam.js'
import SyllabusTopic from '../models/Syllabus.js'

const router = express.Router()
router.use(authMiddleware)

// GET /api/exams — get all exams for user
router.get('/', async (req, res) => {
  try {
    const exams = await Exam.find({ userId: req.user.id }).sort({ examDate: 1 })
    res.json(exams)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/exams — create new exam
router.post('/', async (req, res) => {
  try {
    const { name, examDate, color, notes } = req.body
    if (!name || !examDate) return res.status(400).json({ error: 'name and examDate required' })
    const exam = await Exam.create({ userId: req.user.id, name, examDate, color: color || '#a855f7', notes: notes || '' })
    res.json(exam)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/exams/:id — update exam
router.put('/:id', async (req, res) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    )
    if (!exam) return res.status(404).json({ error: 'Exam not found' })
    res.json(exam)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/exams/:id — delete exam (and all its syllabus topics)
router.delete('/:id', async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
    if (!exam) return res.status(404).json({ error: 'Exam not found' })
    const { deletedCount } = await SyllabusTopic.deleteMany({ examId: req.params.id, userId: req.user.id })
    res.json({ ok: true, deletedTopics: deletedCount })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router