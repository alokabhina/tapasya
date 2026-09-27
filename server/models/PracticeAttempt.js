// server/models/PracticeAttempt.js
// A single user's run at a PracticeTest — runtime state while in-progress
// (responses, per-question timers, current section) plus the scored result
// once submitted. reattempt support: attemptNumber increments per user+test,
// old attempts stay untouched for the compare table (plan doc Section 10.6).
import mongoose from 'mongoose'

const responseSchema = new mongoose.Schema({
  qNo:          { type: Number, required: true },
  selectedKey:  { type: String, default: null },
  status:       { type: String, enum: ['not-visited', 'not-answered', 'answered', 'marked', 'answered-marked'], default: 'not-visited' },
  timeSpentSec: { type: Number, default: 0 }, // accumulated every time the question loses focus, never overwritten
}, { _id: false })

const sectionStateSchema = new mongoose.Schema({
  sectionName:         { type: String, required: true },
  startedAt:           { type: Date, default: null },
  submittedAt:         { type: Date, default: null },
  timeLeftAtSubmitSec: { type: Number, default: null },
  responses:           { type: [responseSchema], default: [] },

  // computed by utils/practiceScoring.js at section-submit time
  correct:      { type: Number, default: 0 },
  incorrect:    { type: Number, default: 0 },
  unattempted:  { type: Number, default: 0 },
  score:        { type: Number, default: 0 },
  accuracy:     { type: Number, default: 0 },
  timeTakenSec: { type: Number, default: 0 },
}, { _id: false })

const overallSchema = new mongoose.Schema({
  score: Number, maxScore: Number, attempted: Number, totalQuestions: Number,
  correct: Number, incorrect: Number, skipped: Number, unseen: Number,
  accuracy: Number, totalTimeSec: Number, utilizedTimeSec: Number, wastedTimeSec: Number,
  cutoff: Number, passedCutoff: Boolean,
}, { _id: false })

const practiceAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeTest', required: true },
  attemptNumber: { type: Number, required: true }, // 1, 2, 3... per user per test

  status: { type: String, enum: ['in-progress', 'submitted', 'auto-submitted'], default: 'in-progress' },
  startedAt:   { type: Date, default: Date.now },
  submittedAt: { type: Date, default: null },

  currentSectionIndex: { type: Number, default: 0 }, // resume support after refresh/close
  sectionState: { type: [sectionStateSchema], default: [] },
  overall:      { type: overallSchema, default: () => ({}) },

  // Flips true once utils/practiceMockSync.js has pushed this into
  // MockExam/MockAttempt — guarantees a retried/duplicate submit call never
  // double-writes into the Mock Tracker dashboard.
  syncedToMockTracker: { type: Boolean, default: false },
}, { timestamps: true })

practiceAttemptSchema.index({ userId: 1, testId: 1, attemptNumber: -1 })
practiceAttemptSchema.index({ testId: 1, status: 1 }) // leaderboard queries

export default mongoose.model('PracticeAttempt', practiceAttemptSchema)
