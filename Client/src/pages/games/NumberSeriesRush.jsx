// src/pages/games/NumberSeriesRush.jsx
// Route: /games/series

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuestions } from '@/api/games'
import useGameStore from '@/store/gameStore'
import { useGameSession } from '@/hooks/useGameSession'
import TimerBar from '@/components/games/TimerBar'
import QuestionCard from '@/components/games/QuestionCard'
import ComboDisplay from '@/components/games/ComboDisplay'
import GameResult from '@/components/games/GameResult'
import GameStartScreen from '@/components/games/GameStartScreen'

export default function NumberSeriesRush() {
  const navigate = useNavigate()
  const { startGame, showResult, lastResult, resetGame, isPlaying } = useGameStore()
  const [starting,  setStarting]  = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => { resetGame() }, [])

  async function handleStart() {
    setStarting(true); setLoadError(null)
    try {
      const { questions } = await fetchQuestions('series', { size: 20 })
      if (!questions?.length) throw new Error('No questions available')
      startGame('series', questions)
    } catch (e) { setLoadError(e.message) }
    finally     { setStarting(false) }
  }

  if (showResult)  return <GameResult result={lastResult} gameType="series" onPlayAgain={() => { resetGame(); handleStart() }} />
  if (!isPlaying)  return (
    <GameStartScreen
      icon="📈"
      title="Number Series Rush"
      subtitle="Find the next number in the pattern"
      hint="2, 6, 12, 20, ? — Tap before time runs out"
      btnLabel="Start Rush 📈"
      btnGradient="from-blue-500 to-cyan-500"
      btnShadow="rgba(59,130,246,0.4)"
      onStart={handleStart}
      starting={starting}
      error={loadError}
      onBack={() => navigate('/games')}
      rules={[
        { icon: '➕', label: 'Easy',   text: 'Arithmetic progressions' },
        { icon: '✖️', label: 'Medium', text: 'Geometric progressions' },
        { icon: '🌀', label: 'Hard',   text: 'Mixed & Fibonacci-type' },
        { icon: '💡', text: 'Pattern explanation shown on wrong answer' },
      ]}
    />
  )
  return <ActiveGame />
}

function ActiveGame() {
  const {
    question, timeLeft, answered, chosenAnswer, isCorrect,
    streak, rawScore, currentIndex, totalQuestions, handleAnswer,
  } = useGameSession({ timeLimit: 30, feedbackDuration: 2000 })

  return (
    <div className="min-h-screen bg-[#080d1a] flex flex-col">
      <TimerBar timeLeft={timeLeft} maxTime={30} currentIndex={currentIndex} totalQuestions={totalQuestions} streak={streak} />
      <QuestionCard question={question} answered={answered} chosenAnswer={chosenAnswer} isCorrect={isCorrect} onAnswer={handleAnswer} />
      <ComboDisplay streak={streak} score={rawScore} />
    </div>
  )
}