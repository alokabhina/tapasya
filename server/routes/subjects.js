import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Subject from '../models/Subject.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/',     async (req, res) => {
  const subjects = await Subject.find({ userId: req.user.id }).sort('createdAt')
  res.json(subjects)
})
router.post('/',    async (req, res) => {
  const subject = await Subject.create({ ...req.body, userId: req.user.id })
  res.json(subject)
})
router.put('/:id',  async (req, res) => {
  const subject = await Subject.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id }, req.body, { new: true })
  res.json(subject)
})
router.delete('/:id', async (req, res) => {
  await Subject.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
  res.json({ ok: true })
})

export default router