// src/components/games/QuestionCard.jsx
// Gamified question card — labeled options (A/B/C/D), correct burst, wrong shake,
// smooth entry animation per question, explanation panel

import { useEffect, useRef, useState } from 'react'

const LABELS = ['A', 'B', 'C', 'D']

export default function QuestionCard({
  question,
  answered,
  chosenAnswer,
  isCorrect,
  onAnswer,
}) {
  const [visible, setVisible] = useState(false)
  const prevQ = useRef(null)

  // Animate in whenever a new question arrives
  useEffect(() => {
    if (!question) return
    if (question !== prevQ.current) {
      setVisible(false)
      const t = setTimeout(() => setVisible(true), 30)
      prevQ.current = question
      return () => clearTimeout(t)
    }
  }, [question])

  if (!question) return null
  const { questionText, options = [], answer, explanation } = question

  return (
    <div
      className="flex-1 flex flex-col gap-3 px-4 pb-4 pt-2"
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      {/* ── Question bubble ─────────────────────────────────────── */}
      <div
        className="rounded-2xl px-5 py-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #131d33 0%, #0f1a2e 100%)',
          border:     '1px solid rgba(255,255,255,0.07)',
          boxShadow:  '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Decorative corner glow */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-500/5 pointer-events-none" />

        <p className="text-slate-100 text-xl font-bold leading-snug text-center relative z-10">
          {questionText}
        </p>
      </div>

      {/* ── Options 2×2 grid ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, i) => {
          const isAnswer  = opt === answer
          const isChosen  = opt === chosenAnswer
          const wrongPick = isChosen && !isCorrect

          let state = 'idle'
          if (answered) {
            if (isAnswer)   state = 'correct'
            else if (wrongPick) state = 'wrong'
            else            state = 'dim'
          }

          return (
            <OptionButton
              key={i}
              label={LABELS[i]}
              text={opt}
              state={state}
              answered={answered}
              onClick={() => !answered && onAnswer(opt)}
            />
          )
        })}
      </div>

      {/* ── Feedback panel ──────────────────────────────────────── */}
      {answered && (
        <FeedbackPanel isCorrect={isCorrect} explanation={explanation} answer={answer} />
      )}
    </div>
  )
}

// ── Option Button ─────────────────────────────────────────────────────────────
function OptionButton({ label, text, state, answered, onClick }) {
  const styles = {
    idle: {
      bg:     'linear-gradient(135deg, #131d33 0%, #0f1a2e 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      text:   '#cbd5e1',
      shadow: '0 2px 8px rgba(0,0,0,0.3)',
      scale:  1,
    },
    correct: {
      bg:     'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
      border: '1px solid rgba(74,222,128,0.5)',
      text:   '#ffffff',
      shadow: '0 0 20px rgba(74,222,128,0.35)',
      scale:  1.03,
    },
    wrong: {
      bg:     'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
      border: '1px solid rgba(248,113,113,0.5)',
      text:   '#ffffff',
      shadow: '0 0 16px rgba(248,113,113,0.3)',
      scale:  1,
    },
    dim: {
      bg:     'linear-gradient(135deg, #0d1220 0%, #0a1020 100%)',
      border: '1px solid rgba(255,255,255,0.03)',
      text:   '#475569',
      shadow: 'none',
      scale:  0.98,
    },
  }

  const s = styles[state] || styles.idle
  const labelColors = {
    idle:    { bg: 'rgba(255,255,255,0.08)', text: '#64748b' },
    correct: { bg: 'rgba(255,255,255,0.2)',  text: '#ffffff' },
    wrong:   { bg: 'rgba(255,255,255,0.2)',  text: '#ffffff' },
    dim:     { bg: 'rgba(255,255,255,0.03)', text: '#334155' },
  }
  const lc = labelColors[state] || labelColors.idle

  return (
    <button
      onClick={onClick}
      disabled={answered}
      className="relative min-h-[64px] px-3 py-3 rounded-xl text-left flex items-center gap-3 active:scale-95 group"
      style={{
        background:   s.bg,
        border:       s.border,
        boxShadow:    s.shadow,
        transform:    `scale(${s.scale})`,
        transition:   'all 0.22s ease',
        animation:    state === 'wrong'   ? 'shakeX 0.4s ease' :
                      state === 'correct' ? 'popIn 0.3s ease'  : 'none',
      }}
    >
      {/* Label badge */}
      <span
        className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-black transition-all duration-200"
        style={{ background: lc.bg, color: lc.text }}
      >
        {label}
      </span>

      {/* Option text */}
      <span
        className="font-semibold text-sm leading-snug flex-1"
        style={{ color: s.text, transition: 'color 0.2s ease' }}
      >
        {text}
      </span>

      {/* Correct tick */}
      {state === 'correct' && (
        <span className="text-green-300 text-base flex-shrink-0" style={{ animation: 'popIn 0.25s ease 0.1s both' }}>
          ✓
        </span>
      )}
      {/* Wrong cross */}
      {state === 'wrong' && (
        <span className="text-red-300 text-base flex-shrink-0">✗</span>
      )}

      {/* Hover shimmer (idle only) */}
      {!answered && (
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(59,130,246,0.06) 100%)' }}
        />
      )}
    </button>
  )
}

// ── Feedback Panel ────────────────────────────────────────────────────────────
function FeedbackPanel({ isCorrect, explanation, answer }) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-start gap-3"
      style={{
        background: isCorrect
          ? 'linear-gradient(135deg, rgba(22,163,74,0.15) 0%, rgba(15,118,54,0.10) 100%)'
          : 'linear-gradient(135deg, rgba(180,83,9,0.18) 0%, rgba(120,53,15,0.12) 100%)',
        border: isCorrect ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(251,191,36,0.25)',
        animation: 'fadeUp 0.25s ease both',
      }}
    >
      <span className="text-xl flex-shrink-0 mt-0.5">{isCorrect ? '🎯' : '💡'}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm mb-0.5 ${isCorrect ? 'text-green-400' : 'text-amber-400'}`}>
          {isCorrect ? 'Correct!' : `Answer: ${answer}`}
        </p>
        {!isCorrect && explanation && (
          <p className="text-slate-300 text-xs leading-relaxed">{explanation}</p>
        )}
        {isCorrect && (
          <p className="text-green-300/70 text-xs">Keep the streak going! 🔥</p>
        )}
      </div>
    </div>
  )
}