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
