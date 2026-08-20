// server/models/MockAttempt.js
// A single mock-test result — either a full mock (multiple sections) or a
// standalone sectional test (one section). `mode` tags which, so stats/
// graphs never accidentally mix the two categories together.
import mongoose from 'mongoose'

const topicSchema = new mongoose.Schema({
  name:            { type: String, required: true },
  correctPct:      { type: Number, default: null },
  correct:         { type: Number, default: null },
  total:           { type: Number, default: null },
  questionNumbers: [{ type: Number }],
}, { _id: false })

const sectionResultSchema = new mongoose.Schema({
  sectionName:   { type: String, required: true },
  score:         { type: Number, default: null },
  maxScore:      { type: Number, default: null },
  attempted:     { type: Number, default: null },
  totalQuestions:{ type: Number, default: null },
  correct:       { type: Number, default: null },
  incorrect:     { type: Number, default: null },
  unattempted:   { type: Number, default: null },
  accuracy:      { type: Number, default: null }, // 0-100
  timeTakenSec:  { type: Number, default: null },
  cutoff:        { type: Number, default: null },
  topics:        [topicSchema],
}, { _id: false })

const compareSchema = new mongoose.Schema({
  score:    { type: Number, default: null },
  accuracy: { type: Number, default: null },
  correct:  { type: Number, default: null },
  wrong:    { type: Number, default: null },
  time:     { type: String, default: null },
}, { _id: false })

const mockAttemptSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'MockExam', required: true },
  mode:          { type: String, enum: ['full', 'sectional'], required: true },
  title:         { type: String, default: null }, // "IBPS PO Prelims Full Test 5"
  // Frontend offers a preset dropdown (Testbook / Guidely / Yes Officer /
  // Oliveboard / Other-custom-text) — stored as plain text here so "Other"
  // entries aren't restricted by an enum.
  platform:      { type: String, default: null },
  attemptedOn:   { type: Date, default: Date.now },

  overall: {
    score: Number, maxScore: Number,
    rank: Number, outOf: Number, percentile: Number,
    accuracy: Number, attempted: Number, totalQuestions: Number,
    correct: Number, incorrect: Number, unattempted: Number,
    timeTakenSec: Number, timeAllottedSec: Number, cutoff: Number,
  },

  sections: [sectionResultSchema], // full → multiple entries; sectional → exactly one

  topperCompare:      { type: compareSchema, default: null },
  averageCompare:     { type: compareSchema, default: null },
  marksDistribution:  [{ bucketLabel: String, count: Number }],

  rawImportedText: { type: String, default: null }, // the AI's original reply, kept for reference
  notes:           { type: String, default: '' },
}, { timestamps: true })

mockAttemptSchema.index({ userId: 1, examProfileId: 1, attemptedOn: -1 })
mockAttemptSchema.index({ userId: 1, examProfileId: 1, mode: 1 })

export default mongoose.model('MockAttempt', mockAttemptSchema)