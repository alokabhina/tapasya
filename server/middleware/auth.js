import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export default async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)

    // Ban / timeout check — admin panel se lagaya gaya restriction
    const user = await User.findById(req.user.id).select('isBanned banReason timeoutUntil')
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