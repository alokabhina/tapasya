// server/routes/practiceSubjects.js
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import practiceAdminMiddleware, { isPracticeAdmin } from '../middleware/practiceAdmin.js'
import PracticeSubject from '../models/PracticeSubject.js'
import PracticeTest from '../models/PracticeTest.js'

const router = express.Router()
router.use(authMiddleware)

// GET /api/practice-subjects/is-admin — frontend uses this to decide
// whether to show the admin-only Upload/Leaderboard buttons.
router.get('/is-admin', async (req, res) => {
  try {
    res.json({ isAdmin: await isPracticeAdmin(req.user.id) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/practice-subjects — same list for every logged-in user (this
// isn't per-user data, unlike MockExam). Includes a published-test count
// per subject for the landing page cards.
router.get('/', async (req, res) => {
  try {
    // N alag countDocuments ki jagah ek hi aggregate (parallel me subjects ke saath)
    const [subjects, counts] = await Promise.all([
      PracticeSubject.find().sort({ order: 1, createdAt: 1 }).lean(),
      PracticeTest.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$subjectId', n: { $sum: 1 } } },
      ]),
    ])
    const countBySubject = new Map(counts.map((c) => [String(c._id), c.n]))
    res.json(subjects.map((s) => ({ ...s, testCount: countBySubject.get(String(s._id)) || 0 })))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const subject = await PracticeSubject.findById(req.params.id)
    if (!subject) return res.status(404).json({ error: 'Not found' })
    res.json(subject)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', practiceAdminMiddleware, async (req, res) => {
  try {
    const { name, examCategory, color, order } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Subject name required hai' })
    const subject = await PracticeSubject.create({
      name: name.trim(),
      examCategory: examCategory?.trim() || 'Banking',
      color: color || '#f97316',
      order: order ?? 0,
      createdBy: req.user.id,
    })
    res.json(subject)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id', practiceAdminMiddleware, async (req, res) => {
  try {
    const updates = {}
    for (const key of ['name', 'examCategory', 'color', 'order']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    const subject = await PracticeSubject.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!subject) return res.status(404).json({ error: 'Not found' })
    res.json(subject)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE — blocked if it still has tests, so a subject can't silently orphan
// published papers. Admin has to delete/move those first.
router.delete('/:id', practiceAdminMiddleware, async (req, res) => {
  try {
    const testCount = await PracticeTest.countDocuments({ subjectId: req.params.id })
    if (testCount > 0) return res.status(400).json({ error: `Is subject mein ${testCount} test(s) hai — pehle unhe delete/move karo` })
    const subject = await PracticeSubject.findByIdAndDelete(req.params.id)
    if (!subject) return res.status(404).json({ error: 'Not found' })
    res.json({ deleted: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router