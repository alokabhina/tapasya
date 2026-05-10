// ✅ FIX: This file was completely empty — all routes implemented
import express from 'express'
import authMiddleware from '../middleware/auth.js'
import Group from '../models/Group.js'
import User from '../models/User.js'
import crypto from 'crypto'

const router = express.Router()
router.use(authMiddleware)

function generateCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase() // 6-char invite code
}

// GET /api/groups/mine — get current user's group
router.get('/mine', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user.groupId) return res.json(null)
    const group = await Group.findById(user.groupId)
    if (!group) {
      // Group deleted hoga — user ka groupId clear karo
      await User.findByIdAndUpdate(req.user.id, { $unset: { groupId: 1 } })
      return res.json(null)
    }
    res.json(group)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /api/groups/:id/members — get leaderboard members
router.get('/:id/members', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    // Sort by weeklyHours desc
    const sorted = [...group.members].sort((a, b) => b.weeklyHours - a.weeklyHours)
    res.json(sorted)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/groups — create new group
router.post('/', async (req, res) => {
  try {
    const { name } = req.body
    const user = await User.findById(req.user.id)
    const inviteCode = generateCode()
    const group = await Group.create({
      name,
      ownerUserId: req.user.id,
      inviteCode,
      members: [{
        userId: req.user.id,
        displayName: user.displayName,
        weeklyHours: 0,
        totalHours: 0,
      }],
    })
    await User.findByIdAndUpdate(req.user.id, { groupId: group._id })
    res.json({ groupId: group._id, inviteCode: group.inviteCode, group })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /api/groups/join — join by invite code
router.post('/join', async (req, res) => {
  try {
    const { code } = req.body
    const group = await Group.findOne({ inviteCode: code.toUpperCase() })
    if (!group) return res.status(404).json({ error: 'Invalid invite code' })

    const user = await User.findById(req.user.id)
    const alreadyMember = group.members.some(m => m.userId.toString() === req.user.id)
    if (!alreadyMember) {
      group.members.push({
        userId: req.user.id,
        displayName: user.displayName,
        weeklyHours: 0,
        totalHours: 0,
      })
      await group.save()
    }
    await User.findByIdAndUpdate(req.user.id, { groupId: group._id })
    res.json({ groupId: group._id, group })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// DELETE /api/groups/:id/leave — leave group
router.delete('/:id/leave', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    group.members = group.members.filter(m => m.userId.toString() !== req.user.id)
    await group.save()
    await User.findByIdAndUpdate(req.user.id, { $unset: { groupId: 1 } })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PUT /api/groups/:id/hours — add session hours to member
router.put('/:id/hours', async (req, res) => {
  try {
    const { addSeconds } = req.body
    const group = await Group.findById(req.params.id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    const member = group.members.find(m => m.userId.toString() === req.user.id)
    if (member) {
      const addHours = addSeconds / 3600
      member.weeklyHours = (member.weeklyHours || 0) + addHours
      member.totalHours  = (member.totalHours  || 0) + addHours
      await group.save()
    }
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
