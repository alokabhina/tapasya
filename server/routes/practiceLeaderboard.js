// server/routes/practiceLeaderboard.js
// Admin-only (plan doc Section 8.4) — never exposed to regular test-takers,
// hence practiceAdminMiddleware on the whole router, not per-route.
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import practiceAdminMiddleware from '../middleware/practiceAdmin.js'
import PracticeAttempt from '../models/PracticeAttempt.js'
import User from '../models/User.js'

const router = express.Router()
router.use(authMiddleware, practiceAdminMiddleware)

// GET /api/practice-leaderboard/:testId — ranked by each user's BEST score
// (reattempts shouldn't let one user occupy multiple leaderboard rows).
router.get('/:testId', async (req, res) => {
  try {
    const attempts = await PracticeAttempt.find({ testId: req.params.testId, status: { $ne: 'in-progress' } })
      .select('userId attemptNumber overall submittedAt')
      .lean()

    const bestByUser = new Map()
    const attemptCountByUser = new Map()
    for (const a of attempts) {
      const key = String(a.userId)
      attemptCountByUser.set(key, (attemptCountByUser.get(key) || 0) + 1)
      const current = bestByUser.get(key)
      if (!current || (a.overall?.score ?? -Infinity) > (current.overall?.score ?? -Infinity)) {
        bestByUser.set(key, a)
      }
    }

    const userIds = [...bestByUser.keys()]
    const users = await User.find({ _id: { $in: userIds } }).select('displayName email photoURL').lean()
    const userMap = new Map(users.map((u) => [String(u._id), u]))

    const leaderboard = [...bestByUser.values()]
      .map((a) => ({
        userId: a.userId,
        displayName: userMap.get(String(a.userId))?.displayName || 'Aspirant',
        photoURL: userMap.get(String(a.userId))?.photoURL || null,
        score: a.overall?.score ?? null,
        accuracy: a.overall?.accuracy ?? null,
        timeTakenSec: a.overall?.totalTimeSec ?? null,
        attemptsCount: attemptCountByUser.get(String(a.userId)) || 1,
        submittedAt: a.submittedAt,
      }))
      .sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity))
      .map((row, i) => ({ rank: i + 1, ...row }))

    res.json(leaderboard)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
