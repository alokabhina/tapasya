import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Session from '../models/Session.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/', async (req, res) => {
  const { startDate, endDate } = req.query
  const filter = { userId: req.user.id }
  if (startDate) filter.date = { $gte: startDate }
  if (endDate)   filter.date = { ...filter.date, $lte: endDate }
  const sessions = await Session.find(filter).sort('-date')
  res.json(sessions)
})
router.post('/',     async (req, res) => {
  const session = await Session.create({ ...req.body, userId: req.user.id })
  res.json(session)
})
router.put('/:id',   async (req, res) => {
  const session = await Session.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id }, req.body, { new: true })
  res.json(session)
})
router.delete('/:id', async (req, res) => {
  await Session.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
  res.json({ ok: true })
})

export default router