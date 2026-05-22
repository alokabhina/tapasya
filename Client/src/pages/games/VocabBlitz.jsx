// src/pages/games/VocabBlitz.jsx
// Route: /games/vocab

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuestions } from '@/api/games'
import useGameStore from '@/store/gameStore'
import { useGameSession } from '@/hooks/useGameSession'
import TimerBar from '@/components/games/TimerBar'
import QuestionCard from '@/components/games/QuestionCard'
import ComboDisplay from '@/components/games/ComboDisplay'
import GameResult from '@/components/games/GameResult'
import GameStartScreen from '@/components/games/GameStartScreen'

export default function VocabBlitz() {
  const navigate = useNavigate()
  const { startGame, showResult, lastResult, resetGame, isPlaying } = useGameStore()
  const [starting,  setStarting]  = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => { resetGame() }, [])

  async function handleStart() {
    setStarting(true); setLoadError(null)
    try {
      const { questions } = await fetchQuestions('vocab', { size: 20 })
      if (!questions?.length) throw new Error('No questions available')
      startGame('vocab', questions)
    } catch (e) { setLoadError(e.message) }
    finally     { setStarting(false) }
  }

  if (showResult)  return <GameResult result={lastResult} gameType="vocab" onPlayAgain={() => { resetGame(); handleStart() }} />
  if (!isPlaying)  return (
    <GameStartScreen
      icon="📖"
      title="Vocab Blitz"
      subtitle="Synonyms · Antonyms · One-word substitution"
      hint="8 seconds per word — wrong words come back automatically"
      btnLabel="Start Blitz 📖"
      btnGradient="from-pink-500 to-purple-600"
      btnShadow="rgba(236,72,153,0.4)"
      onStart={handleStart}
      starting={starting}
      error={loadError}
      onBack={() => navigate('/games')}
      rules={[
        { icon: '📚', text: 'Bank exam word bank — high value words' },
        { icon: '🔁', text: 'Spaced repetition — missed words return next session' },
        { icon: '⚡', text: 'Powered by seed questions + OpenTDB live updates' },
        { icon: '⏱', text: '8 seconds per word — stay sharp!' },
      ]}
    />
  )
  return <ActiveGame />
}

function ActiveGame() {
  const {
    question, timeLeft, answered, chosenAnswer, isCorrect,
    streak, rawScore, currentIndex, totalQuestions, handleAnswer,
  } = useGameSession({ timeLimit: 8, feedbackDuration: 1200 })

  const isSynonym = question?.tags?.includes('synonym')
  const isAntonym = question?.tags?.includes('antonym')

  return (
    <div className="min-h-screen bg-[#080d1a] flex flex-col">
      {/* Vocab type badge */}
      {(isSynonym || isAntonym) && (
        <div
          className="text-center py-1.5 text-[11px] font-black tracking-widest uppercase"
          style={{
            background: isSynonym ? 'rgba(139,92,246,0.12)' : 'rgba(236,72,153,0.12)',
            color:      isSynonym ? '#a78bfa' : '#f472b6',
            borderBottom: `1px solid ${isSynonym ? 'rgba(139,92,246,0.2)' : 'rgba(236,72,153,0.2)'}`,
          }}
        >
          {isSynonym ? '≈ SYNONYM' : '≠ ANTONYM'}
        </div>
      )}
      <TimerBar timeLeft={timeLeft} maxTime={8} currentIndex={currentIndex} totalQuestions={totalQuestions} streak={streak} />
      <QuestionCard question={question} answered={answered} chosenAnswer={chosenAnswer} isCorrect={isCorrect} onAnswer={handleAnswer} />
      <ComboDisplay streak={streak} score={rawScore} />
    </div>
  )
}