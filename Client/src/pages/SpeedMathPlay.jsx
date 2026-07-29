// src/pages/SpeedMathPlay.jsx
// Active test runner — shows one question at a time, per-question countdown
// (default 5s from config, user-editable), auto-advances on answer or timeout.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSpeedMathStore from '@/store/speedMathStore'
import useCountdown from '@/hooks/useCountdown'
import SpeedTimerBar from '@/components/speedmath/SpeedTimerBar'
import OptionGrid from '@/components/speedmath/OptionGrid'
import { MODULE_META } from '@/utils/speedMathGenerator'
import { submitSpeedMathTest } from '@/api/speedmath'

export default function SpeedMathPlay() {
  const navigate = useNavigate()
  const {
    questions, currentIndex, breakdown, isPlaying, isFinished,
    modules, config, recordAnswer, nextQuestion, setLastResult,
  } = useSpeedMathStore()

  const [answered, setAnswered] = useState(false)
  const [chosen, setChosen] = useState(null)
  const submittingRef = useRef(false)
  const lockedRef = useRef(false) // guards against a stale timer tick double-recording an answer

  const question = questions[currentIndex]

  // Guard: no active test → back to home
  useEffect(() => {
    if (!isPlaying && !isFinished) navigate('/speedmath')
  }, [isPlaying, isFinished, navigate])

  // Reset the lock whenever a new question comes up
  useEffect(() => { lockedRef.current = false }, [currentIndex])

  const handleExpire = () => {
    if (lockedRef.current) return
    lockAnswer(null, question.timeLimit * 1000)
  }

  const { msLeft } = useCountdown(question?.timeLimit || 5, handleExpire, currentIndex)

  const lockAnswer = (opt, timeTakenMs) => {
    if (!question || lockedRef.current) return
    lockedRef.current = true
    const isCorrect = opt === question.answer
    setAnswered(true)
    setChosen(opt)
    recordAnswer({
      module: question.module,
      itemKey: question.itemKey,
      questionText: question.questionText,
      userAnswer: opt,
      correctAnswer: question.answer,
      isCorrect,
      timeTakenMs,
    })
    setTimeout(() => {
      setAnswered(false)
      setChosen(null)
      nextQuestion()
    }, 700)
  }

  const handleAnswer = (opt) => {
    const timeTakenMs = (question.timeLimit * 1000) - msLeft
    lockAnswer(opt, Math.max(50, timeTakenMs))
  }

  // ── Test finished — submit to server, then go to Result ──────────────────
  useEffect(() => {
    if (!isFinished || submittingRef.current) return
    submittingRef.current = true
    ;(async () => {
      try {
        const payload = {
          modules,
          config,
          breakdown: breakdown.map((b) => ({
            module: b.module, itemKey: b.itemKey, questionText: b.questionText,
            userAnswer: b.userAnswer, correctAnswer: b.correctAnswer,
            isCorrect: b.isCorrect, timeTakenMs: b.timeTakenMs,
          })),
        }
        const result = await submitSpeedMathTest(payload)
        setLastResult(result)
      } catch (err) {
        console.error('Failed to submit speed math test:', err)
        setLastResult(null)
      } finally {
        navigate('/speedmath/result')
      }
    })()
  }, [isFinished]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!question) return null

  const meta = MODULE_META[question.module]
  const correctSoFar = breakdown.filter((b) => b.isCorrect).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#080d1a' }}>
      <SpeedTimerBar msLeft={msLeft} maxSeconds={question.timeLimit} currentIndex={currentIndex} totalQuestions={questions.length} correctSoFar={correctSoFar} />

      <div className="flex-1 flex flex-col gap-3 px-4 pb-4 pt-2">
        {/* Module chip */}
        <div className="flex justify-center">
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg" style={{ background: `${meta.color}18`, color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
        </div>

        {/* Question bubble */}
        <div className="rounded-2xl px-5 py-7 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #101a30 0%, #0d1728 100%)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-slate-100 text-2xl font-black leading-snug text-center">{question.questionText}</p>
        </div>

        <OptionGrid options={question.options} answered={answered} chosen={chosen} correctAnswer={question.answer} onAnswer={handleAnswer} />
      </div>
    </div>
  )
}