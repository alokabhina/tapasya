// src/pages/games/SurvivalArena.jsx
// Route: /games/survival
// 3 lives, mixed subjects, one wrong = lose a life, endless until 0 lives
// Most addictive mode — tracks personal best

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuestions } from '@/api/games'
import useGameStore from '@/store/gameStore'
import { useGameSession } from '@/hooks/useGameSession'
import TimerBar from '@/components/games/TimerBar'
import QuestionCard from '@/components/games/QuestionCard'
import ComboDisplay from '@/components/games/ComboDisplay'
import GameResult from '@/components/games/GameResult'

export default function SurvivalArena() {
  const navigate = useNavigate()
  const { startGame, showResult, lastResult, resetGame, isPlaying, lives } = useGameStore()
  const [starting, setStarting] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // Reset any leftover game state when this game mounts
  useEffect(() => { resetGame() }, [])

  async function handleStart() {
    setStarting(true)
    setLoadError(null)
    try {
      // Survival uses all game types mixed — fetch a big batch
      const { questions } = await fetchQuestions('survival', { size: 30 })
      if (!questions?.length) throw new Error('No questions available')
      startGame('survival', questions)
    } catch (e) {
      setLoadError(e.message)
    } finally {
      setStarting(false)
    }
  }

  function handlePlayAgain() { resetGame(); handleStart() }

  if (showResult) return <GameResult result={lastResult} gameType="survival" onPlayAgain={handlePlayAgain} />
  if (!isPlaying) return (
    <StartScreen onStart={handleStart} starting={starting} error={loadError} onBack={() => navigate('/games')} />
  )

  return <ActiveGame lives={lives} />
}

function ActiveGame({ lives }) {
  const {
    question, timeLeft, answered, chosenAnswer, isCorrect,
    streak, rawScore, currentIndex, totalQuestions, handleAnswer,
  } = useGameSession({ timeLimit: 15, feedbackDuration: 1500 })

  const livesLeft = Math.max(0, lives)

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Lives display */}
      <div className="flex justify-center gap-2 pt-3 pb-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`text-2xl transition-all duration-300 ${
              i < livesLeft ? 'opacity-100' : 'opacity-20 grayscale'
            } ${i < livesLeft && answered && !isCorrect && i === livesLeft - 1 ? 'animate-pulse' : ''}`}
          >
            ❤️
          </span>
        ))}
      </div>

      <TimerBar
        timeLeft={timeLeft}
        maxTime={15}
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

      {/* Survival counter */}
      <div className="text-center py-2 text-slate-500 text-xs">
        Survived: {currentIndex} questions
      </div>
    </div>
  )
}

function StartScreen({ onStart, starting, error, onBack }) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">💀</div>
      <h1 className="text-2xl font-black text-white mb-2">Survival Arena</h1>
      <p className="text-slate-400 text-sm mb-1">3 lives — Mixed subjects — How far can you go?</p>
      <p className="text-slate-500 text-xs mb-6">One wrong answer = lose a life. Zero lives = game over.</p>

      <div className="w-full max-w-xs bg-[#1a2744] rounded-xl p-4 border border-slate-700/60 mb-6 text-left space-y-2">
        <p className="text-slate-300 text-xs">❤️ Start with 3 lives</p>
        <p className="text-slate-300 text-xs">📈 Difficulty increases every 10 questions</p>
        <p className="text-slate-300 text-xs">🔀 Mixed: Calculation · Series · Vocab · Syllogism</p>
        <p className="text-slate-300 text-xs">🏆 Your record is how many questions you survived</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <button
        onClick={onStart}
        disabled={starting}
        className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold text-base disabled:opacity-50"
      >
        {starting ? 'Loading…' : 'Enter the Arena 💀'}
      </button>
      <button onClick={onBack} className="mt-3 text-slate-500 text-sm">← Back to Hub</button>
    </div>
  )
}