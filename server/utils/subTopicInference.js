// server/utils/subTopicInference.js
// Fallback sub-topic ("question type") detection for papers that were imported
// WITHOUT a useful subTopic — e.g. every Simplification question just says
// topic "Simplification". Reads the question text and guesses the actual skill
// (Surds & Indices, Percentage, Approximation ...) so weak-zone analysis can say
// "Surds & Indices — 1 galat" instead of just "Simplification".
//
// Used (1) at analysis time for already-saved tests and (2) at upload time so
// new tests get it stored. A subTopic the AI/admin wrote is NEVER overridden —
// only empty ones, or ones that merely repeat the topic/section name.

function plain(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

function simplificationType(t) {
  const low = t.toLowerCase()

  if (/≈|approx|nearly|nearest|value of \?? ?approximately/.test(low)) return 'Approximation'
  // long decimals like 24.98 / 119.97 + × ÷ is the classic approximation look
  if (/\d+\.\d{2,}/.test(t) && /[×÷xX*/]/.test(t) && !/%/.test(t)) return 'Approximation'

  if (/%|percent/.test(low)) return 'Percentage-based Simplification'

  // indices: fractional / negative / big exponents (2^5, 15^(3/2), 5^-2) or the words surd/index/power
  const exps = [...t.matchAll(/\^\s*\(?\s*(-?\d+(?:\s*\/\s*\d+)?)/g)].map((m) => m[1].replace(/\s/g, ''))
  const bigExp = exps.some((e) => e.includes('/') || e.startsWith('-') || !['2', '3'].includes(e))
  const hasIndices = bigExp || /[⁴⁵⁶⁷⁸⁹⁻]|\bsurd|\bindic|\bindex|\bpower/.test(low)
  // roots: perfect-square/cube radicands are plain "roots"; anything else is a surd
  const radicands = [...t.matchAll(/[√∛∜]\s*\(?\s*(\d+)/g)].map((m) => Number(m[1]))
  const isPerfect = (n) => Number.isInteger(Math.sqrt(n)) || Number.isInteger(Math.round(Math.cbrt(n)) ** 3 === n ? 1 : 0.5)
  const rootCount = (t.match(/[√∛∜]/g) || []).length
  const hasSurd = radicands.some((n) => !isPerfect(n))
  if (hasIndices || hasSurd) return 'Surds & Indices'

  if (rootCount >= 1 || /[²³]|\^\s*[23]\b|\bsquare|\bcube|\broot/.test(low)) return 'Squares, Cubes & Roots'

  if (/\b[a-z]\s*[²³^]|\(\s*[a-z]\s*[+\-]\s*[a-z0-9]+\s*\)/i.test(t) || /\bidentit/.test(low)) return 'Algebraic Identities'

  if (/\d+\s*\/\s*\d+|\d+\s*\d+\/\d+|\bfraction/.test(low) || /\d+\.\d+/.test(t)) return 'Fractions & Decimals'

  return 'BODMAS/VBODMAS'
}

function numberSeriesType(t) {
  const low = t.toLowerCase()
  if (/wrong|incorrect|odd one|does not (fit|follow)/.test(low)) return 'Wrong Number Series'
  return 'Missing Number Series'
}

function quadraticType(t) {
  const low = t.toLowerCase()
  if (/form|equation whose|roots? (are|is) /.test(low) && !/\bI\.|\bII\./.test(t)) return 'Forming Equations'
  if (/\bx\b.*\by\b|\bI\..*\bII\./i.test(t)) return 'Comparison of Roots'
  return 'Comparison of Roots'
}

// q: question object; sectionName: name of the section it sits in.
export function inferSubTopic(q, sectionName = '') {
  const t = plain(q.questionText)
  const label = norm(q.topic || q.topicRaw) + ' ' + norm(sectionName)

  if (/simplif|approx/.test(label)) return simplificationType(t)
  if (/number series|series/.test(label)) return numberSeriesType(t)
  if (/quadratic/.test(label)) return quadraticType(t)
  return ''
}

// subTopic to use for analysis/storage: the real one if it says something
// useful, otherwise the inferred one, otherwise ''.
export function resolveSubTopic(q, sectionName = '') {
  const given = (q.subTopic || '').trim()
  const same = norm(given) === norm(q.topic) || norm(given) === norm(sectionName)
  if (given && !same) return given
  return inferSubTopic(q, sectionName)
}