// src/store/practiceTestStore.js
// Zustand store for an in-progress Practice Test attempt (live engine).
// Mirrors speedMathStore.js's pattern — plain state + actions, not
// persisted (a refresh re-fetches from the server instead, since the
// server is the source of truth for resume — see api/practiceAttempts.js
// + practice-test-feature-plan.md Section 13).
//
// Components under components/practicetest/ are all presentational (props
// in, callbacks out) — only the PracticeTestPlay page reads/writes this
// store directly, same convention SpeedMathPlay.jsx follows with
// speedMathStore.js + SpeedTimerBar/OptionGrid.

import { create } from 'zustand'

const usePracticeTestStore = create((set, get) => ({
  // ── Loaded once per attempt ─────────────────────────────────────────────
  attemptId: null,
  test: null,               // sanitized test (no answers) — { title, sections: [...] }
  currentSectionIndex: 0,
  currentQuestionIndex: 0,  // index within the current section's questions array
  responsesBySection: [],   // [{ [qNo]: { selectedKey, status, timeSpentSec } }], one map per section
  paused: false,
  dirtyQNos: [],            // qNos with unsynced changes in the current section — autosave flushes + clears this

  // ── Load / reset ─────────────────────────────────────────────────────────
  // Resume position: the server only persists currentSectionIndex (not
  // which question you were on inside it), so on a page refresh / re-open
  // we used to always drop back to question 1 of that section — reported
  // bug where reaching the last question and coming back later ("Save &
  // Next" wrap-around report) landed back at Q1. Fix: derive the resume
  // question from the saved responses — jump to the last one that's
  // already been visited (has any non-"not-visited" status), so a refresh
  // continues roughly where you left off instead of restarting the section.
  loadAttempt: (attempt, test) => {
    const responsesBySection = attempt.sectionState.map((state) =>
      Object.fromEntries((state.responses || []).map((r) => [
        r.qNo,
        { selectedKey: r.selectedKey, status: r.status, timeSpentSec: r.timeSpentSec || 0 },
      ]))
    )
    const sectionIndex = attempt.currentSectionIndex || 0
    const section = test.sections[sectionIndex]
    const responses = { ...(responsesBySection[sectionIndex] || {}) }

    let resumeIndex = 0
    section?.questions?.forEach((q, i) => {
      if (responses[q.qNo] && responses[q.qNo].status !== 'not-visited') resumeIndex = i
    })

    // The question we land on (index 0 on a fresh start, or the resume
    // index above) must itself be marked visited immediately — previously
    // only goToQuestionIndex() did this, so the very first question of a
    // fresh attempt stayed stuck at "Not Visited" forever even though the
    // candidate was looking right at it.
    const landingQNo = section?.questions?.[resumeIndex]?.qNo
    if (landingQNo != null && (!responses[landingQNo] || responses[landingQNo].status === 'not-visited')) {
      responses[landingQNo] = { selectedKey: null, timeSpentSec: 0, ...responses[landingQNo], status: 'not-answered' }
    }
    responsesBySection[sectionIndex] = responses

    set({
      attemptId: attempt._id,
      test,
      currentSectionIndex: sectionIndex,
      currentQuestionIndex: resumeIndex,
      responsesBySection,
      paused: false,
      dirtyQNos: landingQNo != null ? [landingQNo] : [],
    })
  },

  reset: () => set({
    attemptId: null, test: null, currentSectionIndex: 0, currentQuestionIndex: 0,
    responsesBySection: [], paused: false, dirtyQNos: [],
  }),

  // ── Navigation ───────────────────────────────────────────────────────────
  goToQuestionIndex: (index) => {
    const section = get().currentSection()
    if (!section) return
    const clamped = Math.max(0, Math.min(index, section.questions.length - 1))
    const qNo = section.questions[clamped].qNo
    set((state) => {
      const responses = { ...state.responsesBySection[state.currentSectionIndex] }
      if (!responses[qNo] || responses[qNo].status === 'not-visited') {
        responses[qNo] = { selectedKey: null, timeSpentSec: 0, ...responses[qNo], status: 'not-answered' }
      }
      const responsesBySection = [...state.responsesBySection]
      responsesBySection[state.currentSectionIndex] = responses
      return { currentQuestionIndex: clamped, responsesBySection }
    })
  },

  // "Save & Next" on the very last question wraps back to question 1
  // (intentional — lets you do a quick second pass over the whole section
  // instead of getting stuck on the last question).
  goToNextQuestion: () => {
    const section = get().currentSection()
    if (!section) return
    const total = section.questions.length
    const next = (get().currentQuestionIndex + 1) % total
    get().goToQuestionIndex(next)
  },
  goToPrevQuestion: () => get().goToQuestionIndex(get().currentQuestionIndex - 1),

  // Called by the page once a submit-section API call succeeds — moves
  // local state onto the next (already-fresh) section.
  advanceToSection: (sectionIndex) => set({
    currentSectionIndex: sectionIndex,
    currentQuestionIndex: 0,
    dirtyQNos: [],
  }),

  // ── Answers ──────────────────────────────────────────────────────────────
  selectOption: (qNo, key) => set((state) => {
    const responses = { ...state.responsesBySection[state.currentSectionIndex] }
    const prevStatus = responses[qNo]?.status
    const status = (prevStatus === 'marked' || prevStatus === 'answered-marked') ? 'answered-marked' : 'answered'
    responses[qNo] = { ...responses[qNo], selectedKey: key, status }
    const responsesBySection = [...state.responsesBySection]
    responsesBySection[state.currentSectionIndex] = responses
    return { responsesBySection, dirtyQNos: [...new Set([...state.dirtyQNos, qNo])] }
  }),

  clearResponse: (qNo) => set((state) => {
    const responses = { ...state.responsesBySection[state.currentSectionIndex] }
    responses[qNo] = { ...responses[qNo], selectedKey: null, status: 'not-answered' }
    const responsesBySection = [...state.responsesBySection]
    responsesBySection[state.currentSectionIndex] = responses
    return { responsesBySection, dirtyQNos: [...new Set([...state.dirtyQNos, qNo])] }
  }),

  // "Answered & Marked for Review" vs plain "Marked for Review" depends on
  // whether an option is already selected — marking never changes scoring,
  // only this review flag (plan doc Section 14 edge case).
  toggleMarkForReview: (qNo) => set((state) => {
    const responses = { ...state.responsesBySection[state.currentSectionIndex] }
    const current = responses[qNo] || {}
    const hasAnswer = current.selectedKey != null
    const nextStatus = hasAnswer
      ? (current.status === 'answered-marked' ? 'answered' : 'answered-marked')
      : (current.status === 'marked' ? 'not-answered' : 'marked')
    responses[qNo] = { ...current, status: nextStatus }
    const responsesBySection = [...state.responsesBySection]
    responsesBySection[state.currentSectionIndex] = responses
    return { responsesBySection, dirtyQNos: [...new Set([...state.dirtyQNos, qNo])] }
  }),

  // deltaSec should be a small increment (e.g. from a 1s tick), never an
  // absolute value — mirrors the server's accumulate-not-overwrite rule.
  addTimeSpent: (qNo, deltaSec) => {
    if (!deltaSec) return
    set((state) => {
      const responses = { ...state.responsesBySection[state.currentSectionIndex] }
      const current = responses[qNo] || { status: 'not-visited', selectedKey: null, timeSpentSec: 0 }
      responses[qNo] = { ...current, timeSpentSec: (current.timeSpentSec || 0) + deltaSec }
      const responsesBySection = [...state.responsesBySection]
      responsesBySection[state.currentSectionIndex] = responses
      return { responsesBySection }
    })
  },

  clearDirty: () => set({ dirtyQNos: [] }),
  setPaused: (paused) => set({ paused }),

  // ── Derived getters — call inside render/effects, not reactive selectors ──
  currentSection: () => {
    const { test, currentSectionIndex } = get()
    return test?.sections?.[currentSectionIndex] || null
  },
  currentQuestion: () => {
    const section = get().currentSection()
    return section?.questions?.[get().currentQuestionIndex] || null
  },
  currentDirection: () => {
    const section = get().currentSection()
    const question = get().currentQuestion()
    if (!section || !question?.groupId) return null
    return section.directions.find((d) => d.groupId === question.groupId) || null
  },
  currentResponses: () => get().responsesBySection[get().currentSectionIndex] || {},
  statusCounts: () => {
    const section = get().currentSection()
    const responses = get().currentResponses()
    const counts = { answered: 0, notAnswered: 0, notVisited: 0, marked: 0, answeredMarked: 0 }
    for (const q of section?.questions || []) {
      const status = responses[q.qNo]?.status || 'not-visited'
      if (status === 'answered') counts.answered++
      else if (status === 'not-answered') counts.notAnswered++
      else if (status === 'not-visited') counts.notVisited++
      else if (status === 'marked') counts.marked++
      else if (status === 'answered-marked') counts.answeredMarked++
    }
    return counts
  },
}))

export default usePracticeTestStore