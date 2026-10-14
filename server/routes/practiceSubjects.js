// server/routes/practiceSubjects.js
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import practiceAdminMiddleware, { isPracticeAdmin } from '../middleware/practiceAdmin.js'
import PracticeSubject from '../models/PracticeSubject.js'
import PracticeTest from '../models/PracticeTest.js'
import PracticeExam from '../models/PracticeExam.js'
import { ensureExamsMigrated } from '../utils/practiceExamMigration.js'

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

// GET /api/practice-subjects[?examId=...][&parentId=...] — same list for every
// logged-in user (this isn't per-user data, unlike MockExam). examId narrows it
// to one exam's subjects; parentId narrows it to the folders of one subject.
// Includes a published-test count per subject for the cards:
//   testCount    = subject ke apne tests + uske saare folders ke tests
//   ownTestCount = sirf us subject/folder me seedhe rakhe tests
//   folderCount  = is subject ke andar kitne folders hai
router.get('/', async (req, res) => {
  try {
    await ensureExamsMigrated()
    const filter = {}
    if (req.query.examId) filter.examId = req.query.examId
    if (req.query.parentId) filter.parentId = req.query.parentId
    // N alag countDocuments ki jagah ek hi aggregate (parallel me subjects ke saath)
    const [subjects, counts] = await Promise.all([
      PracticeSubject.find(filter).sort({ order: 1, createdAt: 1 }).lean(),
      PracticeTest.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: '$subjectId', n: { $sum: 1 } } },
      ]),
    ])
    const countBySubject = new Map(counts.map((c) => [String(c._id), c.n]))

    // Folder rollup: parent ke count me uske folders ke tests bhi jodo.
    // (parentId filter ke saath folders khud hi list me hote hai, isliye
    // rollup ke liye alag se saare folders ka parent map nikalte hai.)
    const allFolders = await PracticeSubject.find({ parentId: { $ne: null } }).select('_id parentId').lean()
    const rollup = new Map()   // parentId -> { tests, folders }
    for (const f of allFolders) {
      const k = String(f.parentId)
      const cur = rollup.get(k) || { tests: 0, folders: 0 }
      cur.tests += countBySubject.get(String(f._id)) || 0
      cur.folders += 1
      rollup.set(k, cur)
    }

    res.json(subjects.map((s) => {
      const own = countBySubject.get(String(s._id)) || 0
      const r = rollup.get(String(s._id)) || { tests: 0, folders: 0 }
      return { ...s, ownTestCount: own, testCount: own + r.tests, folderCount: r.folders }
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const subject = await PracticeSubject.findById(req.params.id).lean()
    if (!subject) return res.status(404).json({ error: 'Not found' })
    // Folder hai to parent ka naam bhi bhej do (breadcrumb / back button ke liye)
    if (subject.parentId) {
      const parent = await PracticeSubject.findById(subject.parentId).select('name').lean()
      subject.parentName = parent?.name || ''
    }
    res.json(subject)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/', practiceAdminMiddleware, async (req, res) => {
  try {
    const { name, examId, parentId, isOptional, color, order } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Subject name required hai' })

    let exam = null
    let parent = null
    if (parentId) {
      // Folder: exam parent subject se aata hai, folder ke andar folder allowed nahi
      parent = await PracticeSubject.findById(parentId)
      if (!parent) return res.status(404).json({ error: 'Parent subject nahi mila' })
      if (parent.parentId) return res.status(400).json({ error: 'Folder ke andar folder nahi ban sakta' })
      exam = await PracticeExam.findById(parent.examId)
    } else {
      if (!examId) return res.status(400).json({ error: 'examId required hai — pehle exam select karo' })
      exam = await PracticeExam.findById(examId)
    }
    if (!exam) return res.status(404).json({ error: 'Exam nahi mila' })

    const subject = await PracticeSubject.create({
      name: name.trim(),
      examId: exam._id,
      parentId: parent ? parent._id : null,
      isOptional: !!isOptional,
      examCategory: exam.name, // legacy mirror, harmless
      color: color || parent?.color || '#f97316',
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
    for (const key of ['name', 'color', 'order']) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    if (req.body.isOptional !== undefined) updates.isOptional = !!req.body.isOptional
    if (req.body.examId !== undefined) {
      const exam = await PracticeExam.findById(req.body.examId)
      if (!exam) return res.status(404).json({ error: 'Exam nahi mila' })
      updates.examId = exam._id
      updates.examCategory = exam.name
    }
    const subject = await PracticeSubject.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!subject) return res.status(404).json({ error: 'Not found' })
    // Subject dusre exam me move hua to uske folders bhi saath chalein
    if (updates.examId) {
      await PracticeSubject.updateMany(
        { parentId: subject._id },
        { $set: { examId: updates.examId, examCategory: updates.examCategory } },
      )
    }
    res.json(subject)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE — blocked if it still has tests (or folders), so a subject can't
// silently orphan published papers. Admin has to delete/move those first.
router.delete('/:id', practiceAdminMiddleware, async (req, res) => {
  try {
    const folderCount = await PracticeSubject.countDocuments({ parentId: req.params.id })
    if (folderCount > 0) return res.status(400).json({ error: `Is subject mein ${folderCount} folder(s) hai — pehle unhe delete karo` })
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