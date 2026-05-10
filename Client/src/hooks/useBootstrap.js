// src/hooks/useBootstrap.js
// FIX: Subjects fetch + todaySeconds = aaj ki sessions se calculate

import { useEffect } from 'react'
import useUserStore from '@/store/userStore'
import useSubjectStore from '@/store/subjectStore'
import { getSubjects } from '@/api/subjects'
import { getSessions } from '@/api/sessions'
import { getTodayString } from '@/utils/time'

export function useBootstrap() {
  const { uid } = useUserStore()
  const { setSubjects } = useSubjectStore()

  useEffect(() => {
    if (!uid) return

    async function bootstrap() {
      try {
        const [rawSubjects, todaySessions] = await Promise.all([
          getSubjects(),
          getSessions(getTodayString(), getTodayString()),
        ])

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
            id: sid, // _id ko id banao taaki codebase consistent rahe
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
