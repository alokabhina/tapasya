// src/hooks/useBootstrap.js
// Offline-first: IndexedDB se load, server se update, cache save
//
// Boot sequence:
//   0. INSTANT  — subjectStore mein already localStorage persisted data hai (Zustand)
//                 App open hote hi subjects dikhte hain — koi wait nahi
//   1. IndexedDB — todaySeconds calculate karke subjectStore update karo (fast, ~5ms)
//   2. Network  — online hai to server se fresh data lo, cache update karo

import { useEffect } from 'react'
import useUserStore from '@/store/userStore'
import useSubjectStore from '@/store/subjectStore'
import { getSubjects, addSubject } from '@/api/subjects'
import { getSessions } from '@/api/sessions'
import { fetchMyGroups } from '@/api/groups'
import { getStudyDayString } from '@/utils/time'
import { calculateStreak, calculateMaxStreak } from '@/utils/stats'
import { useBadges } from './useBadges'
import {
  saveSubjectsOffline, getSubjectsOffline,
  saveSessionsOffline, getSessionsOffline,
} from '@/utils/offlineDB'

const DEFAULT_SUBJECTS = [
  { name: 'English',   color: '#3b82f6' },
  { name: 'Reasoning', color: '#8b5cf6' },
  { name: 'Quant',     color: '#f97316' },
  { name: 'GS',        color: '#22c55e' },
]

export function useBootstrap() {
  const { uid, setStreak, setMaxStreak, setTotalHours } = useUserStore()
  const { subjects: storedSubjects, setSubjects } = useSubjectStore()
  const { checkAndUnlock } = useBadges()

  // ── Phase 0 happens automatically ──────────────────────────────────────────
  // Zustand persist middleware ne already localStorage se subjects load kar diye.
  // Component render hote hi storedSubjects mein data hoga (agar pehle login hua tha).
  // Hum kuch nahi karte yahan — bass IndexedDB + network se update karte hain.

  useEffect(() => {
    async function bootstrap() {
      const today = getStudyDayString()

      // ── Phase 1: IndexedDB — todaySeconds calculate karke update karo ──────
      // Yeh ~5ms mein hota hai, aur subjects ke naam/colors already store mein hain.
      // Bas aaj ki study time update karna hai.
      try {
        const [cachedSubjects, cachedSessions] = await Promise.all([
          getSubjectsOffline(),
          getSessionsOffline(today, today),
        ])

        if (cachedSubjects.length > 0) {
          const todayMap = {}
          cachedSessions.forEach(s => {
            const sid = String(s.subjectId || s.subject)
            todayMap[sid] = (todayMap[sid] || 0) + (s.duration || 0)
          })
          const subjects = cachedSubjects.map(s => ({
            ...s,
            todaySeconds: todayMap[String(s.id)] || s.todaySeconds || 0,
          }))
          setSubjects(subjects)
        } else if (storedSubjects.length > 0) {
          // IndexedDB empty hai lekin localStorage mein subjects hain
          // (rare: IndexedDB cleared, localStorage nahi) — localStorage data use karo
          // todaySeconds 0 honge, lekin subjects dikhenge
        }
      } catch (_) {}

      // ── Phase 2: Network — sirf online mein ────────────────────────────────
      if (!uid || !navigator.onLine) return

      try {
        let [rawSubjects, todaySessions] = await Promise.all([
          getSubjects(),
          getSessions(today, today),
        ])

        if (rawSubjects.length === 0) {
          const created = await Promise.all(DEFAULT_SUBJECTS.map(s => addSubject(s)))
          rawSubjects = created
        }

        const todayMap = {}
        todaySessions.forEach(sess => {
          const sid = String(sess.subjectId || sess.subject)
          todayMap[sid] = (todayMap[sid] || 0) + (sess.duration || 0)
        })

        const subjects = rawSubjects.map(s => ({
          ...s,
          id: String(s._id || s.id),
          todaySeconds: todayMap[String(s._id || s.id)] || 0,
        }))

        setSubjects(subjects)

        // IndexedDB update — next offline open ke liye
        await saveSubjectsOffline(subjects)
        await saveSessionsOffline(todaySessions.map(s => ({
          ...s, id: String(s._id || s.id)
        })))
      } catch (err) {
        console.warn('[Bootstrap] Server fetch failed, using cached data:', err.message)
      }
    }

    bootstrap()
    // uid change pe re-run karo (login/logout)
    // offline mein bhi run karo — Phase 1 kaam karega
  }, [uid])

  // ── Phase 3: Streak + total-hours + badge unlocking — GLOBAL ──────────────
  // ✅ FIX: pehle ye sirf Stats.jsx page khulne par calculate hota tha (useStats
  // hook wahi ek jagah call hoti thi). Isliye Home page ya kahin aur streak
  // hamesha purana/stale dikhta tha jab tak user Stats page na khole.
  // Ab yaha App-level pe ek hi baar mount hota hai (login ke baad) aur har
  // session save hone ke baad bhi (tapasya:session-saved event) re-run hota hai
  // — isse streak hamesha up-to-date rehta hai, aur badges bhi turant check/
  // unlock ho jaate hain jaise hi koi condition poori hoti hai.
  useEffect(() => {
    if (!uid || !navigator.onLine) return

    async function refreshAggregates() {
      try {
        const allSessions = await getSessions('2020-01-01', getStudyDayString())
        const streak    = calculateStreak(allSessions)
        const maxStreak = calculateMaxStreak(allSessions)
        const totalHrs  = allSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 3600
        setStreak(streak)
        setMaxStreak(maxStreak)
        setTotalHours(totalHrs)

        let groupsJoined = 0
        try {
          const groups = await fetchMyGroups()
          groupsJoined = groups?.length || 0
        } catch (_) { /* groups fetch optional — badge check still works without it */ }

        await checkAndUnlock(allSessions, { groupsJoined, maxStreak })
      } catch (err) {
        console.warn('[Bootstrap] Streak/badge refresh failed:', err.message)
      }
    }

    refreshAggregates()
    window.addEventListener('tapasya:session-saved', refreshAggregates)
    return () => window.removeEventListener('tapasya:session-saved', refreshAggregates)
  }, [uid])
}

export default useBootstrap