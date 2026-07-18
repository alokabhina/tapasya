import express from 'express'
import authMiddleware from '../middleware/auth.js'
import adminMiddleware from '../middleware/admin.js'
import User from '../models/User.js'
import Group from '../models/Group.js'
import Session from '../models/Session.js'
import Todo from '../models/Todo.js'
import Badge from '../models/Badge.js'
import Exam from '../models/Exam.js'
import UserGameProfile from '../models/UserGameProfile.js'
import UserVocabProgress from '../models/UserVocabProgress.js'
import UserVocabStreak from '../models/UserVocabStreak.js'
import GroupMessage from '../models/GroupMessage.js'
import { getStudyDayString } from '../utils/dayBoundary.js'

const router = express.Router()

// Har route pe pehle login check, phir admin-email check
router.use(authMiddleware, adminMiddleware)

// ── GET /api/admin/overview — dashboard summary cards ───────────────────────
router.get('/overview', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isGuest: { $ne: true } })
    const totalGuests = await User.countDocuments({ isGuest: true })
    const totalGroups = await Group.countDocuments()
    const bannedCount = await User.countDocuments({ isBanned: true })

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo }, isGuest: { $ne: true } })

    const todayStr = getStudyDayString()
    const activeTodayIds = await Session.distinct('userId', { date: todayStr })

    const totalSecondsAgg = await Session.aggregate([
      { $group: { _id: null, total: { $sum: '$duration' } } }
    ])
    const totalStudySeconds = totalSecondsAgg[0]?.total || 0

    res.json({
      totalUsers,
      totalGuests,
      totalGroups,
      bannedCount,
      newUsersThisWeek,
      activeToday: activeTodayIds.length,
      totalStudyHours: Math.round(totalStudySeconds / 3600),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /api/admin/users — list all members with basic stats ───────────────
router.get('/users', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query
    const query = {}
    if (search.trim()) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    const skip = (Number(page) - 1) * Number(limit)
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ])

    // Har user ke liye total study seconds + last active date nikalo
    const userIds = users.map(u => u._id)
    const sessionAgg = await Session.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', totalSeconds: { $sum: '$duration' }, lastActive: { $max: '$date' } } }
    ])
    const statsMap = {}
    sessionAgg.forEach(s => { statsMap[s._id.toString()] = s })

    const enriched = users.map(u => ({
      ...u.toObject(),
      totalSeconds: statsMap[u._id.toString()]?.totalSeconds || 0,
      lastActive: statsMap[u._id.toString()]?.lastActive || null,
    }))

    res.json({ users: enriched, total, page: Number(page), limit: Number(limit) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /api/admin/users/:id — full profile detail ──────────────────────────
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const user = await User.findById(id).select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })

    const [sessions, todos, badges, exams, gameProfile, vocabStreak, vocabProgressCount, groups] = await Promise.all([
      Session.find({ userId: id }).sort({ createdAt: -1 }).limit(50),
      Todo.find({ userId: id }).sort({ createdAt: -1 }).limit(50),
      Badge.find({ userId: id }),
      Exam.find({ userId: id }),
      UserGameProfile.findOne({ userId: id }),
      UserVocabStreak.findOne({ userId: id }),
      UserVocabProgress.countDocuments({ userId: id }),
      Group.find({ 'members.userId': id }).select('name inviteCode members'),
    ])

    const totalSecondsAgg = await Session.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, total: { $sum: '$duration' }, count: { $sum: 1 } } }
    ])

    res.json({
      user,
      stats: {
        totalStudySeconds: totalSecondsAgg[0]?.total || 0,
        totalSessions: totalSecondsAgg[0]?.count || 0,
        todosTotal: await Todo.countDocuments({ userId: id }),
        todosDone: await Todo.countDocuments({ userId: id, done: true }),
        vocabWordsTracked: vocabProgressCount,
      },
      recentSessions: sessions,
      recentTodos: todos,
      badges,
      exams,
      gameProfile,
      vocabStreak,
      groups: groups.map(g => ({
        _id: g._id,
        name: g.name,
        inviteCode: g.inviteCode,
        memberCount: g.members.length,
      })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /api/admin/users/:id/ban — ban or unban ─────────────────────────────
router.put('/users/:id/ban', async (req, res) => {
  try {
    const { banned, reason = '' } = req.body
    if (req.params.id === req.adminUser._id.toString()) {
      return res.status(400).json({ error: 'Cannot ban yourself' })
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      banned
        ? { isBanned: true, banReason: reason, bannedAt: new Date(), timeoutUntil: null }
        : { isBanned: false, banReason: '', bannedAt: null },
      { new: true }
    ).select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /api/admin/users/:id/timeout — temporary suspension ─────────────────
router.put('/users/:id/timeout', async (req, res) => {
  try {
    const { hours, reason = '' } = req.body // hours = null/0 clears timeout
    if (req.params.id === req.adminUser._id.toString()) {
      return res.status(400).json({ error: 'Cannot timeout yourself' })
    }
    const timeoutUntil = hours ? new Date(Date.now() + Number(hours) * 60 * 60 * 1000) : null
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { timeoutUntil, banReason: hours ? reason : '' },
      { new: true }
    ).select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── PUT /api/admin/users/:id — edit basic profile (name) ────────────────────
router.put('/users/:id', async (req, res) => {
  try {
    const { displayName } = req.body
    const updates = {}
    if (displayName !== undefined) updates.displayName = displayName.trim()
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /api/admin/users/:id — permanently remove a user + their data ────
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    if (id === req.adminUser._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete yourself' })
    }
    const user = await User.findById(id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    await Promise.all([
      Session.deleteMany({ userId: id }),
      Todo.deleteMany({ userId: id }),
      Badge.deleteMany({ userId: id }),
      Exam.deleteMany({ userId: id }),
      UserGameProfile.deleteMany({ userId: id }),
      UserVocabProgress.deleteMany({ userId: id }),
      UserVocabStreak.deleteMany({ userId: id }),
      Group.updateMany({ 'members.userId': id }, { $pull: { members: { userId: id } } }),
      User.findByIdAndDelete(id),
    ])

    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /api/admin/groups — all groups in the app ───────────────────────────
router.get('/groups', async (req, res) => {
  try {
    const groups = await Group.find().sort({ createdAt: -1 })
    const enriched = groups.map(g => ({
      _id: g._id,
      name: g.name,
      inviteCode: g.inviteCode,
      ownerUserId: g.ownerUserId,
      memberCount: g.members.length,
      members: g.members.map(m => ({ userId: m.userId, displayName: m.displayName, totalSeconds: m.totalSeconds })),
      createdAt: g.createdAt,
    }))
    res.json(enriched)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── DELETE /api/admin/groups/:id — remove a group entirely ──────────────────
router.delete('/groups/:id', async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    await GroupMessage.deleteMany({ groupId: req.params.id })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router