// server/models/CAQuestion.js
// MCQ bank for Current Affairs — deliberately separate from VocabQuestion
// (Vocab Master's Question Bank), since these are a different subject area
// entirely (banking/GA facts, not vocabulary) and the user wants them kept
// in their own place, not mixed into Vocab. Global (not per-user), admin
// uploads via JSON paste (see BulkJsonImporter) after running an exported
// Current Affairs PDF through an external AI — same manual-AI pipeline as
// everything else in this feature, no in-app LLM call.
import mongoose from 'mongoose'

const CATEGORIES = [
  'Banking', 'RBI', 'Appointment', 'Scheme', 'Award',
  'Static-Trigger', 'Sports', 'International', 'National', 'Economy', 'Other',
]

const caQuestionSchema = new mongoose.Schema({
  question:      { type: String, required: true, trim: true },
  options:       { type: [String], required: true },
  correctAnswer: { type: String, required: true, trim: true },
  explanation:   { type: String, default: '' },

  category:  { type: String, enum: CATEGORIES, default: 'Other', index: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },

  // Which month's current-affairs batch this was generated from, e.g.
  // '2026-08' — lets practice sessions be scoped to "this month's set".
  month: { type: String, default: '', index: true },

  source: { type: String, enum: ['manual', 'json-upload'], default: 'json-upload' },
  createdByEmail: { type: String, default: null },
}, { timestamps: true })

caQuestionSchema.index({ month: 1, category: 1 })

export const CAQ_CATEGORIES = CATEGORIES
export default mongoose.model('CAQuestion', caQuestionSchema)