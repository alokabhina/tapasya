// src/pages/games/VocabBlitz.jsx
// Route: /games/vocab
// Synonym/antonym/one-word flashcards, 8s per word
// Wrong words come back via spaced repetition
// Supplemented by OpenTDB

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuestions } from '@/api/games'
import useGameStore from '@/store/gameStore'
import { useGameSession } from '@/hooks/useGameSession'
import TimerBar from '@/components/games/TimerBar'
import QuestionCard from '@/components/games/QuestionCard'
import ComboDisplay from '@/components/games/ComboDisplay'
import GameResult from '@/components/games/GameResult'

export default function VocabBlitz() {
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
      const { questions } = await fetchQuestions('vocab', { size: 20 })
      if (!questions?.length) throw new Error('No questions available')
      startGame('vocab', questions)
    } catch (e) {
      setLoadError(e.message)
    } finally {
      setStarting(false)
    }
  }

  function handlePlayAgain() { resetGame(); handleStart() }

  if (showResult) return <GameResult result={lastResult} gameType="vocab" onPlayAgain={handlePlayAgain} />
  if (!isPlaying) return (
    <StartScreen onStart={handleStart} starting={starting} error={loadError} onBack={() => navigate('/games')} />
  )

  return <ActiveGame />
}

function ActiveGame() {
  const {
    question, timeLeft, answered, chosenAnswer, isCorrect,
    streak, rawScore, currentIndex, totalQuestions, handleAnswer,
  } = useGameSession({ timeLimit: 8, feedbackDuration: 1200 })

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Vocab type badge */}
      {question?.tags?.includes('synonym') && (
        <div className="bg-purple-900/40 text-purple-300 text-xs text-center py-1 font-semibold tracking-wide">SYNONYM</div>
      )}
      {question?.tags?.includes('antonym') && (
        <div className="bg-pink-900/40 text-pink-300 text-xs text-center py-1 font-semibold tracking-wide">ANTONYM</div>
      )}

      <TimerBar
        timeLeft={timeLeft}
        maxTime={8}
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
      <div className="text-5xl mb-4">📖</div>
      <h1 className="text-2xl font-black text-white mb-2">Vocab Blitz</h1>
      <p className="text-slate-400 text-sm mb-1">Synonyms · Antonyms · One-word substitution</p>
      <p className="text-slate-500 text-xs mb-6">8 seconds per word — wrong words come back automatically</p>

      <div className="w-full max-w-xs bg-[#1a2744] rounded-xl p-4 border border-slate-700/60 mb-6 text-left space-y-2">
        <p className="text-slate-300 text-xs">✦ Bank exam word bank — high value words</p>
        <p className="text-slate-300 text-xs">✦ Spaced repetition — missed words return next session</p>
        <p className="text-slate-300 text-xs">✦ Powered by seed questions + OpenTDB live updates</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      <button
        onClick={onStart}
        disabled={starting}
        className="w-full max-w-xs py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-base disabled:opacity-50"
      >
        {starting ? 'Loading…' : 'Start Blitz 📖'}
      </button>
      <button onClick={onBack} className="mt-3 text-slate-500 text-sm">← Back to Hub</button>
    </div>
  )
}