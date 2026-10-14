// server/routes/practiceExams.js
// Exam level of Exam -> Subject -> Test (IBPS Clerk, SBI PO, SSC CGL ...).
// Reading is open to every logged-in user; create/edit/delete is admin-only.
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import practiceAdminMiddleware from '../middleware/practiceAdmin.js'
import PracticeExam from '../models/PracticeExam.js'
import PracticeSubject from '../models/PracticeSubject.js'
import PracticeTest from '../models/PracticeTest.js'
import { ensureExamsMigrated } from '../utils/practiceExamMigration.js'

const router = express.Router()
router.use(authMiddleware)

// GET /api/practice-exams — every exam with its subject count and published-test count.
router.get('/', async (req, res) => {
  try {
    await ensureExamsMigrated()
    const [exams, subjects, counts] = await Promise.all([
      PracticeExam.find().sort({ order: 1, createdAt: 1 }).lean(),
      PracticeSubject.find().select('_id examId parentId').lean(),
      PracticeTest.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$subjectId', n: { $sum: 1 } } },
      ]),
    ])
    const testsBySubject = new Map(counts.map((c) => [String(c._id), c.n]))
    const subjectCount = new Map()
    const testCount = new Map()
    for (const s of subjects) {
      const k = String(s.examId)
      // folders subject count me nahi gine jate (sirf top-level subjects)
      if (!s.parentId) subjectCount.set(k, (subjectCount.get(k) || 0) + 1)
      testCount.set(k, (testCount.get(k) || 0) + (testsBySubject.get(String(s._id)) || 0))
    }
    res.json(exams.map((e) => ({
      ...e,
      subjectCount: subjectCount.get(String(e._id)) || 0,
      testCount: testCount.get(String(e._id)) || 0,
    })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const exam = await PracticeExam.findById(req.params.id)
    if (!exam) return res.status(404).json({ error: 'Not found' })
    res.json(exam)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', practiceAdminMiddleware, async (req, res) => {
  try {
    const { name, color, order } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Exam name required hai' })
    const dup = await PracticeExam.findOne({ name: name.trim() }).collation({ locale: 'en', strength: 2 })
    if (dup) return res.status(400).json({ error: 'Is naam ka exam pehle se hai' })
    const exam = await PracticeExam.create({
      name: name.trim(), color: color || '#f97316', order: order ?? 0, createdBy: req.user.id,
    })
    res.json(exam)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id', practiceAdminMiddleware, async (req, res) => {
  try {
    const updates = {}
    for (const key of ['name', 'color', 'order']) {
      if (req.body[key] !== undefined) updates[key] = key === 'name' ? String(req.body[key]).trim() : req.body[key]
    }
    if (updates.name === '') return res.status(400).json({ error: 'Exam name khaali nahi ho sakta' })
    const exam = await PracticeExam.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!exam) return res.status(404).json({ error: 'Not found' })
    res.json(exam)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE — blocked while the exam still has subjects (same rule as subject -> tests).
router.delete('/:id', practiceAdminMiddleware, async (req, res) => {
  try {
    const n = await PracticeSubject.countDocuments({ examId: req.params.id })
    if (n > 0) return res.status(400).json({ error: `Is exam mein ${n} subject(s) hai — pehle unhe delete/move karo` })
    const exam = await PracticeExam.findByIdAndDelete(req.params.id)
    if (!exam) return res.status(404).json({ error: 'Not found' })
    res.json({ deleted: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router