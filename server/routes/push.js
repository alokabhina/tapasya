// server/routes/push.js
// Web Push (VAPID) — asli background notifications. Ye client-side setTimeout
// wale reminders se alag hai: yeh server se trigger hoti hai, isliye app
// band/closed hone par bhi deliver hoti hai (jab tak browser/OS ne push
// permission allow ki ho).

import express from 'express'
import authMiddleware from '../middleware/auth.js'
import PushSubscription from '../models/PushSubscription.js'
import User from '../models/User.js'
import Session from '../models/Session.js'
import { ensureConfigured, getPublicKey, sendPush } from '../utils/webpush.js'

const router = express.Router()

// GET /api/push/vapid-public-key — public, client subscribe karte time isko use karta hai
router.get('/vapid-public-key', (req, res) => {
  const key = getPublicKey()
  if (!key) return res.status(503).json({ error: 'Push not configured on server' })
  res.json({ publicKey: key })
})

router.use(authMiddleware)

// POST /api/push/subscribe — browser se mila subscription object save karo
router.post('/subscribe', async (req, res) => {
  try {
    const { endpoint, keys } = req.body
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return res.status(400).json({ error: 'Invalid subscription' })

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId: req.user.id, endpoint, keys },
      { upsert: true, new: true }
    )
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/push/unsubscribe
router.post('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body
    if (endpoint) await PushSubscription.deleteOne({ endpoint, userId: req.user.id })
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/push/test — apne aap ko ek test push bhejo (app band karke check karo)
router.post('/test', async (req, res) => {
  try {
    const subs = await PushSubscription.find({ userId: req.user.id })
    if (!subs.length) return res.status(404).json({ error: 'No push subscription found — pehle notification permission allow karo' })

    let sent = 0
    for (const sub of subs) {
      try {
        await sendPush(sub, { title: '🎯 Tapasya', body: 'Ye ek test push hai — agar ye dikha to background push working hai!', url: '/' })
        sent++
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await PushSubscription.deleteOne({ _id: sub._id })
      }
    }
    res.json({ ok: true, sent })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router


// ── CRON-DRIVEN BACKGROUND CHECKER ──────────────────────────────────────────
// Mounted separately (no auth middleware) — protected by Authorization/secret header.
// 6 alag daily cron jobs (Vercel Hobby plan-compatible: per-job once/day) ye
// endpoint ko din bhar alag-alag slots pe hit karte hain — taaki notifications
// app band hone par bhi aayein, lekin spread out rahein, ek saath bunch na ho.
export const cronRouter = express.Router()

// Message pools — ek slot pe har baar same line repeat na ho isliye random pick
const MESSAGE_POOL = {
  morning: [
    { title: '🌅 Good morning', body: 'Aaj ka pehla session shuru karo, fresh dimaag best hota hai.' },
    { title: '☀️ Naya din', body: 'Aaj kya padhna hai pehle se decide kar lo.' },
  ],
  midmorning: [
    { title: '📖 Focus time', body: 'Ek chhota 25-min session abhi kar lo.' },
    { title: '🎯 Reminder', body: 'Subah ka momentum maintain karo.' },
  ],
  afternoon: [
    { title: '⏳ Halfway there', body: 'Din aadha nikal gaya, ek session ho gaya kya?' },
    { title: '💪 Keep going', body: 'Thoda break ke baad wapas focus mode mein aao.' },
  ],
  lateafternoon: [
    { title: '🌤️ Shaam aa rahi hai', body: 'Aaj ka target track pe hai ya nahi, ek baar check karo.' },
    { title: '📚 Ek aur session?', body: 'Thodi der padhai kar lo, momentum mat todo.' },
  ],
  evening: [
    { title: '🌆 Evening check-in', body: 'Aaj kitna padha — app khol ke dekho.' },
    { title: '🔥 Streak mat todo', body: 'Aaj ka session abhi bhi ho sakta hai.' },
  ],
  night: [
    { title: '🌙 Last call', body: 'Sone se pehle ek chhota revision session.' },
    { title: '✨ Aaj achha kiya', body: 'Kal ke liye plan bana lo.' },
  ],
}
const VALID_SLOTS = Object.keys(MESSAGE_POOL)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

cronRouter.all('/check', async (req, res) => {
  // Vercel Cron automatically sends "Authorization: Bearer <CRON_SECRET>"
  // when CRON_SECRET env var is set on the project. Fallback to x-cron-secret
  // header for other cron providers (cron-job.org, GitHub Actions, etc).
  const authHeader = req.headers['authorization']
  const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const secret = bearerSecret || req.headers['x-cron-secret']
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return res.status(401).json({ error: 'Unauthorized' })

  if (!ensureConfigured()) return res.status(503).json({ error: 'Push not configured' })

  const slot = req.query.slot || req.body?.slot
  if (!VALID_SLOTS.includes(slot))
    return res.status(400).json({ error: `Invalid/missing slot. Use one of: ${VALID_SLOTS.join(', ')}` })

  try {
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

    const subs = await PushSubscription.find({})
    let sentCount = 0

    for (const sub of subs) {
      // Har slot apna khud ka per-day flag track karta hai isliye ek saath
      // bunch hoke nahi aate, din bhar spread rehte hain
      if (sub.sentSlots?.get(slot) === todayStr) continue

      const user = await User.findById(sub.userId)
      if (!user) continue

      // Sirf "night" slot pe goal-completion check karo — agar already
      // goal pura ho chuka hai to spam mat karo
      if (slot === 'night' && user.dailyGoalSeconds > 0) {
        const todaySessions = await Session.find({ userId: sub.userId, date: todayStr }).lean()
        const todaySeconds  = todaySessions.reduce((s, x) => s + (x.duration || 0), 0)
        if (todaySeconds >= user.dailyGoalSeconds) continue
      }

      const name = (user.displayName && user.displayName !== 'Aspirant') ? user.displayName.split(' ')[0] : null
      const msg  = pick(MESSAGE_POOL[slot])

      try {
        await sendPush(sub, {
          title: name ? `${msg.title} — ${name}` : msg.title,
          body: msg.body,
          url: '/timer',
        })
        sub.sentSlots.set(slot, todayStr)
        await sub.save()
        sentCount++
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) await PushSubscription.deleteOne({ _id: sub._id })
      }
    }

    res.json({ ok: true, slot, checked: subs.length, sent: sentCount })
  } catch (e) { res.status(500).json({ error: e.message }) }
})