import mongoose from 'mongoose'

const userVocabProgressSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wordId:       { type: mongoose.Schema.Types.ObjectId, ref: 'VocabWord', required: true },
  seenCount:    { type: Number, default: 0 },
  wrongCount:   { type: Number, default: 0 },
  // masteryScore 0-100: goes up on correct, down on wrong
  masteryScore: { type: Number, default: 0, min: 0, max: 100 },
  lastSeenAt:   { type: Date, default: null },
  // track which calendar date was last quiz (YYYY-MM-DD) for word-of-day logic
  lastSeenDate: { type: String, default: '' },

  // ── SM-2 lite spaced repetition ──────────────────────────────────────────
  repetitions:    { type: Number, default: 0 },    // consecutive correct streak for this word
  easeFactor:     { type: Number, default: 2.5 },   // SM-2 ease factor, min 1.3
  intervalDays:   { type: Number, default: 0 },     // current interval in days
  nextReviewDate: { type: Date, default: null },    // due date — null/past = due now
}, { timestamps: true })

userVocabProgressSchema.index({ userId: 1, nextReviewDate: 1 })

userVocabProgressSchema.index({ userId: 1, wordId: 1 }, { unique: true })
userVocabProgressSchema.index({ userId: 1, masteryScore: 1 })
userVocabProgressSchema.index({ userId: 1, lastSeenAt: 1 })

export default mongoose.model('UserVocabProgress', userVocabProgressSchema)