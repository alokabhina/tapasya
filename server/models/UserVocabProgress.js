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
}, { timestamps: true })

userVocabProgressSchema.index({ userId: 1, wordId: 1 }, { unique: true })
userVocabProgressSchema.index({ userId: 1, masteryScore: 1 })
userVocabProgressSchema.index({ userId: 1, lastSeenAt: 1 })

export default mongoose.model('UserVocabProgress', userVocabProgressSchema)