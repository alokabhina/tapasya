// src/utils/speedMathGenerator.js
// Pure, client-side question generation for Speed Math.
// No server round-trip needed — tables/squares/cubes/%-fraction are fully algorithmic.
// Every generator returns: { questionText, answer, options[4], module, itemKey, meta }

// ── Small helpers ────────────────────────────────────────────────────────────

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b) }

/**
 * Build a 4-option set from a pool of candidate distractors.
 * Ensures: no duplicates, all positive, none equal to the correct answer,
 * options stay reasonably close to correct value (no giveaway-obvious wrong answers).
 */
function buildOptions(correct, candidatePool, { asString = (v) => String(v) } = {}) {
  const seen = new Set([correct])
  const pool = []
  for (const c of candidatePool) {
    if (c == null || Number.isNaN(c)) continue
    if (c <= 0) continue
    if (seen.has(c)) continue
    seen.add(c)
    pool.push(c)
  }
  // Sort pool by closeness to correct so we prefer near-misses
  pool.sort((a, b) => Math.abs(a - correct) - Math.abs(b - correct))

  const picked = []
  for (const c of pool) {
    if (picked.length >= 3) break
    picked.push(c)
  }
  // Fallback: if not enough distinct distractors, synthesize small offsets
  let fallbackStep = 1
  while (picked.length < 3) {
    const cand = correct + (picked.length % 2 === 0 ? fallbackStep : -fallbackStep) * (Math.floor(picked.length / 2) + 1)
    if (cand > 0 && !seen.has(cand)) {
      seen.add(cand)
      picked.push(cand)
    }
    fallbackStep++
    if (fallbackStep > 50) break // safety
  }

  const options = shuffle([correct, ...picked.slice(0, 3)]).map(asString)
  return { options, answerStr: asString(correct) }
}

// ══════════════════════════════════════════════════════════════════════════
// TABLES  (12–30 default range, ×2 to ×12)
// ══════════════════════════════════════════════════════════════════════════

export function generateTableQuestion({ min = 12, max = 30, avoidKeys = [] } = {}) {
  let a, b, key
  const avoidSet = new Set(avoidKeys)
  // Build the full list of not-yet-used combos in this range; pick from it if any remain.
  // Falls back to a fully random pick (allowing a repeat) once every combo is exhausted.
  const remaining = []
  for (let x = min; x <= max; x++) {
    for (let y = 1; y <= 10; y++) {
      const k = `${x}x${y}`
      if (!avoidSet.has(k)) remaining.push([x, y, k])
    }
  }
  if (remaining.length > 0) {
    ;[a, b, key] = remaining[randInt(0, remaining.length - 1)]
  } else {
    a = randInt(min, max); b = randInt(1, 10); key = `${a}x${b}`
  }

  const correct = a * b
  const candidates = [
    a * (b - 1), a * (b + 1),
    (a - 1) * b, (a + 1) * b,
    correct + a, correct - a,
    correct + b, correct - b,
    correct + 10, correct - 10,
  ]

  const { options, answerStr } = buildOptions(correct, candidates)

  return {
    module: 'table',
    itemKey: String(a),        // weak-area tracking is per table-number (a)
    questionText: `${a} × ${b} = ?`,
    answer: answerStr,
    options,
    meta: { a, b, comboKey: key },
  }
}

export function getTableReference(min = 12, max = 30) {
  const rows = []
  for (let a = min; a <= max; a++) {
    rows.push({
      n: a,
      entries: Array.from({ length: 10 }, (_, i) => ({ b: i + 1, product: a * (i + 1) })),
    })
  }
  return rows
}

// ══════════════════════════════════════════════════════════════════════════
// SQUARES  (1–30 default range)
// ══════════════════════════════════════════════════════════════════════════

export function generateSquareQuestion({ min = 1, max = 30, avoidKeys = [] } = {}) {
  const effectiveMin = Math.max(min, 2) // 1² is too trivial to be worth quizzing
  const avoidSet = new Set(avoidKeys)
  const remaining = []
  for (let x = effectiveMin; x <= max; x++) if (!avoidSet.has(String(x))) remaining.push(x)
  const n = remaining.length > 0 ? remaining[randInt(0, remaining.length - 1)] : randInt(effectiveMin, max)
  const correct = n * n
  const candidates = [
    (n - 1) * (n - 1), (n + 1) * (n + 1),
    n * (n + 1), n * (n - 1),
    correct + n, correct - n,
    correct + 2 * n, correct - 2 * n,
  ]
  const { options, answerStr } = buildOptions(correct, candidates)

  return {
    module: 'square',
    itemKey: String(n),
    questionText: `${n}² = ?`,
    answer: answerStr,
    options,
    meta: { n },
  }
}

export function getSquareReference(min = 1, max = 30) {
  return Array.from({ length: max - min + 1 }, (_, i) => {
    const n = min + i
    return { n, value: n * n }
  })
}

// ══════════════════════════════════════════════════════════════════════════
// CUBES  (1–20 default range)
// ══════════════════════════════════════════════════════════════════════════

export function generateCubeQuestion({ min = 1, max = 20, avoidKeys = [] } = {}) {
  const avoidSet = new Set(avoidKeys)
  const remaining = []
  for (let x = min; x <= max; x++) if (!avoidSet.has(String(x))) remaining.push(x)
  const n = remaining.length > 0 ? remaining[randInt(0, remaining.length - 1)] : randInt(min, max)
  const correct = n * n * n
  const candidates = [
    (n - 1) ** 3, (n + 1) ** 3,
    n * n * (n + 1), n * n * (n - 1),
    correct + n * n, correct - n * n,
    correct + n, correct - n,
  ]
  const { options, answerStr } = buildOptions(correct, candidates)

  return {
    module: 'cube',
    itemKey: String(n),
    questionText: `${n}³ = ?`,
    answer: answerStr,
    options,
    meta: { n },
  }
}

export function getCubeReference(min = 1, max = 20) {
  return Array.from({ length: max - min + 1 }, (_, i) => {
    const n = min + i
    return { n, value: n * n * n }
  })
}

// ══════════════════════════════════════════════════════════════════════════
// PERCENTAGE ↔ FRACTION  (standard IBPS/SBI/RRB/RBI/LIC conversion table)
// ══════════════════════════════════════════════════════════════════════════

// "Full" denominators generate every reduced fraction (1/7, 2/7, 3/7 ... all matter).
// "Landmark" denominators only matter at numerator = 1 in real exams (nobody drills
// 7/20 or 13/25) — matches the standard bank-exam memorization table exactly.
const FULL_DENOMS      = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12]
const LANDMARK_DENOMS  = [11, 16, 20, 25, 50, 100]
const EXTENDED_DENOMS  = [13, 14, 15, 17, 18, 19] // beyond the standard list, bonus practice

export const PERCENT_TIERS = {
  basic:    [...FULL_DENOMS, ...LANDMARK_DENOMS],
  advanced: [...FULL_DENOMS, ...LANDMARK_DENOMS, ...EXTENDED_DENOMS],
}

// Too trivial to be worth quizzing (everyone already knows these cold) —
// excluded from the quiz pool, but still shown on the Learn/reference page.
const TRIVIAL_FRACTIONS = ['1/2']

function fmtPercent(p) {
  const rounded = Math.round(p * 100) / 100
  return (Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2)) + '%'
}

function buildPercentFractionPairs(denoms) {
  const pairs = []
  for (const d of denoms) {
    const numerators = LANDMARK_DENOMS.includes(d)
      ? [1] // only the landmark fraction itself (1/20, 1/25, 1/50, 1/100, 1/11, 1/16)
      : Array.from({ length: d - 1 }, (_, i) => i + 1).filter((n) => gcd(n, d) === 1)
    for (const n of numerators) {
      const percent = (n / d) * 100
      pairs.push({
        num: n,
        den: d,
        fractionStr: `${n}/${d}`,
        percent,
        percentStr: fmtPercent(percent),
      })
    }
  }
  return pairs
}

let _pairCache = null
function allPairs() {
  if (!_pairCache) {
    _pairCache = buildPercentFractionPairs([...PERCENT_TIERS.basic, ...PERCENT_TIERS.advanced])
  }
  return _pairCache
}

export function generatePercentFractionQuestion({ tier = 'basic', forcedFraction = null, avoidKeys = [] } = {}) {
  const denoms = tier === 'advanced' ? PERCENT_TIERS.advanced : PERCENT_TIERS.basic
  let pool = allPairs().filter((p) => denoms.includes(p.den) && !TRIVIAL_FRACTIONS.includes(p.fractionStr))
  const freshPool = pool.filter((p) => !avoidKeys.includes(p.fractionStr))
  if (freshPool.length > 0) pool = freshPool // only restrict if it doesn't empty the pool out
  const correct = forcedFraction
    ? (allPairs().find((p) => p.fractionStr === forcedFraction) || pool[randInt(0, pool.length - 1)])
    : pool[randInt(0, pool.length - 1)]

  // Random direction: ask percent -> fraction, or fraction -> percent
  const askFraction = Math.random() < 0.5

  // distractors: nearby percent values (close-but-different) drawn from the SAME
  // tier — otherwise a "Basic" test could show an exotic fraction like 4/17 as a
  // wrong option, which is more confusing than helpful at that difficulty level.
  const nearby = pool
    .filter((p) => p.fractionStr !== correct.fractionStr)
    .sort((a, b) => Math.abs(a.percent - correct.percent) - Math.abs(b.percent - correct.percent))
    .slice(0, 12)

  if (askFraction) {
    const candidates = nearby.map((p) => p.fractionStr)
    const seen = new Set([correct.fractionStr])
    const picked = []
    for (const c of candidates) {
      if (picked.length >= 3) break
      if (seen.has(c)) continue
      seen.add(c); picked.push(c)
    }
    const options = shuffle([correct.fractionStr, ...picked])
    return {
      module: 'percent',
      itemKey: correct.fractionStr,
      questionText: `${correct.percentStr} = ?`,
      answer: correct.fractionStr,
      options,
      meta: { ...correct, direction: 'percentToFraction' },
    }
  } else {
    const candidates = nearby.map((p) => p.percentStr)
    const seen = new Set([correct.percentStr])
    const picked = []
    for (const c of candidates) {
      if (picked.length >= 3) break
      if (seen.has(c)) continue
      seen.add(c); picked.push(c)
    }
    const options = shuffle([correct.percentStr, ...picked])
    return {
      module: 'percent',
      itemKey: correct.fractionStr,
      questionText: `${correct.fractionStr} = ?%`,
      answer: correct.percentStr,
      options,
      meta: { ...correct, direction: 'fractionToPercent' },
    }
  }
}

export function getPercentFractionReference(tier = 'basic') {
  const denoms = tier === 'advanced' ? PERCENT_TIERS.advanced : PERCENT_TIERS.basic
  return allPairs()
    .filter((p) => denoms.includes(p.den))
    .sort((a, b) => a.den - b.den || a.num - b.num)
}

// ══════════════════════════════════════════════════════════════════════════
// Dispatcher — builds a full quiz question set given a test config
// ══════════════════════════════════════════════════════════════════════════

export const MODULE_META = {
  table:   { label: 'Tables',            icon: '✖️', color: '#22d3ee' /* cyan */,   defaultRange: [12, 30] },
  square:  { label: 'Squares',           icon: '🟦', color: '#818cf8' /* indigo */, defaultRange: [2, 30] },
  cube:    { label: 'Cubes',             icon: '🟪', color: '#a78bfa' /* violet */, defaultRange: [1, 20] },
  percent: { label: '%  ↔  Fraction',    icon: '➗', color: '#34d399' /* emerald */, defaultRange: null },
}

export function generateOne(module, config, avoidKeys = []) {
  if (module === 'table')   return generateTableQuestion({ min: config.tableRange?.[0] ?? 12, max: config.tableRange?.[1] ?? 30, avoidKeys })
  if (module === 'square')  return generateSquareQuestion({ min: config.squareRange?.[0] ?? 1, max: config.squareRange?.[1] ?? 30, avoidKeys })
  if (module === 'cube')    return generateCubeQuestion({ min: config.cubeRange?.[0] ?? 1, max: config.cubeRange?.[1] ?? 20, avoidKeys })
  if (module === 'percent') return generatePercentFractionQuestion({ tier: config.percentTier ?? 'basic', avoidKeys })
  throw new Error(`Unknown module: ${module}`)
}

/**
 * Build a full ordered question list for a test.
 * @param {string[]} modules - one or more of ['table','square','cube','percent']
 * @param {object} config - { tableRange, squareRange, cubeRange, percentTier, questionCount, timePerQuestion }
 */
/**
 * Focused drill for a single weak item (used by "Practice Now" on suggestion cards).
 * Table -> keeps a fixed, varies b, so it's a real repeated drill.
 * Square/Cube -> fixed n (repetition itself reinforces memorization).
 * Percent -> fixed fraction pair, alternating direction.
 */
export function generateFocusedQuizSet(module, itemKey, { count = 6, timeLimit = 5, tier = 'basic' } = {}) {
  const list = []
  const usedCombos = []
  for (let i = 0; i < count; i++) {
    let q
    if (module === 'table')        q = generateTableQuestion({ min: Number(itemKey), max: Number(itemKey), avoidKeys: usedCombos })
    else if (module === 'square')  q = generateSquareQuestion({ min: Number(itemKey), max: Number(itemKey) })
    else if (module === 'cube')    q = generateCubeQuestion({ min: Number(itemKey), max: Number(itemKey) })
    else if (module === 'percent') q = generatePercentFractionQuestion({ tier, forcedFraction: itemKey })
    if (module === 'table') usedCombos.push(q.meta.comboKey)
    list.push({ ...q, timeLimit })
  }
  return list
}

export function generateQuizSet(modules, config) {
  const count = config.questionCount || 10
  const timeLimit = config.timePerQuestion || 5
  const usedByModule = { table: [], square: [], cube: [], percent: [] }
  const list = []
  for (let i = 0; i < count; i++) {
    const module = modules[i % modules.length] // even rotation for mix tests
    const q = generateOne(module, config, usedByModule[module])
    // Table repeats are tracked by exact combo (a×b); others by the item itself
    usedByModule[module].push(module === 'table' ? q.meta.comboKey : q.itemKey)
    list.push({ ...q, timeLimit })
  }
  return shuffle(list) // shuffle final order so mix tests don't feel patterned
}