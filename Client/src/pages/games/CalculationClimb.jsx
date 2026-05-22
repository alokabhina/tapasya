// src/pages/games/CalculationClimb.jsx
// Route: /games/calculation

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuestions } from '@/api/games'
import useGameStore from '@/store/gameStore'
import { useGameSession } from '@/hooks/useGameSession'
import TimerBar from '@/components/games/TimerBar'
import QuestionCard from '@/components/games/QuestionCard'
import ComboDisplay from '@/components/games/ComboDisplay'
import GameResult from '@/components/games/GameResult'
import GameStartScreen from '@/components/games/GameStartScreen'

const LEVEL_TIME = { 1: 20, 2: 18, 3: 15, 4: 12, 5: 20, 6: 25 }

export default function CalculationClimb() {
  const navigate    = useNavigate()
  const { startGame, showResult, lastResult, resetGame, isPlaying, currentLevel } = useGameStore()
  const [loadError,    setLoadError]  = useState(null)
  const [starting,     setStarting]   = useState(false)
  const [showLevelUp,  setLevelUp]    = useState(false)
  const prevLevelRef = useRef(1)

  useEffect(() => { resetGame() }, [])

  useEffect(() => {
    if (isPlaying && currentLevel > prevLevelRef.current) {
      setLevelUp(true)
      setTimeout(() => setLevelUp(false), 1200)
    }
    prevLevelRef.current = currentLevel
  }, [currentLevel])

  async function handleStart() {
    setStarting(true); setLoadError(null)
    try {
      const { questions } = await fetchQuestions('calculation', { level: 1, size: 20 })
      if (!questions?.length) throw new Error('No questions available')
      startGame('calculation', questions)
    } catch (e) { setLoadError(e.message) }
    finally     { setStarting(false) }
  }

  if (showResult)  return <GameResult result={lastResult} gameType="calculation" onPlayAgain={() => { resetGame(); handleStart() }} />
  if (!isPlaying)  return (
    <GameStartScreen
      icon="⚡"
      title="Calculation Climb"
      subtitle="Speed maths — L1 digits to L6 BODMAS"
      hint="3 correct in a row = level up · Gets harder as you climb"
      btnLabel="Start Climbing ⚡"
      btnGradient="from-orange-500 to-amber-500"
      btnShadow="rgba(249,115,22,0.4)"
      onStart={handleStart}
      starting={starting}
      error={loadError}
      onBack={() => navigate('/games')}
      rules={[
        { icon: '⚡', label: 'L1', text: '8×7, 45+38',        tag: '20s' },
        { icon: '⚡', label: 'L2', text: '34×8, 96-47',       tag: '18s' },
        { icon: '⚡', label: 'L3', text: '34×56, 128+349',    tag: '15s' },
        { icon: '⚡', label: 'L4', text: '348×27, 1245+896',  tag: '12s' },
        { icon: '⚡', label: 'L5', text: 'BODMAS 2-step',     tag: '20s' },
        { icon: '⚡', label: 'L6', text: 'BODMAS 3-step',     tag: '25s' },
      ]}
    />
  )
  return <ActiveGame showLevelUp={showLevelUp} currentLevel={currentLevel} />
}

function ActiveGame({ showLevelUp, currentLevel }) {
  const timeLimit = LEVEL_TIME[currentLevel] || 15
  const {
    question, timeLeft, answered, chosenAnswer, isCorrect,
    streak, rawScore, currentIndex, totalQuestions, handleAnswer,
  } = useGameSession({ timeLimit, feedbackDuration: 1500 })

  return (
    <div className="min-h-screen bg-[#080d1a] flex flex-col">
      {/* Level-up overlay */}
      {showLevelUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(249,115,22,0.08)', backdropFilter: 'blur(2px)' }}>
          <div className="text-center" style={{ animation: 'levelPop 1.2s ease forwards' }}>
            <div className="text-6xl mb-2">⚡</div>
            <div className="text-4xl font-black text-orange-400">Level {currentLevel}!</div>
            <div className="text-slate-400 text-sm mt-1">Keep climbing!</div>
          </div>
        </div>
      )}

      <TimerBar timeLeft={timeLeft} maxTime={timeLimit} level={currentLevel} currentIndex={currentIndex} totalQuestions={totalQuestions} streak={streak} />
      <QuestionCard question={question} answered={answered} chosenAnswer={chosenAnswer} isCorrect={isCorrect} onAnswer={handleAnswer} />
      <ComboDisplay streak={streak} score={rawScore} />

      <style>{`
        @keyframes levelPop {
          0%   { opacity: 0; transform: scale(0.6) }
          20%  { opacity: 1; transform: scale(1.1) }
          60%  { opacity: 1; transform: scale(1) }
          100% { opacity: 0; transform: scale(0.9) }
        }
      `}</style>
    </div>
  )
}