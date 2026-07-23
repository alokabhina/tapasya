import mongoose from 'mongoose'

// Mirrors UserVocabProgress but tracks attempts against VocabQuestion items
// instead of VocabWord — same SM-2-lite spaced repetition so weak/incorrect
// questions resurface sooner in future practice sessions.
const userVocabQuestionProgressSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'VocabQuestion', required: true },
  seenCount:    { type: Number, default: 0 },
  wrongCount:   { type: Number, default: 0 },
  masteryScore: { type: Number, default: 0, min: 0, max: 100 },
  lastSeenAt:   { type: Date, default: null },
  lastSeenDate: { type: String, default: '' },

  // ── SM-2 lite spaced repetition ──────────────────────────────────────────
  repetitions:    { type: Number, default: 0 },
  easeFactor:     { type: Number, default: 2.5 },
  intervalDays:   { type: Number, default: 0 },
  nextReviewDate: { type: Date, default: null },
}, { timestamps: true })

userVocabQuestionProgressSchema.index({ userId: 1, nextReviewDate: 1 })
userVocabQuestionProgressSchema.index({ userId: 1, questionId: 1 }, { unique: true })
userVocabQuestionProgressSchema.index({ userId: 1, masteryScore: 1 })

export default mongoose.model('UserVocabQuestionProgress', userVocabQuestionProgressSchema)