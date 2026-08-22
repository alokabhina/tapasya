// server/models/CurrentAffair.js
// Global (not per-user) daily current-affairs feed. Entries come from two
// places: (1) the daily RSS cron (see utils/rssFetcher.js + routes/cron
// CurrentAffairs.js) which auto-fills `source`/`sourceUrl`/`headline`/
// `oneLiner` and a best-guess `category`, and (2) the admin — either a
// single manual add, or a bulk paste-JSON import (used for backfilling
// past months from a PDF run through an external AI, since RSS feeds only
// ever expose their most recent items, never a full history).
//
// The tag-style fields (entity/action/value/blankableFact) exist so a
// human can later hand-build MCQs from these without needing an in-app
// LLM call — see CAExportPanel.jsx, which exports a month's worth of
// entries as text/PDF for that exact purpose.
import mongoose from 'mongoose'

const CATEGORIES = [
  'Banking', 'RBI', 'Appointment', 'Scheme', 'Award',
  'Static-Trigger', 'Sports', 'International', 'National', 'Economy', 'Other',
]

const currentAffairSchema = new mongoose.Schema({
  headline:      { type: String, required: true, trim: true },
  oneLiner:      { type: String, required: true, trim: true }, // the actual revision-ready fact
  date:          { type: Date, required: true },                // when the news happened/was published
  month:         { type: String, required: true, index: true }, // 'YYYY-MM' — precomputed for fast filtering

  category:      { type: String, enum: CATEGORIES, default: 'Other', index: true },
  source:        { type: String, required: true },               // 'RBI' | 'PIB' | 'Economic Times' | 'Admin' | ...
  sourceUrl:     { type: String, default: null },

  // Structured "tag" fields — filled by the rule-based categorizer on
  // auto-fetch, or by the admin manually / via bulk import. Optional,
  // since not every entry naturally has all of these.
  entity:         { type: String, default: '' }, // who/what — "IREDA"
  action:         { type: String, default: '' }, // did what — "granted Navratna status"
  value:          { type: String, default: '' }, // number/place/date fact — "₹5,000 crore limit"
  blankableFact:  { type: String, default: '' }, // cloze-style sentence — "IREDA was granted ___ status"

  addedBy:       { type: String, enum: ['cron', 'admin'], default: 'admin' },
  createdByEmail: { type: String, default: null }, // which admin added/edited it manually, if any

  // Dedup key for the RSS cron — same link should never be inserted twice.
  dedupeKey:     { type: String, default: null, index: true, unique: true, sparse: true },
}, { timestamps: true })

currentAffairSchema.index({ month: 1, category: 1, date: -1 })
currentAffairSchema.index({ headline: 'text', oneLiner: 'text' })

export const CA_CATEGORIES = CATEGORIES
export default mongoose.model('CurrentAffair', currentAffairSchema)
