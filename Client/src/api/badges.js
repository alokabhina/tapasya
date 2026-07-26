// ✅ FIX: Complete rewrite — was using Firebase Firestore, now uses REST API
import api from './client'

// Saare unlocked badges fetch karo
export async function getBadges() {
  const { data } = await api.get('/badges')
  return data // [{ _id, badgeId, userId, createdAt }]
}

// Badge unlock karo (server idempotent hai — duplicate ignore karega)
// Return: { newUnlock: bool, badge: { _id, badgeId, unlockedAt, ... } }
export async function unlockBadge(uid, badgeId) {
  const { data } = await api.post('/badges/unlock', { badgeId })
  return {
    newUnlock: !!data.newUnlock,
    badge: data.badge,
  }
}