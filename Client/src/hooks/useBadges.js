import { useState, useEffect } from 'react'
// ✅ FIX: '@/firebase/badges' → '@/api/badges' (firebase folder exist hi nahi karta)
import { getBadges, unlockBadge } from '@/api/badges'
import { checkAllBadges, BADGE_DEFINITIONS } from '@/utils/badges'
import useUserStore from '@/store/userStore'

export function useBadges() {
  const { uid, streakDays, totalHoursAllTime } = useUserStore()
  const [badges, setBadges] = useState([])
  const [newUnlocks, setNewUnlocks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    fetchBadges()
  }, [uid])

  async function fetchBadges() {
    setLoading(true)
    try {
      const data = await getBadges()
      setBadges(data.map((b) => b.badgeId))
    } catch (err) {
      console.error('Badge fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function checkAndUnlock(sessions) {
    if (!uid) return []
    const userStats = { streak: streakDays, totalHours: totalHoursAllTime }
    const newBadgeIds = checkAllBadges(sessions, userStats, badges)
    if (!newBadgeIds.length) return []

    const actuallyUnlocked = []
    for (const badgeId of newBadgeIds) {
      try {
        const result = await unlockBadge(uid, badgeId)
        if (result) {
          actuallyUnlocked.push(badgeId)
          setBadges((prev) => [...prev, badgeId])
        }
      } catch (err) {
        console.error('Badge unlock error:', err)
      }
    }

    if (actuallyUnlocked.length) {
      setNewUnlocks(actuallyUnlocked)
      setTimeout(() => setNewUnlocks([]), 4000)
    }
    return actuallyUnlocked
  }

  function getBadgesWithStatus() {
    return BADGE_DEFINITIONS.map((def) => ({
      ...def,
      isUnlocked: badges.includes(def.id),
    }))
  }

  return { badges, newUnlocks, loading, checkAndUnlock, getBadgesWithStatus, refetch: fetchBadges }
}
