// src/pages/games/CalculationClimb.jsx
// Route: /games/calculation
// Adaptive level system — 3 correct = level up, 2 wrong = stay
// Levels L1–L6, time limit reduces per level

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuestions } from '@/api/games'
import useGameStore from '@/store/gameStore'
import { useGameSession } from '@/hooks/useGameSession'
import TimerBar from '@/components/games/TimerBar'
import QuestionCard from '@/components/games/QuestionCard'
import ComboDisplay from '@/components/games/ComboDisplay'
import GameResult from '@/components/games/GameResult'

// Time limits per level per spec
const LEVEL_TIME = { 1: 20, 2: 18, 3: 15, 4: 12, 5: 20, 6: 25 }

export default function CalculationClimb() {
  const navigate    = useNavigate()
  const { startGame, showResult, lastResult, resetGame, isPlaying, currentLevel } = useGameStore()
  const [loadError, setLoadError]  = useState(null)
  const [starting,  setStarting]   = useState(false)
  const [showLevelUp, setLevelUp]  = useState(false)
  const prevLevelRef = { current: 1 }

  // Reset any leftover game state when this game mounts
  useEffect(() => { resetGame() }, [])

  // Detect level up
  useEffect(() => {
    if (isPlaying && currentLevel > prevLevelRef.current) {
      setLevelUp(true)
      setTimeout(() => setLevelUp(false), 1000)
    }
    prevLevelRef.current = currentLevel
  }, [currentLevel])

  async function handleStart() {
    setStarting(true)
    setLoadError(null)
    try {
      const { questions } = await fetchQuestions('calculation', { level: 1, size: 20 })
      if (!questions?.length) throw new Error('No questions available')
      startGame('calculation', questions)
    } catch (e) {
      setLoadError(e.message)
    } finally {
      setStarting(false)
    }
  }

  function handlePlayAgain() {
    resetGame()
    handleStart()
  }

  if (showResult) {
    return <GameResult result={lastResult} gameType="calculation" onPlayAgain={handlePlayAgain} />
  }

  if (!isPlaying) {
    return <StartScreen onStart={handleStart} starting={starting} error={loadError} onBack={() => navigate('/games')} />
  }

  return (
    <ActiveGame showLevelUp={showLevelUp} currentLevel={currentLevel} />
  )
}

function ActiveGame({ showLevelUp, currentLevel }) {
  const timeLimit = LEVEL_TIME[currentLevel] || 15
  const {
    question, timeLeft, timerDanger, answered,
    chosenAnswer, isCorrect, streak, rawScore,
    currentIndex, totalQuestions, handleAnswer,
  } = useGameSession({ timeLimit, feedbackDuration: 1500 })

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Level up overlay */}
      {showLevelUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-orange-500/20 backdrop-blur-sm pointer-events-none">
          <div className="text-center animate-bounce">
            <div className="text-5xl mb-2">⚡</div>
            <div className="text-3xl font-black text-orange-400">Level {currentLevel}!</div>
          </div>
        </div>
      )}

      <TimerBar
        timeLeft={timeLeft}
        maxTime={timeLimit}
        level={currentLevel}
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        streak={streak}
      />

      <QuestionCard
        question={question}
        answered={answered}
        chosenAnswer={chosenAnswer}
        isCorrect={isCorrect}
        onAnswer={handleAnswer}
      />

      <ComboDisplay streak={streak} score={rawScore} />
    </div>
  )
}

function StartScreen({ onStart, starting, error, onBack }) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">⚡</div>
      <h1 className="text-2xl font-black text-white mb-2">Calculation Climb</h1>
      <p className="text-slate-400 text-sm mb-1">Speed maths — L1 single digits to L6 BODMAS</p>
      <p className="text-slate-500 text-xs mb-6">3 correct in a row = level up · Gets harder as you climb</p>

      <div className="w-full max-w-xs space-y-2 text-left mb-6 bg-[#1a2744] rounded-xl p-4 border border-slate-700/60">
        {[
          ['L1', '8×7, 45+38', '20s'],
          ['L2', '34×8, 96-47', '18s'],
          ['L3', '34×56, 128+349', '15s'],
          ['L4', '348×27, 1245+896', '12s'],
          ['L5', 'BODMAS 2-step', '20s'],
          ['L6', 'BODMAS 3-step', '25s'],
        ].map(([l, ex, t]) => (
          <div key={l} className="flex justify-between text-xs">
            <span className="text-orange-400 font-bold w-6">{l}</span>
            <span className="text-slate-300 flex-1">{ex}</span>
            <span className="text-slate-500">{t}</span>
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={onStart}
        disabled={starting}
        className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-base disabled:opacity-50"
      >
        {starting ? 'Loading…' : 'Start Climbing ⚡'}
      </button>
      <button onClick={onBack} className="mt-3 text-slate-500 text-sm">← Back to Hub</button>
    </div>
  )
}