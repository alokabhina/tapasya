// pages/games/GrammarGladiator.jsx
// Route: /games/grammar
// 6-level progression — each level has specific grammar topics
// Must pass (score >= passMark) to unlock the next level
// Unlock state persisted in localStorage

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchQuestions, submitGame } from '@/api/games'
import useGameStore from '@/store/gameStore'

// ── Level definitions ─────────────────────────────────────────────────────────
const LEVELS = [
  {
    id: 1,
    title: 'The Foundation',
    subtitle: 'Articles · Conjunctions · Parts of Speech',
    icon: '🧱',
    color: 'from-emerald-500 to-teal-500',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-950/30',
    textColor: 'text-emerald-400',
    topics: ['Articles', 'Conjunctions', 'Parts of Speech'],
    questionsPerLevel: 10,
    passMark: 6,
    timeLimit: 20,
  },
  {
    id: 2,
    title: 'Agreement & Place',
    subtitle: 'Subject-Verb Agreement · Prepositions',
    icon: '⚖️',
    color: 'from-blue-500 to-cyan-500',
    borderColor: 'border-blue-500/50',
    bgColor: 'bg-blue-950/30',
    textColor: 'text-blue-400',
    topics: ['Subject-Verb Agreement', 'Prepositions'],
    questionsPerLevel: 10,
    passMark: 6,
    timeLimit: 20,
  },
  {
    id: 3,
    title: 'Time & Possibility',
    subtitle: 'Tenses · Modals · Conditionals',
    icon: '⏱️',
    color: 'from-violet-500 to-purple-500',
    borderColor: 'border-violet-500/50',
    bgColor: 'bg-violet-950/30',
    textColor: 'text-violet-400',
    topics: ['Tenses', 'Modals', 'Conditionals'],
    questionsPerLevel: 10,
    passMark: 6,
    timeLimit: 20,
  },
  {
    id: 4,
    title: 'Spot the Error',
    subtitle: 'Error Spotting · Active/Passive Voice',
    icon: '🔍',
    color: 'from-orange-500 to-amber-500',
    borderColor: 'border-orange-500/50',
    bgColor: 'bg-orange-950/30',
    textColor: 'text-orange-400',
    topics: ['Error Spotting', 'Active/Passive Voice'],
    questionsPerLevel: 10,
    passMark: 7,
    timeLimit: 22,
  },
  {
    id: 5,
    title: 'Fix & Report',
    subtitle: 'Sentence Correction · Narration · Gerund',
    icon: '✏️',
    color: 'from-pink-500 to-rose-500',
    borderColor: 'border-pink-500/50',
    bgColor: 'bg-pink-950/30',
    textColor: 'text-pink-400',
    topics: ['Sentence Correction', 'Direct/Indirect Speech', 'Gerund/Infinitive'],
    questionsPerLevel: 10,
    passMark: 7,
    timeLimit: 22,
  },
  {
    id: 6,
    title: 'Grand Finale',
    subtitle: 'Fill in the Blank · Comparatives · Mixed',
    icon: '👑',
    color: 'from-yellow-400 to-amber-500',
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-950/30',
    textColor: 'text-yellow-400',
    topics: ['Fill in the Blank', 'Comparatives/Superlatives'],
    questionsPerLevel: 10,
    passMark: 7,
    timeLimit: 22,
  },
]

// ── Topic color badges ────────────────────────────────────────────────────────
const TOPIC_COLORS = {
  'Articles':               'bg-indigo-900/60 text-indigo-300 border-indigo-700/50',
  'Subject-Verb Agreement': 'bg-violet-900/60 text-violet-300 border-violet-700/50',
  'Tenses':                 'bg-blue-900/60 text-blue-300 border-blue-700/50',
  'Prepositions':           'bg-cyan-900/60 text-cyan-300 border-cyan-700/50',
  'Conjunctions':           'bg-teal-900/60 text-teal-300 border-teal-700/50',
  'Error Spotting':         'bg-red-900/60 text-red-300 border-red-700/50',
  'Sentence Correction':    'bg-orange-900/60 text-orange-300 border-orange-700/50',
  'Active/Passive Voice':   'bg-amber-900/60 text-amber-300 border-amber-700/50',
  'Direct/Indirect Speech': 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50',
  'Modals':                 'bg-lime-900/60 text-lime-300 border-lime-700/50',
  'Gerund/Infinitive':      'bg-green-900/60 text-green-300 border-green-700/50',
  'Conditionals':           'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
  'Parts of Speech':        'bg-pink-900/60 text-pink-300 border-pink-700/50',
  'Fill in the Blank':      'bg-rose-900/60 text-rose-300 border-rose-700/50',
  'Comparatives/Superlatives': 'bg-fuchsia-900/60 text-fuchsia-300 border-fuchsia-700/50',
}
const DEFAULT_TOPIC_COLOR = 'bg-slate-800/60 text-slate-300 border-slate-700/50'

// ── localStorage progress helpers ─────────────────────────────────────────────
const STORAGE_KEY = 'grammar_gladiator_v1'

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { unlockedUpTo: 1, bestScores: {} }
  } catch {
    return { unlockedUpTo: 1, bestScores: {} }
  }
}

function saveProgress(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
}

function calcPts(correct, timeTaken) {
  if (!correct) return -3
  if (timeTaken < 4) return 20
  if (timeTaken < 8) return 15
  return 10
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function GrammarGladiator() {
  const navigate  = useNavigate()
  const { resetGame } = useGameStore()

  const [screen,   setScreen]  = useState('hub')       // hub | intro | playing | result
  const [level,    setLevel]   = useState(null)
  const [progress, setProgress] = useState(loadProgress)
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState(null)
  const [questions, setQuestions] = useState([])
  const [levelResult, setLevelResult] = useState(null)  // {correct, total, passed, breakdown}

  useEffect(() => { resetGame() }, [])

  // ── Select a level ────────────────────────────────────────────────────────
  function selectLevel(lvl) {
    if (lvl.id > progress.unlockedUpTo) return
    setLevel(lvl)
    setError(null)
    setScreen('intro')
  }

  // ── Load questions for the level and start playing ────────────────────────
  async function startLevel() {
    setLoading(true)
    setError(null)
    try {
      // Fetch a generous batch then filter by topic client-side
      const diffLevel = level.id <= 2 ? 1 : level.id <= 4 ? 2 : 3
      const { questions: raw } = await fetchQuestions('grammar', { level: diffLevel, size: 60 })

      // Filter by level's topics
      let filtered = raw.filter(q =>
        level.topics.some(t => q.topic === t)
      )
      // Fallback: if topic pool is thin, widen to all questions of that difficulty
      if (filtered.length < level.questionsPerLevel) filtered = raw
      const batch = shuffle(filtered).slice(0, level.questionsPerLevel)
      if (!batch.length) throw new Error('No questions found. Make sure the grammar seed is loaded.')
      setQuestions(batch)
      setScreen('playing')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Level finished callback ───────────────────────────────────────────────
  function handleLevelComplete(correct, total, breakdown) {
    const passed = correct >= level.passMark

    const next = { ...progress }
    if (!next.bestScores) next.bestScores = {}
    next.bestScores[level.id] = Math.max(next.bestScores[level.id] ?? 0, correct)
    if (passed && level.id >= next.unlockedUpTo && level.id < 6) {
      next.unlockedUpTo = level.id + 1
    }
    saveProgress(next)
    setProgress(next)

    // Fire-and-forget server submit for XP
    submitGame({
      gameType: 'grammar',
      breakdown,
      rawScore: breakdown.reduce((s, b) => s + b.pointsEarned, 0),
      correctCount: correct,
      wrongCount: total - correct,
      maxStreak: 0,
      avgTimeSecs: 0,
    }).catch(() => {})

    setLevelResult({ correct, total, passed })
    setScreen('result')
  }

  // ── Screens ───────────────────────────────────────────────────────────────
  if (screen === 'playing' && level && questions.length) {
    return (
      <ActiveGame
        level={level}
        questions={questions}
        onComplete={handleLevelComplete}
        onBack={() => setScreen('hub')}
      />
    )
  }

  if (screen === 'result' && levelResult) {
    const nextLvl = LEVELS.find(l => l.id === level.id + 1)
    return (
      <LevelResult
        level={level}
        result={levelResult}
        progress={progress}
        onRetry={() => { setScreen('intro') }}
        onNext={() => {
          if (nextLvl && nextLvl.id <= progress.unlockedUpTo) {
            setLevel(nextLvl)
            setScreen('intro')
          } else {
            setScreen('hub')
          }
        }}
        onHub={() => setScreen('hub')}
        canNext={!!nextLvl && nextLvl.id <= progress.unlockedUpTo}
        nextLevel={nextLvl}
      />
    )
  }

  if (screen === 'intro' && level) {
    return (
      <LevelIntro
        level={level}
        progress={progress}
        loading={loading}
        error={error}
        onStart={startLevel}
        onBack={() => setScreen('hub')}
      />
    )
  }

  return (
    <Hub
      progress={progress}
      onSelect={selectLevel}
      onBack={() => navigate('/games')}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HUB — level map
// ─────────────────────────────────────────────────────────────────────────────
function Hub({ progress, onSelect, onBack }) {
  const done = Object.keys(progress.bestScores || {}).length
  const pct  = Math.min(100, Math.round(((progress.unlockedUpTo - 1) / 6) * 100))

  return (
    <div className="min-h-screen bg-[#0b0f1e] px-4 pb-28">
      {/* Header */}
      <div className="pt-6 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="text-slate-500 text-sm hover:text-slate-300 px-1">←</button>
        <div>
          <h1 className="text-xl font-black text-white">✍️ Grammar Gladiator</h1>
          <p className="text-slate-500 text-xs">Complete each level to unlock the next</p>
        </div>
      </div>

      {/* Overall progress */}
      <div className="mb-5 bg-[#131929] rounded-2xl p-3.5 border border-slate-700/50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Progress</span>
          <span className="text-xs text-indigo-400 font-bold">
            {Math.min(progress.unlockedUpTo - 1, 6)} / 6 Levels Unlocked
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          {LEVELS.map(l => (
            <div
              key={l.id}
              className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold border
                ${l.id <= progress.unlockedUpTo
                  ? `bg-gradient-to-br ${l.color} border-transparent text-white`
                  : 'bg-slate-800 border-slate-700 text-slate-600'}`}
            >
              {l.id}
            </div>
          ))}
        </div>
      </div>

      {/* Level cards */}
      <div className="space-y-3">
        {LEVELS.map((lvl) => {
          const locked    = lvl.id > progress.unlockedUpTo
          const best      = (progress.bestScores || {})[lvl.id]
          const completed = best !== undefined
          const isCurrent = lvl.id === progress.unlockedUpTo

          return (
            <button
              key={lvl.id}
              onClick={() => onSelect(lvl)}
              disabled={locked}
              className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 relative overflow-hidden
                ${locked
                  ? 'bg-[#0f1420]/80 border-slate-800/80 opacity-50 cursor-not-allowed'
                  : `${lvl.bgColor} ${lvl.borderColor} cursor-pointer active:scale-[0.98] hover:brightness-110`}
                ${isCurrent && !completed ? 'ring-1 ring-indigo-500/30' : ''}
              `}
            >
              {/* Top gradient line */}
              {!locked && (
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${lvl.color}`} />
              )}

              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`w-13 h-13 w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
                  ${locked ? 'bg-slate-800 text-slate-600' : `bg-gradient-to-br ${lvl.color}`}`}>
                  {locked ? '🔒' : lvl.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wide">Lv {lvl.id}</span>
                    {isCurrent && !completed && (
                      <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold px-1.5 rounded-full">
                        START HERE
                      </span>
                    )}
                    {completed && (
                      <span className="bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold px-1.5 rounded-full">
                        ✓ {best}/{lvl.questionsPerLevel}
                      </span>
                    )}
                    {locked && (
                      <span className="bg-slate-800 border border-slate-700 text-slate-600 text-[10px] font-bold px-1.5 rounded-full">
                        LOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-white font-bold text-sm">{lvl.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{lvl.subtitle}</p>
                </div>

                {!locked && <span className="text-slate-600 text-xl flex-shrink-0">›</span>}
              </div>

              {/* Bottom meta */}
              {!locked && (
                <div className="flex gap-3 mt-2.5 text-[11px] text-slate-600">
                  <span>📝 {lvl.questionsPerLevel} questions</span>
                  <span>⏱ {lvl.timeLimit}s each</span>
                  <span>🎯 Pass: {lvl.passMark}/{lvl.questionsPerLevel}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL INTRO
// ─────────────────────────────────────────────────────────────────────────────
function LevelIntro({ level, progress, loading, error, onStart, onBack }) {
  const best = (progress.bestScores || {})[level.id]

  return (
    <div className="min-h-screen bg-[#0b0f1e] flex flex-col items-center justify-center px-6 text-center">
      <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${level.color} flex items-center justify-center text-4xl mb-4 shadow-xl`}>
        {level.icon}
      </div>
      <p className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-1">Level {level.id}</p>
      <h1 className="text-2xl font-black text-white mb-1">{level.title}</h1>
      <p className="text-slate-400 text-sm mb-5">{level.subtitle}</p>

      {/* Stats */}
      <div className={`w-full max-w-xs ${level.bgColor} rounded-2xl p-4 border ${level.borderColor} mb-5 text-left`}>
        <div className="space-y-2">
          {[
            ['Questions', `${level.questionsPerLevel}`],
            ['Time per Q', `${level.timeLimit} seconds`],
            ['Pass mark', `${level.passMark} / ${level.questionsPerLevel} correct`],
            ...(best !== undefined ? [['Your best', `${best} / ${level.questionsPerLevel} ✓`]] : []),
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between text-sm border-b border-slate-800/60 pb-2 last:border-0 last:pb-0">
              <span className="text-slate-400">{label}</span>
              <span className={`font-bold ${label === 'Your best' ? 'text-green-400' : 'text-white'}`}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-5">
        {level.topics.map(t => (
          <span key={t} className={`text-xs px-2 py-0.5 rounded-full border ${TOPIC_COLORS[t] || DEFAULT_TOPIC_COLOR}`}>
            {t}
          </span>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      <button
        onClick={onStart}
        disabled={loading}
        className={`w-full max-w-xs py-3.5 rounded-xl bg-gradient-to-r ${level.color} text-white font-bold text-base disabled:opacity-50 active:scale-95 transition-transform shadow-lg mb-3`}
      >
        {loading ? 'Loading questions…' : `Start Level ${level.id} ${level.icon}`}
      </button>
      <button onClick={onBack} className="text-slate-500 text-sm">← Back to Levels</button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE GAME — fully self-contained, no external hooks
// ─────────────────────────────────────────────────────────────────────────────
function ActiveGame({ level, questions, onComplete, onBack }) {
  const [qi, setQi]              = useState(0)        // question index
  const [answered, setAnswered]  = useState(false)
  const [chosen, setChosen]      = useState(null)
  const [isCorrect, setCorrect]  = useState(null)
  const [showRule, setShowRule]  = useState(false)
  const [timeLeft, setTimeLeft]  = useState(level.timeLimit)
  const [breakdown, setBreakdown] = useState([])      // [{questionId, topic, isCorrect, timeTaken, pointsEarned, ...}]
  const [correctCount, setCorrectCount] = useState(0)

  const timerRef = useRef(null)
  const startRef = useRef(Date.now())

  const q = questions[qi]

  // Reset per question
  useEffect(() => {
    setAnswered(false)
    setChosen(null)
    setCorrect(null)
    setShowRule(false)
    setTimeLeft(q?.timeLimit || level.timeLimit)
    startRef.current = Date.now()
  }, [qi])

  // Timer
  useEffect(() => {
    if (answered) return
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleAnswer('__timeout__')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [qi, answered])

  function handleAnswer(opt) {
    if (answered) return
    clearInterval(timerRef.current)

    const timeTaken = Math.round((Date.now() - startRef.current) / 1000)
    const correct   = opt !== '__timeout__' && opt === q?.answer
    const pts       = calcPts(correct, timeTaken)

    setAnswered(true)
    setChosen(opt)
    setCorrect(correct)
    setTimeout(() => setShowRule(true), 150)

    const entry = {
      questionId:    q?._id,
      topic:         q?.topic,
      gameType:      'grammar',
      isCorrect:     correct,
      timeTaken,
      pointsEarned:  pts,
      userAnswer:    opt,
      correctAnswer: q?.answer,
    }

    const newBreakdown = [...breakdown, entry]
    setBreakdown(newBreakdown)
    if (correct) setCorrectCount(c => c + 1)

    // Advance after feedback window
    setTimeout(() => {
      if (qi >= questions.length - 1) {
        // Done — report up with final tallies
        const finalCorrect = newBreakdown.filter(b => b.isCorrect).length
        onComplete(finalCorrect, questions.length, newBreakdown)
      } else {
        setQi(prev => prev + 1)
      }
    }, 2400)
  }

  if (!q) return null

  const topicColor = TOPIC_COLORS[q.topic] || DEFAULT_TOPIC_COLOR
  const maxTime    = q.timeLimit || level.timeLimit
  const timerPct   = (timeLeft / maxTime) * 100
  const danger     = timeLeft <= 5

  return (
    <div className="min-h-screen bg-[#0b0f1e] flex flex-col">

      {/* Topic strip */}
      <div className={`text-xs text-center py-1.5 font-bold tracking-widest uppercase border-b ${topicColor}`}>
        {q.topic || 'Grammar'}
      </div>

      {/* Timer bar */}
      <div className="relative h-1.5 bg-slate-800">
        <div
          className={`h-full transition-[width] duration-1000 linear rounded-r-full
            ${danger ? 'bg-red-500' : `bg-gradient-to-r ${level.color}`}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${level.textColor}`}>Level {level.id}</span>
          <span className="text-slate-600 text-xs">{qi + 1} / {questions.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border
            ${danger
              ? 'text-red-400 border-red-800 bg-red-950/40'
              : 'text-slate-400 border-slate-700 bg-slate-800/40'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Progress dots */}
      <div className="px-4 pb-2">
        <div className="flex gap-1">
          {questions.map((_, i) => {
            const bk   = breakdown[i]
            const dot  = i > qi ? 'bg-slate-800'
              : !bk ? `bg-gradient-to-r ${level.color}`
              : bk.isCorrect ? 'bg-green-500'
              : 'bg-red-600'
            return <div key={i} className={`flex-1 h-1.5 rounded-full ${dot} transition-all duration-300`} />
          })}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-slate-600">
          <span>✓ {correctCount} correct</span>
          <span>Need {level.passMark} to pass</span>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-4 pb-2 overflow-y-auto">
        <div className="bg-[#131929] rounded-2xl border border-slate-700/50 p-4 mb-3">
          <p className="text-white font-semibold text-base leading-relaxed">{q.questionText}</p>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {q.options?.map((opt) => {
            const isChosen = chosen === opt
            const isAns    = q.answer === opt
            let style = 'bg-[#1a2744] border-slate-700/60 text-slate-200'
            if (answered) {
              if (isAns)          style = 'bg-green-900/60 border-green-500 text-green-200 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
              else if (isChosen)  style = 'bg-red-900/60 border-red-500 text-red-200'
              else                style = 'bg-[#1a2744]/30 border-slate-800 text-slate-500'
            }
            return (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={answered}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-[0.98] disabled:cursor-default ${style}`}
              >
                <span className="flex items-center gap-2">
                  {answered && isAns    && <span className="text-green-400 font-bold">✓</span>}
                  {answered && isChosen && !isAns && <span className="text-red-400 font-bold">✗</span>}
                  {opt}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Rule Card — slides up after answer */}
      <div className={`mx-4 mb-4 rounded-2xl border overflow-hidden transition-all duration-500 ease-out
        ${showRule ? 'opacity-100 max-h-56' : 'opacity-0 max-h-0'}
        ${isCorrect ? 'border-green-600/50 bg-green-950/60' : 'border-red-600/50 bg-red-950/60'}
      `}>
        <div className={`px-2 py-1 text-center text-[11px] font-bold tracking-widest uppercase
          ${isCorrect ? 'bg-green-800/40 text-green-300' : 'bg-red-800/40 text-red-300'}`}>
          {isCorrect ? '✦ Rule Mastered' : '✦ Remember This Rule'}
        </div>
        <div className="px-4 py-3">
          <p className="text-slate-200 text-xs leading-relaxed">{q.explanation}</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL RESULT SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function LevelResult({ level, result, progress, onRetry, onNext, onHub, canNext, nextLevel }) {
  const { correct, total, passed } = result
  const pct = Math.round((correct / total) * 100)

  return (
    <div className="min-h-screen bg-[#0b0f1e] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-3">{passed ? (level.id === 6 ? '👑' : '🏆') : '💪'}</div>
      <h2 className="text-2xl font-black text-white mb-1">
        {passed ? (level.id === 6 ? 'All Levels Complete!' : 'Level Cleared!') : 'Almost There!'}
      </h2>
      <p className="text-slate-400 text-sm mb-6">
        {passed && level.id < 6
          ? `Level ${level.id + 1} "${nextLevel?.title}" is now unlocked!`
          : passed && level.id === 6
          ? 'You are a true Grammar Gladiator!'
          : `You need ${level.passMark}/${total} to pass. Keep practising!`}
      </p>

      {/* Score ring */}
      <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center border-4 mb-6
        ${passed ? 'border-green-500 bg-green-950/40' : 'border-orange-500 bg-orange-950/40'}`}>
        <span className={`text-4xl font-black ${passed ? 'text-green-400' : 'text-orange-400'}`}>{correct}</span>
        <span className="text-slate-400 text-xs">/ {total}</span>
        <span className={`text-xs font-bold ${passed ? 'text-green-400' : 'text-orange-400'}`}>{pct}%</span>
      </div>

      {/* Pass badge */}
      <div className={`px-4 py-1.5 rounded-full text-xs font-bold border mb-7
        ${passed
          ? 'bg-green-900/40 border-green-600/50 text-green-300'
          : 'bg-red-900/40 border-red-600/50 text-red-300'}`}>
        Pass mark: {level.passMark}/{total} · {passed ? 'PASSED ✓' : 'FAILED ✗'}
      </div>

      <div className="w-full max-w-xs space-y-3">
        {/* Next level button */}
        {passed && canNext && nextLevel && (
          <button
            onClick={onNext}
            className={`w-full py-3.5 rounded-xl bg-gradient-to-r ${nextLevel.color} text-white font-bold text-base active:scale-95 transition-transform shadow-lg`}
          >
            Level {nextLevel.id}: {nextLevel.title} {nextLevel.icon} →
          </button>
        )}

        {/* Retry */}
        <button
          onClick={onRetry}
          className={`w-full py-3 rounded-xl border ${level.borderColor} ${level.bgColor} text-white font-bold text-sm active:scale-95 transition-transform`}
        >
          {passed ? '🔁 Replay This Level' : '🔁 Try Again'}
        </button>

        {/* Hub */}
        <button
          onClick={onHub}
          className="w-full py-3 rounded-xl border border-slate-700 bg-slate-800/40 text-slate-300 font-bold text-sm active:scale-95 transition-transform"
        >
          ← Back to All Levels
        </button>
      </div>
    </div>
  )
}