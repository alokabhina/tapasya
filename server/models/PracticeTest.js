// server/models/PracticeTest.js
// One uploaded "paper" — sections, shared-context directions (passage /
// puzzle / data-table / sentence-set / instruction) and questions. See
// practice-test-feature-plan.md Section 4.2-4.4 for the full reasoning
// behind the groupId mechanism (it's what drives all 3 question-layout
// modes the live engine renders — single / split-with-shared-context).
import mongoose from 'mongoose'

// A shared block of context that one or more questions point back to via
// groupId. This single mechanism covers every layout seen in the reference
// UI: a repeated generic instruction line (Fillers), a shared RC passage,
// a shared puzzle description, or a shared DI table.
const directionSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  type:    { type: String, enum: ['passage', 'puzzle', 'data-table', 'sentence-set', 'instruction'], required: true },
  title:   { type: String, default: '' },
  content: { type: String, required: true }, // HTML allowed (paragraphs/tables) — sanitized on render, not on save
}, { _id: false })

const optionSchema = new mongoose.Schema({
  key:  { type: String, required: true }, // "A", "B", "C"...
  text: { type: String, required: true },
}, { _id: false })

const questionSchema = new mongoose.Schema({
  qNo:          { type: Number, required: true },   // display number within the full paper (Q: 31/100)
  groupId:      { type: String, default: null },     // null = standalone, full-width layout
  questionText: { type: String, required: true },
  options:      { type: [optionSchema], required: true },
  correctKey:   { type: String, required: true },
  explanation:  { type: String, default: '' },

  // Topic normalization — utils/topicNormalizer.js resolves whatever the AI
  // gave into `topic` before save; `topicRaw` keeps the original for audit.
  // Every weak/strong-topic rollup reads `topic`, never `topicRaw`.
  topic:    { type: String, required: true },
  topicRaw: { type: String, default: '' },
  subTopic: { type: String, default: '' },

  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },

  // Rarely used — lets one odd question override its section's marking scheme
  marksCorrectOverride: { type: Number, default: null },
  marksWrongOverride:   { type: Number, default: null },
}, { _id: false })

const sectionSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  order:         { type: Number, default: 0 },
  durationSec:   { type: Number, required: true }, // per-section timer, fresh countdown on section switch
  marksCorrect:  { type: Number, default: 1 },
  marksWrong:    { type: Number, default: 0.25 },   // stored positive, subtracted at scoring time
  cutoff:        { type: Number, default: null },
  hasCalculator: { type: Boolean, default: false }, // on-screen calculator icon — Quant-type sections only
  directions:    { type: [directionSchema], default: [] },
  questions:     { type: [questionSchema], default: [] },
}, { _id: false })

const practiceTestSchema = new mongoose.Schema({
  subjectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeSubject', required: true },
  title:        { type: String, required: true, trim: true },       // "Speed Math Test 1"
  examTag:      { type: String, default: '' },                       // links into MockExam.name, see utils/practiceMockSync.js
  status:       { type: String, enum: ['draft', 'published'], default: 'draft' },
  instructions: { type: String, default: '' },                       // shown on the pre-start instructions page

  sections: { type: [sectionSchema], default: [] },

  // Cached at save time (routes/practiceTests.js) purely so subject/test
  // list cards can show "100 Qs · 60 min" without walking the full sections
  // array on every list request.
  totalQuestions:   { type: Number, default: 0 },
  totalMarks:       { type: Number, default: 0 },
  totalDurationSec: { type: Number, default: 0 },

  sourceJson: { type: mongoose.Schema.Types.Mixed, default: null }, // raw admin upload, kept as-is for audit/re-edit
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Flips true the first time a PracticeAttempt is created against this
  // test. Once true, structural edits (questions/sections) are blocked —
  // admin has to use POST /:id/clone instead (plan doc Section 8.3), so a
  // live paper's data integrity never shifts under attempts already scored
  // against it.
  hasAttempts: { type: Boolean, default: false },
}, { timestamps: true })

practiceTestSchema.index({ subjectId: 1, status: 1, createdAt: -1 })

export default mongoose.model('PracticeTest', practiceTestSchema)
