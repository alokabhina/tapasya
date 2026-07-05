import User from '../models/User.js'

// Sirf yeh email admin panel access kar sakta hai — hardcoded for security
// (env var se override nahi hota taaki galti se kisi aur email ko access na mil jaaye)
export const ADMIN_EMAIL = 'alokabhiii9@gmail.com'

// Ye middleware authMiddleware ke BAAD lagana hai (req.user.id chahiye)
export default async function adminMiddleware(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('email isBanned')
    if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return res.status(403).json({ error: 'Admin access only' })
    }
    req.adminUser = user
    next()
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}