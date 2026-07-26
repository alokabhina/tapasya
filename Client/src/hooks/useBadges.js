import { useState, useEffect } from 'react'
import { getBadges, unlockBadge } from '@/api/badges'
import { checkAllBadges, BADGE_DEFINITIONS } from '@/utils/badges'
import useUserStore from '@/store/userStore'

export function useBadges() {
  const { uid, streakDays, totalHoursAllTime, dailyGoalSeconds } = useUserStore()
  // ✅ FIX: badges ab poore objects rakhta hai ({ badgeId, unlockedAt, ... })
  //    pehle yaha sirf id-strings store hoti thi jisse BadgeGrid/BadgeCard/
  //    Achievements — sabka `b.badgeId` / `b.unlockedAt` access undefined aata tha
  //    aur koi bhi badge "unlocked" kabhi dikhta hi nahi tha.
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
      setBadges(data) // full objects, not just ids
    } catch (err) {
      console.error('Badge fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // sessions: poori (all-time) sessions list — badge conditions (100hrs, streak, etc) ke liye zaroori
  // extraStats (optional): { groupsJoined } jaisi cheezein jo userStore mein nahi hain
  async function checkAndUnlock(sessions, extraStats = {}) {
    if (!uid) return []
    const userStats = {
      streak: streakDays,
      totalHours: totalHoursAllTime,
      dailyGoalSeconds,
      ...extraStats,
    }
    const alreadyUnlockedIds = badges.map((b) => b.badgeId)
    const newBadgeIds = checkAllBadges(sessions, userStats, alreadyUnlockedIds)
    if (!newBadgeIds.length) return []

    const actuallyUnlocked = []
    for (const badgeId of newBadgeIds) {
      try {
        const result = await unlockBadge(uid, badgeId)
        // server: { newUnlock, badge } ya { alreadyUnlocked, badge }
        if (result?.badge) {
          if (result.newUnlock) {
            actuallyUnlocked.push(badgeId)
          }
          setBadges((prev) =>
            prev.some((b) => b.badgeId === badgeId) ? prev : [...prev, result.badge]
          )
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
    const unlockedIds = new Set(badges.map((b) => b.badgeId))
    return BADGE_DEFINITIONS.map((def) => ({
      ...def,
      isUnlocked: unlockedIds.has(def.id),
    }))
  }

  return { badges, newUnlocks, loading, checkAndUnlock, getBadgesWithStatus, refetch: fetchBadges }
}