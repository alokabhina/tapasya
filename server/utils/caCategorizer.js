// server/utils/caCategorizer.js
// Rule-based (keyword matching) category + tag guesser — deliberately NOT
// an LLM call, per requirement (no paid API, no in-app AI cost). It won't
// be perfect, but it gets items into a rough bucket automatically; the
// admin can always fix a wrong guess from the UI. Order matters — first
// match wins, so more specific rules go first.
const RULES = [
  { category: 'RBI',         re: /\brbi\b|repo rate|reverse repo|monetary policy|mpc\b|reserve bank/i },
  { category: 'Appointment', re: /appoint|took charge|takes over|new (governor|chairman|md|ceo|secretary|chief)|named as/i },
  { category: 'Scheme',      re: /\bscheme\b|yojana|launched|initiative|mission\b/i },
  { category: 'Award',       re: /award|prize|honour|honor|recognition/i },
  { category: 'Sports',      re: /tournament|championship|olympic|world cup|medal|cricket|match/i },
  { category: 'International', re: /summit|bilateral|united nations|\bun\b|foreign minister|embassy|treaty/i },
  { category: 'Banking',     re: /bank|npa|deposit|loan|credit|ifsc|neft|upi|fintech/i },
  { category: 'Economy',     re: /gdp|inflation|fiscal|budget|economic survey|tax\b|gst\b/i },
  { category: 'National',    re: /government of india|cabinet|ministry|parliament|president|prime minister/i },
]

// Headlines matching any of these are routine administrative/technical
// notices — auction results, treasury-bill notifications, circular
// amendment titles, weekly statistical bulletins, sanctions-list entity
// updates, lead-bank-responsibility assignments, etc. They're real RBI/PIB
// publications, but essentially never show up as an actual exam question
// (no memorable fact, just a reference number and a procedural title), so
// they're filtered out at fetch time instead of cluttering the feed. The
// admin can always add one back manually via "+ Add" if a specific one
// turns out to matter.
const NOISE_PATTERNS = [
  /auction results?/i,
  /auction of.*treasury bills?/i,
  /government stock.*auction/i,
  /variable rate reverse repo/i,
  /\bvrrr\b/i,
  /amendment directions?,?\s*\d{4}/i,
  /weekly statistical supplement/i,
  /section 51a of uapa/i,
  /unsc.*sanctions list/i,
  /lead bank responsibility/i,
  /^auction of /i,
  /notified amount/i,
  /cut-?off/i,
  /^government stock/i,
]

// item: { headline, oneLiner }
export function isNoise(item) {
  const text = item.headline || ''
  return NOISE_PATTERNS.some((re) => re.test(text))
}

// Loose de-duplication for headlines that are word-for-word (or near
// enough) reprints across sources/RSS entries — link-based dedup alone
// misses these since each source has its own URL for the "same" story.
export function normalizeHeadline(headline) {
  return String(headline || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')   // strip punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

// item: { headline, oneLiner, defaultCategory }
// Returns { category, entity, action, value, blankableFact } — all best-effort.
export function guessTags(item) {
  const text = `${item.headline} ${item.oneLiner}`
  let category = item.defaultCategory || 'Other'
  for (const rule of RULES) {
    if (rule.re.test(text)) { category = rule.category; break }
  }

  // Very light heuristic entity/action split: "X Y verb Z" → entity = first
  // few words up to a common reporting verb. Best-effort only — admin can
  // always correct this from the edit form.
  const verbMatch = item.headline.match(
    /^(.*?)\s+(launched|launches|appointed|appoints|granted|grants|announced|announces|signed|signs|inaugurated|inaugurates|approved|approves)\s+(.*)$/i
  )
  const entity = verbMatch ? verbMatch[1].trim() : ''
  const action = verbMatch ? `${verbMatch[2]} ${verbMatch[3]}`.trim() : ''

  // blankableFact is deliberately left for the admin to write — an
  // auto-generated cloze sentence from a regex is more likely to read
  // awkwardly than to save real time.
  return { category, entity, action, value: '', blankableFact: '' }
}

export function toMonthKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}