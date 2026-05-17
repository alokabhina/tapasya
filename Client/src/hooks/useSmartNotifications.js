// src/hooks/useSmartNotifications.js

import { useEffect, useRef } from 'react'
import useUserStore from '@/store/userStore'
import {
  requestPermission,
  hasPermission,
  checkGoalMilestone,
  sendHourlyProgress,
  sendTodoReminder,
  sendMorningMotivation,
  sendEveningReminder,
  schedulePersonalNudges,
  resetMilestones,
} from '@/utils/notifications'

const HOURLY_MS  = 60 * 60 * 1000
const TODO_MS    = 2  * 60 * 60 * 1000

function isInWindow(startH, endH) {
  const h = new Date().getHours()
  return h >= startH && h < endH
}

export function useSmartNotifications({ todaySeconds = 0, goalSeconds = 0, streakDays = 0, pendingTodos = [] }) {
  const displayName = useUserStore((s) => s.displayName)

  const lastDayRef     = useRef(null)
  const hourlyRef      = useRef(null)
  const todoRef        = useRef(null)
  const morningDoneRef = useRef(false)
  const eveningDoneRef = useRef(false)
  const nudgeSetupRef  = useRef(false)

  // Refs for latest values inside timers
  const todayRef   = useRef(todaySeconds)
  const goalRef    = useRef(goalSeconds)
  const streakRef  = useRef(streakDays)
  const pendingRef = useRef(pendingTodos)
  const nameRef    = useRef(displayName)
  useEffect(() => { todayRef.current   = todaySeconds }, [todaySeconds])
  useEffect(() => { goalRef.current    = goalSeconds  }, [goalSeconds])
  useEffect(() => { streakRef.current  = streakDays   }, [streakDays])
  useEffect(() => { pendingRef.current = pendingTodos }, [pendingTodos])
  useEffect(() => { nameRef.current    = displayName  }, [displayName])

  // 1. Permission
  useEffect(() => { requestPermission() }, [])

  // 2. Day reset
  useEffect(() => {
    const today = new Date().toDateString()
    if (lastDayRef.current !== today) {
      lastDayRef.current   = today
      morningDoneRef.current = false
      eveningDoneRef.current = false
      nudgeSetupRef.current  = false
      resetMilestones()
    }
  }, [todaySeconds])

  // 3. Goal milestones
  useEffect(() => {
    if (!hasPermission() || goalSeconds <= 0) return
    checkGoalMilestone(todaySeconds, goalSeconds, displayName)
  }, [todaySeconds, goalSeconds, displayName])

  // 4. Morning — 6am–9am
  useEffect(() => {
    if (!hasPermission() || morningDoneRef.current) return
    if (isInWindow(6, 9)) {
      morningDoneRef.current = true
      sendMorningMotivation(goalSeconds, streakDays, displayName)
    }
  }, [goalSeconds, streakDays, displayName])

  // 5. Evening — 8pm–11pm
  useEffect(() => {
    if (!hasPermission() || eveningDoneRef.current) return
    if (isInWindow(20, 23) && todaySeconds < goalSeconds) {
      eveningDoneRef.current = true
      sendEveningReminder(todaySeconds, goalSeconds, displayName)
    }
  }, [todaySeconds, goalSeconds, displayName])

  // 6. Hourly progress — har 60 min, fresh values via ref
  useEffect(() => {
    if (!hasPermission()) return
    function tick() {
      hourlyRef.current = setTimeout(async () => {
        await sendHourlyProgress(todayRef.current, goalRef.current, streakRef.current, nameRef.current)
        tick()
      }, HOURLY_MS)
    }
    tick()
    return () => clearTimeout(hourlyRef.current)
  }, [])

  // 7. Todo reminder — 30min baad pehla, phir har 2hr
  useEffect(() => {
    if (!hasPermission()) return
    function scheduleTodo() {
      todoRef.current = setTimeout(async () => {
        if (pendingRef.current.length > 0) {
          await sendTodoReminder(pendingRef.current, nameRef.current)
        }
        scheduleTodo()
      }, TODO_MS)
    }
    const first = setTimeout(async () => {
      if (pendingRef.current.length > 0) {
        await sendTodoReminder(pendingRef.current, nameRef.current)
      }
      scheduleTodo()
    }, 30 * 60 * 1000)
    return () => { clearTimeout(first); clearTimeout(todoRef.current) }
  }, [])

  // 8. Personal name-based nudges — din mein 3 baar random time pe
  useEffect(() => {
    if (!hasPermission() || nudgeSetupRef.current) return
    nudgeSetupRef.current = true
    schedulePersonalNudges(displayName)
  }, [displayName])
}

export default useSmartNotifications