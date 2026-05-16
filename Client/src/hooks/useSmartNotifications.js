// src/hooks/useSmartNotifications.js
// Smart notification scheduler — hourly reminders, goal milestones, todo alerts
// App mein sirf ek baar use karo (App.jsx ya Home.jsx mein)

import { useEffect, useRef } from 'react'
import {
  requestPermission,
  hasPermission,
  checkGoalMilestone,
  sendHourlyProgress,
  sendTodoReminder,
  sendMorningMotivation,
  sendEveningReminder,
  resetMilestones,
} from '@/utils/notifications'

// Kitne minute pe ek baar hourly check chalega (default: 60 min)
const HOURLY_INTERVAL_MS = 60 * 60 * 1000

// Todo reminder interval (default: 2 hours)
const TODO_INTERVAL_MS = 2 * 60 * 60 * 1000

// Morning window: 6am–9am
// Evening window: 8pm–11pm

function isInWindow(startH, endH) {
  const h = new Date().getHours()
  return h >= startH && h < endH
}

export function useSmartNotifications({ todaySeconds = 0, goalSeconds = 0, streakDays = 0, pendingTodos = [] }) {
  const lastDayRef        = useRef(null)
  const hourlyTimerRef    = useRef(null)
  const todoTimerRef      = useRef(null)
  const morningDoneRef    = useRef(false)
  const eveningDoneRef    = useRef(false)
  const prevGoalPctRef    = useRef(0)

  // 1. Permission request on mount (ek hi baar)
  useEffect(() => {
    requestPermission()
  }, [])

  // 2. Naya din detect karo — milestones reset
  useEffect(() => {
    const today = new Date().toDateString()
    if (lastDayRef.current !== today) {
      lastDayRef.current  = today
      morningDoneRef.current  = false
      eveningDoneRef.current  = false
      resetMilestones()
    }
  }, [todaySeconds])

  // 3. Goal milestone check — jab bhi todaySeconds badhe
  useEffect(() => {
    if (!hasPermission() || goalSeconds <= 0) return
    checkGoalMilestone(todaySeconds, goalSeconds)
    prevGoalPctRef.current = (todaySeconds / goalSeconds) * 100
  }, [todaySeconds, goalSeconds])

  // 4. Morning motivation — 6am–9am, sirf ek baar
  useEffect(() => {
    if (!hasPermission() || morningDoneRef.current) return
    if (isInWindow(6, 9)) {
      morningDoneRef.current = true
      sendMorningMotivation(goalSeconds, streakDays)
    }
  }, [goalSeconds, streakDays])

  // 5. Evening reminder — 8pm–11pm, sirf ek baar, agar goal incomplete
  useEffect(() => {
    if (!hasPermission() || eveningDoneRef.current) return
    if (isInWindow(20, 23) && todaySeconds < goalSeconds) {
      eveningDoneRef.current = true
      sendEveningReminder(todaySeconds, goalSeconds)
    }
  }, [todaySeconds, goalSeconds])

  // 6. Hourly progress ping — har 60 minute pe automatically
  useEffect(() => {
    if (!hasPermission()) return

    function scheduleNext() {
      hourlyTimerRef.current = setTimeout(async () => {
        await sendHourlyProgress(todaySeconds, goalSeconds, streakDays)
        scheduleNext()
      }, HOURLY_INTERVAL_MS)
    }

    scheduleNext()
    return () => clearTimeout(hourlyTimerRef.current)
  }, []) // mount pe sirf ek baar setup

  // 7. Hourly timer ke andar fresh values chahiye — ref use karo
  const todaySecondsRef = useRef(todaySeconds)
  const goalSecondsRef  = useRef(goalSeconds)
  const streakRef       = useRef(streakDays)
  useEffect(() => { todaySecondsRef.current = todaySeconds }, [todaySeconds])
  useEffect(() => { goalSecondsRef.current  = goalSeconds  }, [goalSeconds])
  useEffect(() => { streakRef.current       = streakDays   }, [streakDays])

  // 8. Todo reminder — har 2 ghante pe agar pending tasks hain
  const pendingRef = useRef(pendingTodos)
  useEffect(() => { pendingRef.current = pendingTodos }, [pendingTodos])

  useEffect(() => {
    if (!hasPermission()) return

    function scheduleTodo() {
      todoTimerRef.current = setTimeout(async () => {
        if (pendingRef.current.length > 0) {
          await sendTodoReminder(pendingRef.current)
        }
        scheduleTodo()
      }, TODO_INTERVAL_MS)
    }

    // Pehla todo reminder 30 min baad
    const firstTodo = setTimeout(async () => {
      if (pendingRef.current.length > 0) {
        await sendTodoReminder(pendingRef.current)
      }
      scheduleTodo()
    }, 30 * 60 * 1000)

    return () => {
      clearTimeout(firstTodo)
      clearTimeout(todoTimerRef.current)
    }
  }, [])
}

export default useSmartNotifications