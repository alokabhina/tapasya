// src/hooks/useBootstrap.js
// Offline-first: IndexedDB se load, server se update, cache save

import { useEffect } from 'react'
import useUserStore from '@/store/userStore'
import useSubjectStore from '@/store/subjectStore'
import { getSubjects, addSubject } from '@/api/subjects'
import { getSessions } from '@/api/sessions'
import { getTodayString } from '@/utils/time'
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
  const { uid } = useUserStore()
  const { setSubjects } = useSubjectStore()

  useEffect(() => {
    if (!uid) return

    async function bootstrap() {
      const today = getTodayString()

      // ── Step 1: Load from IndexedDB immediately (instant UI) ──────────────
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
          setSubjects(subjects) // instant render — offline data
        }
      } catch (_) {}

      // ── Step 2: Fetch from server (update cache) ──────────────────────────
      if (!navigator.onLine) return // offline — use cached data as-is

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

        // Save to IndexedDB for next offline use
        await saveSubjectsOffline(subjects)
        await saveSessionsOffline(todaySessions.map(s => ({
          ...s, id: String(s._id || s.id)
        })))
      } catch (err) {
        console.warn('[Bootstrap] Server fetch failed, using cached data:', err.message)
      }
    }

    bootstrap()
  }, [uid])
}

export default useBootstrap