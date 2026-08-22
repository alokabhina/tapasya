// server/middleware/caAdmin.js
// Access control for Current Affairs + Class Notes admin actions (add/edit/
// delete/bulk-import). Explicitly two people, per request: the main app
// admin (ADMIN_EMAIL, reused from middleware/admin.js) and the PDF-library
// admin (alokabhinandan123@gmail.com, same constant as routes/pdfs.js's
// PDF_ADMIN_EMAIL — kept literal here too, to avoid coupling this file to
// pdfs.js just for one string).
import User from '../models/User.js'
import { ADMIN_EMAIL } from './admin.js'

const ALLOWED_EMAILS = [
  ADMIN_EMAIL.toLowerCase(),
  'alokabhinandan123@gmail.com',
]

// Use this to gate a route to admin-only.
export default async function caAdminMiddleware(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('email')
    if (!user || !ALLOWED_EMAILS.includes(user.email?.toLowerCase())) {
      return res.status(403).json({ error: 'Admin access only' })
    }
    req.caAdminEmail = user.email.toLowerCase()
    next()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

// Use this where a route needs to behave differently for admins vs regular
// users but shouldn't 403 non-admins outright (e.g. "am I allowed to see
// the edit buttons" checks from the frontend).
export async function isCaAdmin(userId) {
  const user = await User.findById(userId).select('email')
  return !!user && ALLOWED_EMAILS.includes(user.email?.toLowerCase())
}
