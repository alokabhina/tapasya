// src/utils/matchStudySubject.js
// Practice Test ke naam (subject / test title / section names) ko user ke
// study-timer subjects (Home wale) se match karta hai. Naam bilkul same na
// ho tab bhi chale: exact -> contains -> alias group (quant ~ aptitude ~ maths
// etc.) -> aur kuch na mile to koi bhi ek subject (fallback), taaki timer
// kisi na kisi subject pe zaroor chal jaye.

const ALIAS_GROUPS = {
  quant: ['quant', 'quants', 'quantitative', 'aptitude', 'maths', 'math', 'mathematics', 'numerical', 'arithmetic', 'speedmath', 'simplification', 'approximation', 'di', 'dataint', 'interpretation', 'ganit'],
  reasoning: ['reasoning', 'reason', 'logical', 'logic', 'puzzle', 'puzzles', 'seating', 'syllogism', 'inequality', 'coding', 'decoding', 'tarkshakti'],
  english: ['english', 'grammar', 'vocab', 'vocabulary', 'reading', 'comprehension', 'cloze', 'language', 'verbal', 'angrezi'],
  ga: ['ga', 'gk', 'gs', 'general', 'current', 'affairs', 'banking', 'static', 'economy'],
  computer: ['computer', 'computers', 'it', 'technology'],
}

function normalize(s) {
  return String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function tokens(s) {
  return normalize(s).split(' ').filter(Boolean)
}

function groupsOf(s) {
  const found = new Set()
  for (const t of tokens(s)) {
    for (const [group, words] of Object.entries(ALIAS_GROUPS)) {
      if (words.some((w) => t === w || (w.length >= 4 && t.startsWith(w)))) found.add(group)
    }
  }
  return found
}

function subjectKey(s) {
  return s?.id ?? s?._id
}

function findForCandidate(candidate, subjects) {
  const c = normalize(candidate)
  if (!c) return null

  // 1. exact (normalized)
  let hit = subjects.find((s) => normalize(s.name) === c)
  if (hit) return hit

  // 2. ek doosre ko contain kare (min 3 chars taaki "a"/"it" jaisa kuch galat match na kare)
  hit = subjects.find((s) => {
    const n = normalize(s.name)
    return n.length >= 3 && c.length >= 3 && (n.includes(c) || c.includes(n))
  })
  if (hit) return hit

  // 3. alias group (quant ~ aptitude ~ maths ...)
  const cg = groupsOf(candidate)
  if (cg.size > 0) {
    hit = subjects.find((s) => {
      const sg = groupsOf(s.name)
      for (const g of cg) if (sg.has(g)) return true
      return false
    })
    if (hit) return hit
  }
  return null
}

/**
 * @param {string[]} candidates  priority order — practice subject name, test title, section names...
 * @param {Array}    subjects    user ke study-timer subjects
 * @returns {{ subject: object|null, matched: boolean }}
 */
export function matchStudySubject(candidates, subjects) {
  const usable = (Array.isArray(subjects) ? subjects : []).filter((s) => s && s.name && subjectKey(s))
  if (usable.length === 0) return { subject: null, matched: false }

  // 'syllabus' scope wale subjects Home/Timer ke nahi hote — pehle main wale try karo
  const main = usable.filter((s) => s.scope !== 'syllabus')
  const pool = main.length > 0 ? main : usable

  for (const cand of candidates || []) {
    const hit = findForCandidate(cand, pool)
    if (hit) return { subject: hit, matched: true }
  }
  // Koi naam match nahi hua — fir bhi koi ek subject pe timer chala do
  return { subject: pool[0], matched: false }
}