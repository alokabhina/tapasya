// src/hooks/useGameSession.js
// Central hook for running a game: timer, answer handling, scoring, submission
// Used inside every individual game page

import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { submitGame } from '@/api/games'
import { calcAnswerPoints } from './gameScoreHelper'

/**
 * @param {object} opts
 * @param {number}  opts.timeLimit - seconds per question
 * @param {boolean} opts.autoAdvance - auto-advance after answer (default true)
 * @param {number}  opts.feedbackDuration - ms to show feedback before advancing (default 1200)
 */
export function useGameSession({ timeLimit = 15, autoAdvance = true, feedbackDuration = 1200 } = {}) {
  const {
    questions, currentIndex, streak, maxStreak, rawScore, lives,
    currentLevel, breakdown, gameType, isGameOver,
    recordAnswer, nextQuestion, setGameOver, setLastResult,
    currentQuestion: getCurrentQuestion,
  } = useGameStore()

  const [timeLeft,    setTimeLeft]    = useState(timeLimit)
  const [answered,    setAnswered]    = useState(false)
  const [chosenAnswer,setChosen]      = useState(null)
  const [isCorrect,   setIsCorrect]   = useState(null)
  const [submitting,  setSubmitting]  = useState(false)

  const timerRef      = useRef(null)
  const startTimeRef  = useRef(null)  // question start time for timeTaken calculation

  const question = getCurrentQuestion()

  // ── Reset timer when question changes ──────────────────────────────────────
  useEffect(() => {
    setTimeLeft(question?.timeLimit || timeLimit)
    setAnswered(false)
    setChosen(null)
    setIsCorrect(null)
    startTimeRef.current = Date.now()
  }, [currentIndex])

  // ── CSS-transition-based timer (smooth, no setInterval flicker) ────────────
  // We still use an interval internally for logic, but the bar uses CSS transition
  useEffect(() => {
    if (answered || isGameOver) return
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [currentIndex, answered, isGameOver])

  // ── Handle user's answer ───────────────────────────────────────────────────
  const handleAnswer = useCallback((selectedOption) => {
    if (answered || isGameOver) return
    clearInterval(timerRef.current)

    const timeTaken   = Math.round((Date.now() - startTimeRef.current) / 1000)
    const correct     = selectedOption === question?.answer
    const pts         = calcAnswerPoints(correct, timeTaken, streak)

    setAnswered(true)
    setChosen(selectedOption)
    setIsCorrect(correct)

    recordAnswer({
      questionId:    question?._id,
      topic:         question?.topic,
      isCorrect:     correct,
      timeTaken,
      pointsEarned:  pts,
      userAnswer:    selectedOption,
      correctAnswer: question?.answer,
    })

    if (autoAdvance) {
      setTimeout(() => advance(), feedbackDuration)
    }
  }, [answered, isGameOver, question, streak])

  // ── Timeout: treat as wrong ────────────────────────────────────────────────
  function handleTimeout() {
    if (answered) return
    setAnswered(true)
    setChosen(null)
    setIsCorrect(false)

    recordAnswer({
      questionId:    question?._id,
      topic:         question?.topic,
      isCorrect:     false,
      timeTaken:     question?.timeLimit || timeLimit,
      pointsEarned:  -3,
      userAnswer:    '__timeout__',
      correctAnswer: question?.answer,
    })

    if (autoAdvance) {
      setTimeout(() => advance(), feedbackDuration)
    }
  }

  // ── Advance to next question or trigger game over ──────────────────────────
  function advance() {
    const store = useGameStore.getState()
    if (store.isGameOver) {
      handleGameOver()
    } else if (store.currentIndex >= store.questions.length - 1) {
      setGameOver()
      handleGameOver()
    } else {
      nextQuestion()
    }
  }

  // ── Submit results to server ───────────────────────────────────────────────
  async function handleGameOver() {
    const store = useGameStore.getState()
    if (submitting) return
    setSubmitting(true)

    const correctCount   = store.breakdown.filter(b => b.isCorrect).length
    const wrongCount     = store.breakdown.filter(b => !b.isCorrect).length
    const avgTimeSecs    = store.breakdown.length
      ? Math.round(store.breakdown.reduce((s, b) => s + b.timeTaken, 0) / store.breakdown.length)
      : 0
    const survivalCount  = store.gameType === 'survival' ? store.breakdown.length : 0

    try {
      const result = await submitGame({
        gameType:      store.gameType,
        breakdown:     store.breakdown,
        rawScore:      store.rawScore,
        correctCount,
        wrongCount,
        maxStreak:     store.maxStreak,
        avgTimeSecs,
        maxLevel:      store.currentLevel,
        survivalCount,
        mode:          'normal',
      })
      setLastResult(result)
    } catch (err) {
      console.error('Submit failed:', err)
      // Still show result with local score
      setLastResult({
        finalScore:  store.rawScore,
        xpEarned:    store.rawScore,
        newLevel:    null,
        newRank:     null,
        weakTopics:  [],
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Timer percentage for CSS bar ───────────────────────────────────────────
  const maxTime    = question?.timeLimit || timeLimit
  const timerPct   = (timeLeft / maxTime) * 100
  const timerDanger= timeLeft <= 5

  return {
    question,
    timeLeft,
    timerPct,
    timerDanger,
    answered,
    chosenAnswer,
    isCorrect,
    submitting,
    streak,
    maxStreak,
    rawScore,
    lives,
    currentLevel,
    currentIndex,
    totalQuestions: questions.length,
    handleAnswer,
    advance,
  }
}

// Export score helper so game pages can import it directly
export { calcAnswerPoints }