// ✅ FIX: Complete rewrite — was using Firebase Firestore, now uses REST API
import api from './client'

// Saare unlocked badges fetch karo
export async function getBadges() {
  const { data } = await api.get('/badges')
  return data // [{ _id, badgeId, userId, createdAt }]
}

// Badge unlock karo (server idempotent hai — duplicate ignore karega)
export async function unlockBadge(uid, badgeId) {
  const { data } = await api.post('/badges/unlock', { badgeId })
  if (data.alreadyUnlocked) return null
  return data.badge.badgeId
}
