// src/components/speedmath/FlashcardDeck.jsx
// Active-recall flashcard study — the single most effective way to actually
// memorize something (vs. just re-reading a list). Tap the card to flip,
// swipe/tap through the deck, mark cards "Got it" to track progress.

import { useEffect, useState } from 'react'

function shuffleArr(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function FlashcardDeck({ deckKey, cards, color = '#22d3ee' }) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i))
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(new Set())

  // Reset the deck whenever the underlying question set changes (new table, new tier, etc.)
  useEffect(() => {
    setOrder(cards.map((_, i) => i))
    setIdx(0)
    setFlipped(false)
    setKnown(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckKey])

  if (!cards.length) {
    return <p className="text-slate-600 text-sm text-center py-10">Nothing to study here yet.</p>
  }

  const card = cards[order[idx]]
  const isLast = idx === order.length - 1
  const isFirst = idx === 0

  const goNext = () => { setFlipped(false); setIdx((i) => Math.min(i + 1, order.length - 1)) }
  const goPrev = () => { setFlipped(false); setIdx((i) => Math.max(i - 1, 0)) }
  const markKnown = () => {
    setKnown((prev) => new Set(prev).add(order[idx]))
    if (!isLast) goNext()
  }
  const reshuffle = () => {
    setOrder(shuffleArr(cards.map((_, i) => i)))
    setIdx(0); setFlipped(false); setKnown(new Set())
  }
  const restart = () => {
    setIdx(0); setFlipped(false); setKnown(new Set())
  }

  return (
    <div className="flex flex-col items-center">
      {/* Progress */}
      <div className="w-full flex items-center justify-between mb-3 px-0.5">
        <span className="text-slate-400 text-xs font-bold tabular-nums">{idx + 1} / {order.length}</span>
        <span className="text-emerald-400/80 text-xs font-semibold">✓ {known.size} known</span>
      </div>
      <div className="w-full h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full" style={{ width: `${((idx + 1) / order.length) * 100}%`, background: `linear-gradient(90deg, ${color}, #6366f1)`, transition: 'width 0.25s ease' }} />
      </div>

      {/* The card itself — tap anywhere to flip */}
      <button
        onClick={() => setFlipped((f) => !f)}
        className="w-full min-h-[190px] rounded-3xl flex items-center justify-center px-6 py-8 mb-5 active:scale-[0.98]"
        style={{
          background: flipped
            ? `linear-gradient(135deg, ${color}, ${color}cc)`
            : 'linear-gradient(135deg, #101a30 0%, #0d1728 100%)',
          border: `1px solid ${flipped ? color + '55' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: flipped ? `0 8px 30px ${color}40` : '0 4px 16px rgba(0,0,0,0.3)',
          transition: 'background 0.25s ease, border-color 0.25s ease',
        }}
      >
        <div className="text-center">
          {!flipped && <p className="text-slate-600 text-[11px] font-bold mb-2 uppercase tracking-wide">Tap to reveal</p>}
          <p className={`font-black leading-tight ${flipped ? 'text-white text-3xl' : 'text-slate-100 text-3xl'}`}>
            {flipped ? card.back : card.front}
          </p>
        </div>
      </button>

      {/* Controls */}
      <div className="w-full grid grid-cols-3 gap-2 mb-3">
        <button onClick={goPrev} disabled={isFirst} className="py-3 rounded-xl text-xs font-bold disabled:opacity-30" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
          ← Prev
        </button>
        <button onClick={markKnown} className="py-3 rounded-xl text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
          ✓ Got it
        </button>
        <button onClick={goNext} disabled={isLast} className="py-3 rounded-xl text-xs font-bold disabled:opacity-30" style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8' }}>
          Next →
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={reshuffle} className="text-[11px] font-semibold text-slate-500 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          🔀 Shuffle
        </button>
        <button onClick={restart} className="text-[11px] font-semibold text-slate-500 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          ↺ Restart
        </button>
      </div>
    </div>
  )
}