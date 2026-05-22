// src/pages/games/NumberSeriesRush.jsx
// Route: /games/series
// Arithmetic → Geometric → Mixed → Fibonacci difficulty
// 30 seconds per question, shows pattern logic on wrong answer

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuestions } from '@/api/games'
import useGameStore from '@/store/gameStore'
import { useGameSession } from '@/hooks/useGameSession'
import TimerBar from '@/components/games/TimerBar'
import QuestionCard from '@/components/games/QuestionCard'
import ComboDisplay from '@/components/games/ComboDisplay'
import GameResult from '@/components/games/GameResult'
import { useState } from 'react'

export default function NumberSeriesRush() {
  const navigate = useNavigate()
  const { startGame, showResult, lastResult, resetGame, isPlaying } = useGameStore()
  const [starting, setStarting] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // Reset any leftover game state when this game mounts
  useEffect(() => { resetGame() }, [])

  async function handleStart() {
    setStarting(true)
    setLoadError(null)
    try {
      const { questions } = await fetchQuestions('series', { size: 20 })
      if (!questions?.length) throw new Error('No questions available')
      startGame('series', questions)
    } catch (e) {
      setLoadError(e.message)
    } finally {
      setStarting(false)
    }
  }

  function handlePlayAgain() { resetGame(); handleStart() }

  if (showResult) return <GameResult result={lastResult} gameType="series" onPlayAgain={handlePlayAgain} />
  if (!isPlaying) return (
    <StartScreen onStart={handleStart} starting={starting} error={loadError} onBack={() => navigate('/games')} />
  )

  return <ActiveGame />
}

function ActiveGame() {
  const {
    question, timeLeft, answered, chosenAnswer, isCorrect,
    streak, rawScore, currentIndex, totalQuestions, handleAnswer,
  } = useGameSession({ timeLimit: 30, feedbackDuration: 2000 })

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <TimerBar
        timeLeft={timeLeft}
        maxTime={30}
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
      <div className="text-5xl mb-4">📈</div>
      <h1 className="text-2xl font-black text-white mb-2">Number Series Rush</h1>
      <p className="text-slate-400 text-sm mb-1">Find the next number in the pattern</p>
      <p className="text-slate-500 text-xs mb-6">2, 6, 12, 20, ? — Tap the answer before time runs out</p>

      <div className="w-full max-w-xs bg-[#1a2744] rounded-xl p-4 border border-slate-700/60 mb-6 text-left space-y-2">
        {[
          ['Easy',   'Arithmetic progressions'],
          ['Medium', 'Geometric progressions'],
          ['Hard',   'Mixed & Fibonacci-type'],
        ].map(([d, ex]) => (
          <div key={d} className="flex gap-2 text-xs">
            <span className="text-blue-400 font-bold w-14">{d}</span>
            <span className="text-slate-300">{ex}</span>
          </div>
        ))}
        <p className="text-slate-500 text-xs pt-1">Pattern explanation shown on wrong answer</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <button
        onClick={onStart}
        disabled={starting}
        className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-base disabled:opacity-50"
      >
        {starting ? 'Loading…' : 'Start Rush 📈'}
      </button>
      <button onClick={onBack} className="mt-3 text-slate-500 text-sm">← Back to Hub</button>
    </div>
  )
}