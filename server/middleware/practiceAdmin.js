// server/middleware/practiceAdmin.js
// Access control for Practice Test admin actions (subject CRUD, test
// upload/edit/delete, leaderboard). Same two people as middleware/caAdmin.js
// — the main app admin (ADMIN_EMAIL) and alokabhinandan123@gmail.com — but
// kept as its own file (not importing caAdmin.js) so this feature's access
// list can diverge later without touching Current Affairs' admin gate.
import User from '../models/User.js'
import { ADMIN_EMAIL } from './admin.js'

const ALLOWED_EMAILS = [
  ADMIN_EMAIL.toLowerCase(),
  'alokabhinandan123@gmail.com',
]

// Use this to gate a route to admin-only.
export default async function practiceAdminMiddleware(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('email')
    if (!user || !ALLOWED_EMAILS.includes(user.email?.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access only' })
    }
    req.practiceAdminEmail = user.email.toLowerCase()
    next()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// Non-blocking check — frontend uses this to decide whether to show admin
// buttons (Upload Test, Leaderboard link) without 403-ing regular users.
// Result 5 min cache hota hai (email list static hai) — landing page pe
// har baar DB hit nahi.
const adminCache = new Map() // userId -> { at, value }
export async function isPracticeAdmin(userId) {
  const key = String(userId)
  const hit = adminCache.get(key)
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.value
  const user = await User.findById(userId).select('email').lean()
  const value = !!user && ALLOWED_EMAILS.includes(user.email?.toLowerCase())
  adminCache.set(key, { at: Date.now(), value })
  return value
}