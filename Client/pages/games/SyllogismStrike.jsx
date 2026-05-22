// src/pages/games/SyllogismStrike.jsx
// Route: /games/syllogism
// True/False rapid fire — 15s per question
// "All A is B. Some B is C." — Is the conclusion correct?

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuestions } from '@/api/games'
import useGameStore from '@/store/gameStore'
import { useGameSession } from '@/hooks/useGameSession'
import TimerBar from '@/components/games/TimerBar'
import ComboDisplay from '@/components/games/ComboDisplay'
import GameResult from '@/components/games/GameResult'

export default function SyllogismStrike() {
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
      const { questions } = await fetchQuestions('syllogism', { size: 20 })
      if (!questions?.length) throw new Error('No questions available')
      startGame('syllogism', questions)
    } catch (e) {
      setLoadError(e.message)
    } finally {
      setStarting(false)
    }
  }

  function handlePlayAgain() { resetGame(); handleStart() }

  if (showResult) return <GameResult result={lastResult} gameType="syllogism" onPlayAgain={handlePlayAgain} />
  if (!isPlaying) return (
    <StartScreen onStart={handleStart} starting={starting} error={loadError} onBack={() => navigate('/games')} />
  )

  return <ActiveGame />
}

function ActiveGame() {
  const {
    question, timeLeft, answered, chosenAnswer, isCorrect,
    streak, rawScore, currentIndex, totalQuestions, handleAnswer,
  } = useGameSession({ timeLimit: 15, feedbackDuration: 2000 })

  if (!question) return null

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <TimerBar
        timeLeft={timeLeft}
        maxTime={15}
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        streak={streak}
      />

      {/* Syllogism card */}
      <div className="flex-1 flex flex-col gap-4 px-4 pb-4 pt-2">
        <div className="bg-[#1a2744] rounded-2xl p-5 shadow-lg border border-slate-700/60">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-3">Given Statements:</p>
          <p className="text-slate-100 text-base font-semibold leading-relaxed whitespace-pre-line">
            {question.questionText}
          </p>
        </div>

        {/* Conclusion */}
        {question.explanation && !answered && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-300 text-sm">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wide mr-2">Conclusion:</span>
            {question.explanation.split('Conclusion:')[1]?.trim() || question.explanation}
          </div>
        )}

        {/* True / False buttons */}
        {!answered ? (
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => handleAnswer('True')}
              className="flex-1 py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-xl active:scale-95 transition-all"
            >
              ✓ TRUE
            </button>
            <button
              onClick={() => handleAnswer('False')}
              className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xl active:scale-95 transition-all"
            >
              ✗ FALSE
            </button>
          </div>
        ) : (
          <div className={`rounded-xl p-4 border ${isCorrect ? 'bg-green-900/30 border-green-600' : 'bg-red-900/30 border-red-600'}`}>
            <div className={`font-bold text-sm mb-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {isCorrect ? '✓ Correct!' : `✗ Wrong — Answer: ${question.answer}`}
            </div>
            {question.explanation && (
              <div className="text-slate-300 text-xs">{question.explanation}</div>
            )}
          </div>
        )}
      </div>

      <ComboDisplay streak={streak} score={rawScore} />
    </div>
  )
}

function StartScreen({ onStart, starting, error, onBack }) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🧠</div>
      <h1 className="text-2xl font-black text-white mb-2">Syllogism Strike</h1>
      <p className="text-slate-400 text-sm mb-1">Logic rapid fire — True or False?</p>
      <p className="text-slate-500 text-xs mb-6">
        "All A is B. Some B is C." — Is the conclusion valid? 15 seconds to decide.
      </p>

      <div className="w-full max-w-xs bg-[#1a2744] rounded-xl p-4 border border-slate-700/60 mb-6 text-left space-y-2">
        <p className="text-slate-300 text-xs">✦ 2-statement → 3-statement → complex</p>
        <p className="text-slate-300 text-xs">✦ ~50% True, ~50% False (no pattern guessing!)</p>
        <p className="text-slate-300 text-xs">✦ Full explanation shown on wrong answer</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <button
        onClick={onStart}
        disabled={starting}
        className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold text-base disabled:opacity-50"
      >
        {starting ? 'Loading…' : 'Start Strike 🧠'}
      </button>
      <button onClick={onBack} className="mt-3 text-slate-500 text-sm">← Back to Hub</button>
    </div>
  )
}