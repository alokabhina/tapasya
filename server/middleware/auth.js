import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Har API call pe User.findById karna ek extra DB round-trip tha (serverless pe
// ye sabse mehenga hissa hota hai). Ban/timeout status ab 30s tak memory me
// cache hota hai — admin ban lagaye to max 30s me effect, warm instance pe.
const STATUS_TTL_MS = 30_000
const statusCache = new Map() // userId -> { at, user }

async function getRestrictionStatus(userId) {
  const hit = statusCache.get(userId)
  if (hit && Date.now() - hit.at < STATUS_TTL_MS) return hit.user
  const user = await User.findById(userId).select('isBanned banReason timeoutUntil').lean()
  statusCache.set(userId, { at: Date.now(), user })
  if (statusCache.size > 500) statusCache.delete(statusCache.keys().next().value)
  return user
}

export default async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)

    // Ban / timeout check — admin panel se lagaya gaya restriction
    const user = await getRestrictionStatus(req.user.id)
    if (user) {
      if (user.isBanned) {
        return res.status(403).json({ error: 'ACCOUNT_BANNED', reason: user.banReason || 'Your account has been banned.' })
      }
      if (user.timeoutUntil && new Date(user.timeoutUntil) > new Date()) {
        return res.status(403).json({ error: 'ACCOUNT_TIMEOUT', until: user.timeoutUntil, reason: user.banReason || 'Your account is temporarily suspended.' })
      }
    }

    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}