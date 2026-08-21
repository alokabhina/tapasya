// src/utils/sectionColors.js
// Deterministic color per subject/section name — same subject always gets
// the same color across every chart in the Mock Tracker, so "Quant" is
// always the same hue whether you're looking at the trend chart, the
// accuracy bars, or the subject picker pills.
const PALETTE = [
  '#22d3ee', // cyan
  '#a78bfa', // violet
  '#f472b6', // pink
  '#4ade80', // green
  '#fbbf24', // amber
  '#fb7185', // rose
  '#38bdf8', // sky
  '#c084fc', // purple
]

export function colorForSection(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

// Full Mocks get a fixed, richer identity — distinct from the subject
// palette so "Full Mock" never accidentally collides with a subject color.
export const FULL_MOCK_SCORE_COLOR = '#f97316'
export const FULL_MOCK_ACCURACY_COLOR = '#38bdf8'

// Accuracy line stays a consistent neutral across sectional charts so the
// dashed line always reads as "accuracy" regardless of which subject's
// color is being used for the score line.
export const SECTIONAL_ACCURACY_COLOR = '#94a3b8'