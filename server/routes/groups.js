// server/routes/groups.js
// Features: create/join/leave/delete groups, admin kick, group chat with rate limits

import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Group from '../models/Group.js'
import GroupMessage from '../models/GroupMessage.js'
import User from '../models/User.js'
import crypto from 'crypto'

const router = express.Router()
router.use(authMiddleware)

function generateCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

// GET /api/groups/mine
router.get('/mine', async (req, res) => {
  try {
    const groups = await Group.find({ 'members.userId': req.user.id })
    res.json(groups)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/groups/:id
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    res.json(group)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/groups/:id/members
router.get('/:id/members', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    const sorted = [...group.members].sort((a, b) => (b.weeklySeconds || 0) - (a.weeklySeconds || 0))
    res.json(sorted)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/groups — create
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Group naam required' })
    const user = await User.findById(req.user.id)
    const group = await Group.create({
      name: name.trim(),
      ownerUserId: req.user.id,
      inviteCode: generateCode(),
      members: [{ userId: req.user.id, displayName: user?.displayName || 'Anonymous', photoURL: user?.photoURL || null, weeklySeconds: 0, totalSeconds: 0 }],
    })
    res.json({ groupId: group._id, inviteCode: group.inviteCode, group })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/groups/join
router.post('/join', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Code required' })
    const group = await Group.findOne({ inviteCode: code.trim().toUpperCase() })
    if (!group) return res.status(404).json({ error: 'Invalid invite code' })
    const user = await User.findById(req.user.id)
    if (!group.members.some(m => m.userId.toString() === req.user.id)) {
      group.members.push({ userId: req.user.id, displayName: user?.displayName || 'Anonymous', photoURL: user?.photoURL || null, weeklySeconds: 0, totalSeconds: 0 })
      await group.save()
    }
    res.json({ groupId: group._id, group })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/groups/:id/leave — non-admin leaves
router.delete('/:id/leave', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    if (group.ownerUserId?.toString() === req.user.id)
      return res.status(400).json({ error: 'Admin cannot leave — delete the group instead' })
    group.members = group.members.filter(m => m.userId.toString() !== req.user.id)
    if (group.members.length === 0) { await Group.findByIdAndDelete(req.params.id) }
    else { await group.save() }
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/groups/:id — admin deletes entire group
router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    if (group.ownerUserId?.toString() !== req.user.id)
      return res.status(403).json({ error: 'Only admin can delete this group' })
    await Group.findByIdAndDelete(req.params.id)
    await GroupMessage.deleteMany({ groupId: req.params.id })
    res.json({ ok: true, deleted: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// DELETE /api/groups/:id/kick/:userId — admin kicks member
router.delete('/:id/kick/:userId', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    if (group.ownerUserId?.toString() !== req.user.id)
      return res.status(403).json({ error: 'Only admin can kick members' })
    if (req.params.userId === req.user.id)
      return res.status(400).json({ error: 'Admin cannot kick themselves' })
    group.members = group.members.filter(m => m.userId.toString() !== req.params.userId)
    await group.save()
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// GET /api/groups/:id/members/:userId/stats — any group member can view a teammate's stats
router.get('/:id/members/:userId/stats', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })

    // Requester must be a member
    if (!group.members.some(m => m.userId.toString() === req.user.id))
      return res.status(403).json({ error: 'Not a member of this group' })

    // Target must be a member
    const targetMember = group.members.find(m => m.userId.toString() === req.params.userId)
    if (!targetMember) return res.status(404).json({ error: 'Member not found in group' })

    // Fetch last 90 days of sessions for the target user
    const Session = (await import('../models/Session.js')).default
    const today = new Date()
    const ninetyDaysAgo = new Date(today)
    ninetyDaysAgo.setDate(today.getDate() - 89)
    const pad = n => String(n).padStart(2, '0')
    const toDateStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const startStr = toDateStr(ninetyDaysAgo)
    const endStr   = toDateStr(today)

    const sessions = await Session.find({
      userId: req.params.userId,
      date:   { $gte: startStr, $lte: endStr },
    }).lean()

    // Build heatmap { "YYYY-MM-DD": totalSeconds }
    const heatmap = {}
    const subjectMap = {}
    sessions.forEach(s => {
      if (s.date) heatmap[s.date] = (heatmap[s.date] || 0) + (s.duration || 0)
      if (s.subjectName) {
        if (!subjectMap[s.subjectName])
          subjectMap[s.subjectName] = { name: s.subjectName, color: s.subjectColor || '#f97316', seconds: 0 }
        subjectMap[s.subjectName].seconds += (s.duration || 0)
      }
    })

    const activeDays      = Object.values(heatmap).filter(v => v > 0).length
    const recentTotal     = Object.values(heatmap).reduce((a, b) => a + b, 0)
    const subjectBreakdown = Object.values(subjectMap).sort((a, b) => b.seconds - a.seconds)

    // Simple streak calculation
    let streak = 0
    const cur = new Date(today)
    while (true) {
      const key = toDateStr(cur)
      if (heatmap[key] > 0) { streak++; cur.setDate(cur.getDate() - 1) }
      else break
    }

    res.json({
      member: targetMember,
      heatmap,
      subjectBreakdown,
      weeklySeconds:  targetMember.weeklySeconds  || 0,
      totalSeconds:   targetMember.totalSeconds   || 0,
      recentTotal,
      activeDays,
      streak,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/groups/:id/hours
router.put('/:id/hours', async (req, res) => {
  try {
    const { addSeconds } = req.body
    if (!addSeconds || addSeconds <= 0) return res.json({ ok: true })
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    const member = group.members.find(m => m.userId.toString() === req.user.id)
    if (member) {
      member.weeklySeconds = (member.weeklySeconds || 0) + addSeconds
      member.totalSeconds  = (member.totalSeconds  || 0) + addSeconds
      await group.save()
    }
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── CHAT ──────────────────────────────────────────────────────────────────────

// GET /api/groups/:id/messages
router.get('/:id/messages', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    if (!group.members.some(m => m.userId.toString() === req.user.id))
      return res.status(403).json({ error: 'Not a member' })
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const query = { groupId: req.params.id }
    if (req.query.before) query.createdAt = { $lt: new Date(req.query.before) }
    const messages = await GroupMessage.find(query).sort({ createdAt: -1 }).limit(limit).lean()
    res.json(messages.reverse())
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/groups/:id/messages
router.post('/:id/messages', async (req, res) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'Message required' })
    if (text.trim().length > 500) return res.status(400).json({ error: 'Max 500 chars' })
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    if (!group.members.some(m => m.userId.toString() === req.user.id))
      return res.status(403).json({ error: 'Not a member' })
    const isAdmin = group.ownerUserId?.toString() === req.user.id
    if (!isAdmin) {
      const now = new Date()
      const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
      const todayCount = await GroupMessage.countDocuments({ groupId: req.params.id, userId: req.user.id, createdAt: { $gte: startOfDay } })
      if (todayCount >= 30) return res.status(429).json({ error: 'Daily limit reached (30 messages/day)' })
      const lastMsg = await GroupMessage.findOne({ groupId: req.params.id, userId: req.user.id }).sort({ createdAt: -1 })
      if (lastMsg) {
        const wait = Math.ceil(10 - (now - lastMsg.createdAt) / 1000)
        if (wait > 0) return res.status(429).json({ error: `Wait ${wait}s`, waitSeconds: wait })
      }
    }
    const user = await User.findById(req.user.id)
    const msg = await GroupMessage.create({ groupId: req.params.id, userId: req.user.id, displayName: user?.displayName || 'Anonymous', photoURL: user?.photoURL || null, text: text.trim(), isAdmin })
    res.json(msg)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router