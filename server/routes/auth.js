import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import User from '../models/User.js'
import Group from '../models/Group.js'
import authMiddleware from '../middleware/auth.js'

const router = express.Router()
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
const sign = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' })

router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ error: 'Email already in use' })
    const hash = await bcrypt.hash(password, 10)
    const user = await User.create({ email, password: hash, displayName })
    res.json({ token: sign(user), user: { id: user._id, displayName: user.displayName, email: user.email } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' })
    if (user.isBanned) return res.status(403).json({ error: 'ACCOUNT_BANNED', reason: user.banReason || 'Your account has been banned.' })
    if (user.timeoutUntil && new Date(user.timeoutUntil) > new Date())
      return res.status(403).json({ error: 'ACCOUNT_TIMEOUT', until: user.timeoutUntil, reason: user.banReason || 'Your account is temporarily suspended.' })
    res.json({ token: sign(user), user: { id: user._id, displayName: user.displayName, email: user.email, photoURL: user.photoURL } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body
    if (!credential) return res.status(400).json({ error: 'Google credential missing' })
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()
    let user = await User.findOne({ email: payload.email })
    if (!user) {
      user = await User.create({ email: payload.email, displayName: payload.name, photoURL: payload.picture, googleId: payload.sub })
    } else {
      if (payload.picture && user.photoURL !== payload.picture) { user.photoURL = payload.picture; await user.save() }
    }
    if (user.isBanned) return res.status(403).json({ error: 'ACCOUNT_BANNED', reason: user.banReason || 'Your account has been banned.' })
    if (user.timeoutUntil && new Date(user.timeoutUntil) > new Date())
      return res.status(403).json({ error: 'ACCOUNT_TIMEOUT', until: user.timeoutUntil, reason: user.banReason || 'Your account is temporarily suspended.' })
    res.json({ token: sign(user), user: { id: user._id, displayName: user.displayName, email: user.email, photoURL: user.photoURL } })
  } catch (e) { res.status(401).json({ error: 'Google sign-in failed: ' + e.message }) }
})

router.post('/guest', async (req, res) => {
  try {
    const user = await User.create({ displayName: 'Guest', isGuest: true })
    res.json({ token: sign(user), user: { id: user._id, displayName: 'Guest', isGuest: true } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password')
  res.json(user)
})

// FIX: Naam update route
router.put('/name', authMiddleware, async (req, res) => {
  try {
    const { displayName } = req.body
    if (!displayName?.trim()) return res.status(400).json({ error: 'Name required' })
    const user = await User.findByIdAndUpdate(req.user.id, { displayName: displayName.trim() }, { new: true }).select('-password')
    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /auth/profile — update displayName and/or photoURL, sync across all groups
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { displayName, photoURL } = req.body
    const updates = {}
    if (displayName !== undefined) updates.displayName = displayName?.trim() || 'Aspirant'
    if (photoURL !== undefined) updates.photoURL = photoURL  // null = remove, string = set

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password')

    // Sync displayName + photoURL into every group this user is a member of
    if (Object.keys(updates).length > 0) {
      const groups = await Group.find({ 'members.userId': req.user.id })
      await Promise.all(groups.map(async (group) => {
        let changed = false
        group.members.forEach(m => {
          if (m.userId.toString() === req.user.id) {
            if (updates.displayName !== undefined) { m.displayName = updates.displayName; changed = true }
            if (updates.photoURL !== undefined) { m.photoURL = updates.photoURL; changed = true }
          }
        })
        if (changed) await group.save()
      }))
    }

    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router