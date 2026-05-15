// src/hooks/useBootstrap.js
// FIX: Subjects fetch + todaySeconds = aaj ki sessions se calculate
// NEW: First login pe 4 default subjects auto-seed karo (English, Reasoning, Quant, GS)

import { useEffect } from 'react'
import useUserStore from '@/store/userStore'
import useSubjectStore from '@/store/subjectStore'
import { getSubjects, addSubject } from '@/api/subjects'
import { getSessions } from '@/api/sessions'
import { getTodayString } from '@/utils/time'

// Default subjects for new users — can be edited/deleted later
const DEFAULT_SUBJECTS = [
  { name: 'English',   color: '#3b82f6' }, // blue
  { name: 'Reasoning', color: '#8b5cf6' }, // purple
  { name: 'Quant',     color: '#f97316' }, // orange
  { name: 'GS',        color: '#22c55e' }, // green
]

export function useBootstrap() {
  const { uid } = useUserStore()
  const { setSubjects } = useSubjectStore()

  useEffect(() => {
    if (!uid) return

    async function bootstrap() {
      try {
        let [rawSubjects, todaySessions] = await Promise.all([
          getSubjects(),
          getSessions(getTodayString(), getTodayString()),
        ])

        // ── First login / empty subjects → seed defaults ──────────────────
        if (rawSubjects.length === 0) {
          const created = await Promise.all(
            DEFAULT_SUBJECTS.map((s) => addSubject(s))
          )
          rawSubjects = created
        }

        // aaj har subject ne kitne seconds padha — sessions se calculate
        const todayMap = {}
        todaySessions.forEach((sess) => {
          const sid = String(sess.subjectId || sess.subject)
          todayMap[sid] = (todayMap[sid] || 0) + (sess.duration || 0)
        })

        const subjects = rawSubjects.map((s) => {
          const sid = String(s._id || s.id)
          return {
            ...s,
            id: sid,
            todaySeconds: todayMap[sid] || 0,
          }
        })

        setSubjects(subjects)
      } catch (err) {
        console.error('Bootstrap failed:', err)
      }
    }

    bootstrap()
  }, [uid])
}

export default useBootstrap