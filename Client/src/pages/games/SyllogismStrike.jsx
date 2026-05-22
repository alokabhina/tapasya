// src/pages/games/SyllogismStrike.jsx
// Route: /games/syllogism

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuestions } from '@/api/games'
import useGameStore from '@/store/gamesStore'
import { useGameSession } from '@/hooks/useGameSession'
import TimerBar from '@/components/games/TimerBar'
import ComboDisplay from '@/components/games/ComboDisplay'
import GameResult from '@/components/games/GameResult'
import GameStartScreen from '@/components/games/GameStartScreen'

export default function SyllogismStrike() {
  const navigate = useNavigate()
  const { startGame, showResult, lastResult, resetGame, isPlaying } = useGameStore()
  const [starting,  setStarting]  = useState(false)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => { resetGame() }, [])

  async function handleStart() {
    setStarting(true); setLoadError(null)
    try {
      const { questions } = await fetchQuestions('syllogism', { size: 20 })
      if (!questions?.length) throw new Error('No questions available')
      startGame('syllogism', questions)
    } catch (e) { setLoadError(e.message) }
    finally     { setStarting(false) }
  }

  if (showResult)  return <GameResult result={lastResult} gameType="syllogism" onPlayAgain={() => { resetGame(); handleStart() }} />
  if (!isPlaying)  return (
    <GameStartScreen
      icon="🧠"
      title="Syllogism Strike"
      subtitle="Logic rapid fire — True or False?"
      hint='"All A is B. Some B is C." — Is the conclusion valid? 15s to decide.'
      btnLabel="Start Strike 🧠"
      btnGradient="from-violet-500 to-purple-600"
      btnShadow="rgba(139,92,246,0.4)"
      onStart={handleStart}
      starting={starting}
      error={loadError}
      onBack={() => navigate('/games')}
      rules={[
        { icon: '📊', text: '2-statement → 3-statement → complex' },
        { icon: '🎲', text: '~50% True, ~50% False — no pattern guessing!' },
        { icon: '💡', text: 'Full explanation shown on wrong answer' },
        { icon: '⏱', text: '15 seconds per question' },
      ]}
    />
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
    <div className="min-h-screen bg-[#080d1a] flex flex-col">
      <TimerBar timeLeft={timeLeft} maxTime={15} currentIndex={currentIndex} totalQuestions={totalQuestions} streak={streak} />

      <div className="flex-1 flex flex-col gap-3 px-4 pb-4 pt-2">
        {/* Statements card */}
        <div className="rounded-2xl px-5 py-5" style={{
          background: 'linear-gradient(135deg, #131d33 0%, #0f1a2e 100%)',
          border:     '1px solid rgba(255,255,255,0.07)',
          boxShadow:  '0 4px 24px rgba(0,0,0,0.4)',
        }}>
          <p className="text-violet-400 text-[10px] font-black uppercase tracking-widest mb-3">Given Statements</p>
          <p className="text-slate-100 text-base font-semibold leading-relaxed whitespace-pre-line">
            {question.questionText}
          </p>
        </div>

        {/* Conclusion */}
        {question.explanation && !answered && (
          <div className="rounded-xl px-4 py-3" style={{
            background: 'rgba(139,92,246,0.08)',
            border:     '1px solid rgba(139,92,246,0.2)',
          }}>
            <span className="text-violet-400 text-[10px] font-black uppercase tracking-widest mr-2">Conclusion:</span>
            <span className="text-slate-300 text-sm">
              {question.explanation.split('Conclusion:')[1]?.trim() || question.explanation}
            </span>
          </div>
        )}

        {/* True / False */}
        {!answered ? (
          <div className="flex gap-3 mt-1">
            <button
              onClick={() => handleAnswer('True')}
              className="flex-1 py-5 rounded-2xl flex flex-col items-center gap-1.5 font-black active:scale-95 transition-all duration-150"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                boxShadow:  '0 4px 20px rgba(22,163,74,0.35)',
              }}
            >
              <span className="text-3xl">✓</span>
              <span className="text-white text-sm tracking-widest">TRUE</span>
            </button>
            <button
              onClick={() => handleAnswer('False')}
              className="flex-1 py-5 rounded-2xl flex flex-col items-center gap-1.5 font-black active:scale-95 transition-all duration-150"
              style={{
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                boxShadow:  '0 4px 20px rgba(220,38,38,0.35)',
              }}
            >
              <span className="text-3xl">✗</span>
              <span className="text-white text-sm tracking-widest">FALSE</span>
            </button>
          </div>
        ) : (
          <div className="rounded-xl px-4 py-3" style={{
            background: isCorrect ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
            border:     isCorrect ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(248,113,113,0.25)',
            animation:  'fadeUp 0.25s ease both',
          }}>
            <p className={`font-bold text-sm mb-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {isCorrect ? '✓ Correct!' : `✗ Wrong — Answer: ${question.answer}`}
            </p>
            {question.explanation && (
              <p className="text-slate-300 text-xs leading-relaxed">{question.explanation}</p>
            )}
          </div>
        )}
      </div>

      <ComboDisplay streak={streak} score={rawScore} />
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(6px) }
          to   { opacity:1; transform:translateY(0) }
        }
      `}</style>
    </div>
  )
}