// src/pages/SpeedMathReference.jsx
// "Learn" mode — redesigned for actual memorization, mobile-first:
//   📖 Browse — clean, single-focus reading view (one table/chunk at a time)
//   🎯 Recall — active-recall flashcards (tap to flip), the proven way to
//               actually commit something to memory instead of just re-reading it
// No timer, no scoring — this is purely for revision.

import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  MODULE_META,
  getTableReference,
  getSquareReference,
  getCubeReference,
  getPercentFractionReference,
} from '@/utils/speedMathGenerator'
import FlashcardDeck from '@/components/speedmath/FlashcardDeck'

const TABS = ['table', 'square', 'cube', 'percent']

function buildChunks(min, max, size = 10) {
  const chunks = []
  let start = min
  while (start <= max) {
    const end = Math.min(start + size - 1, max)
    chunks.push([start, end])
    start = end + 1
  }
  return chunks
}

export default function SpeedMathReference() {
  const navigate = useNavigate()
  const { module: initialModule } = useParams()
  const [tab, setTab] = useState(TABS.includes(initialModule) ? initialModule : 'table')
  const [mode, setMode] = useState('browse') // 'browse' | 'recall'
  const [tier, setTier] = useState('basic')
  const [selectedTable, setSelectedTable] = useState(12)
  const [squareChunk, setSquareChunk] = useState(0)
  const [cubeChunk, setCubeChunk] = useState(0)

  const meta = MODULE_META[tab]
  const goTab = (t) => { setTab(t); setMode('browse'); navigate(`/speedmath/learn/${t}`, { replace: true }) }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 pb-16" style={{ background: '#080d1a' }}>
      <button onClick={() => navigate('/speedmath')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs font-semibold mb-4">
        ← Back
      </button>

      <h1 className="text-xl font-black text-white mb-4">📖 Learn — Revise</h1>

      {/* Module tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-4 px-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => goTab(t)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0"
            style={{
              background: tab === t ? `linear-gradient(135deg, ${MODULE_META[t].color}, ${MODULE_META[t].color}cc)` : 'rgba(255,255,255,0.05)',
              color: tab === t ? '#fff' : '#94a3b8',
            }}
          >
            {MODULE_META[t].icon} {MODULE_META[t].label}
          </button>
        ))}
      </div>

      {/* Browse / Recall mode switch */}
      <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[
          { key: 'browse', label: '📖 Browse' },
          { key: 'recall', label: '🎯 Recall (flashcards)' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className="flex-1 py-2 rounded-lg text-xs font-bold"
            style={{ background: mode === m.key ? `${meta.color}30` : 'transparent', color: mode === m.key ? meta.color : '#64748b' }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {tab === 'table' && mode === 'browse' && (
        <TableBrowse selected={selectedTable} onSelect={setSelectedTable} color={meta.color} />
      )}
      {tab === 'table' && mode === 'recall' && (
        <TableRecall selected={selectedTable} onSelect={setSelectedTable} color={meta.color} />
      )}

      {tab === 'square' && mode === 'browse' && (
        <ValueBrowse data={getSquareReference(2, 30)} suffix="²" color={meta.color} chunk={squareChunk} setChunk={setSquareChunk} min={2} max={30} />
      )}
      {tab === 'square' && mode === 'recall' && (
        <ValueRecall data={getSquareReference(2, 30)} suffix="²" color={meta.color} deckKey="square" />
      )}

      {tab === 'cube' && mode === 'browse' && (
        <ValueBrowse data={getCubeReference(1, 20)} suffix="³" color={meta.color} chunk={cubeChunk} setChunk={setCubeChunk} min={1} max={20} />
      )}
      {tab === 'cube' && mode === 'recall' && (
        <ValueRecall data={getCubeReference(1, 20)} suffix="³" color={meta.color} deckKey="cube" />
      )}

      {tab === 'percent' && mode === 'browse' && (
        <PercentBrowse tier={tier} setTier={setTier} color={meta.color} />
      )}
      {tab === 'percent' && mode === 'recall' && (
        <PercentRecall tier={tier} setTier={setTier} color={meta.color} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// Shared: sticky horizontal number-chip picker — jump straight to a number
// instead of scrolling/tapping through an accordion. The core mobile-UX fix.
// ══════════════════════════════════════════════════════════════════════════

function NumberChips({ min, max, selected, onSelect, color }) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div className="sticky top-0 z-10 -mx-4 px-4 py-2 mb-4 overflow-x-auto flex gap-1.5" style={{ background: '#080d1aee', backdropFilter: 'blur(6px)' }}>
      {nums.map((n) => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          className="flex-shrink-0 w-10 h-10 rounded-xl text-sm font-black"
          style={{
            background: selected === n ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'rgba(255,255,255,0.05)',
            color: selected === n ? '#fff' : '#94a3b8',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// TABLES
// ══════════════════════════════════════════════════════════════════════════

function TableBrowse({ selected, onSelect, color }) {
  const rows = useMemo(() => getTableReference(12, 30), [])
  const row = rows.find((r) => r.n === selected) || rows[0]
  const idx = rows.findIndex((r) => r.n === row.n)

  return (
    <div>
      <NumberChips min={12} max={30} selected={selected} onSelect={onSelect} color={color} />

      {/* Big focused single-table view — one thing to read at a time */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => idx > 0 && onSelect(rows[idx - 1].n)}
          disabled={idx === 0}
          className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <i className="ti ti-chevron-left text-slate-400" />
        </button>
        <h2 className="text-white font-black text-lg">Table of {row.n}</h2>
        <button
          onClick={() => idx < rows.length - 1 && onSelect(rows[idx + 1].n)}
          disabled={idx === rows.length - 1}
          className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <i className="ti ti-chevron-right text-slate-400" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {row.entries.map(({ b, product }) => (
          <div key={b} className="rounded-xl px-4 py-3.5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #101a30, #0d1728)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-slate-300 font-bold text-base">{row.n} × {b}</span>
            <span className="font-black text-lg" style={{ color }}>{product}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TableRecall({ selected, onSelect, color }) {
  const MIXED = 'mixed'
  const [pick, setPick] = useState(selected)
  const rows = useMemo(() => getTableReference(12, 30), [])

  const cards = useMemo(() => {
    if (pick === MIXED) {
      return rows.flatMap((r) => r.entries.map((e) => ({ front: `${r.n} × ${e.b}`, back: `${e.product}` })))
    }
    const row = rows.find((r) => r.n === pick)
    return row ? row.entries.map((e) => ({ front: `${row.n} × ${e.b}`, back: `${e.product}` })) : []
  }, [pick, rows])

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-4">
        <button
          onClick={() => setPick(MIXED)}
          className="flex-shrink-0 px-3 h-10 rounded-xl text-xs font-black"
          style={{ background: pick === MIXED ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'rgba(255,255,255,0.05)', color: pick === MIXED ? '#fff' : '#94a3b8' }}
        >
          🎲 Mixed
        </button>
        {Array.from({ length: 19 }, (_, i) => 12 + i).map((n) => (
          <button
            key={n}
            onClick={() => { setPick(n); onSelect(n) }}
            className="flex-shrink-0 w-10 h-10 rounded-xl text-sm font-black"
            style={{ background: pick === n ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'rgba(255,255,255,0.05)', color: pick === n ? '#fff' : '#94a3b8' }}
          >
            {n}
          </button>
        ))}
      </div>
      <FlashcardDeck deckKey={`table-${pick}`} cards={cards} color={color} />
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// SQUARES / CUBES  (chunked into decades so nothing feels overwhelming)
// ══════════════════════════════════════════════════════════════════════════

function ValueBrowse({ data, suffix, color, chunk, setChunk, min, max }) {
  const chunks = useMemo(() => buildChunks(min, max, 10), [min, max])
  const [cs, ce] = chunks[chunk] || chunks[0]
  const visible = data.filter((d) => d.n >= cs && d.n <= ce)

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {chunks.map(([s, e], i) => (
          <button
            key={i}
            onClick={() => setChunk(i)}
            className="flex-1 py-2 rounded-xl text-xs font-bold"
            style={{ background: chunk === i ? `linear-gradient(135deg, ${color}, ${color}cc)` : 'rgba(255,255,255,0.05)', color: chunk === i ? '#fff' : '#94a3b8' }}
          >
            {s}–{e}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {visible.map(({ n, value }) => (
          <div key={n} className="rounded-xl px-4 py-3.5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #101a30, #0d1728)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-slate-300 font-bold text-base">{n}{suffix}</span>
            <span className="font-black text-lg" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ValueRecall({ data, suffix, color, deckKey }) {
  const cards = useMemo(() => data.map(({ n, value }) => ({ front: `${n}${suffix}`, back: `${value}` })), [data, suffix])
  return <FlashcardDeck deckKey={deckKey} cards={cards} color={color} />
}

// ══════════════════════════════════════════════════════════════════════════
// PERCENTAGE ↔ FRACTION
// ══════════════════════════════════════════════════════════════════════════

function TierToggle({ tier, setTier, color }) {
  return (
    <div className="flex gap-2 mb-4">
      {['basic', 'advanced'].map((t) => (
        <button
          key={t}
          onClick={() => setTier(t)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold capitalize"
          style={{ background: tier === t ? `${color}30` : 'rgba(255,255,255,0.05)', color: tier === t ? color : '#94a3b8' }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

function PercentBrowse({ tier, setTier, color }) {
  const pairs = getPercentFractionReference(tier)
  const groups = {}
  for (const p of pairs) { groups[p.den] = groups[p.den] || []; groups[p.den].push(p) }

  return (
    <div>
      <TierToggle tier={tier} setTier={setTier} color={color} />
      <div className="flex flex-col gap-4">
        {Object.entries(groups).map(([den, list]) => (
          <div key={den}>
            <p className="text-slate-500 text-xs font-bold mb-1.5">Denominator {den}</p>
            <div className="flex flex-col gap-2">
              {list.map((p) => (
                <div key={p.fractionStr} className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #101a30, #0d1728)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-slate-300 font-bold text-base">{p.fractionStr}</span>
                  <span className="font-black text-base" style={{ color }}>{p.percentStr}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PercentRecall({ tier, setTier, color }) {
  const cards = useMemo(() => {
    const pairs = getPercentFractionReference(tier)
    return pairs.map((p, i) => {
      const askFraction = i % 2 === 0 // stable per render, alternates direction for variety
      return askFraction
        ? { front: p.percentStr, back: p.fractionStr }
        : { front: p.fractionStr, back: p.percentStr }
    })
  }, [tier])

  return (
    <div>
      <TierToggle tier={tier} setTier={setTier} color={color} />
      <FlashcardDeck deckKey={`percent-${tier}`} cards={cards} color={color} />
    </div>
  )
}