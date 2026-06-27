import mongoose from 'mongoose'

// Tracks daily "words revised today" streak for Vocab Master, separate from
// the game-XP dailyStreak on UserGameProfile (alag from VocabBlitz game)
const userVocabStreakSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  dailyTarget:     { type: Number, default: 10 },
  todayCount:      { type: Number, default: 0 },   // words answered today (quiz attempts)
  lastActiveDate:  { type: String, default: '' },  // YYYY-MM-DD
  currentStreak:   { type: Number, default: 0 },
  longestStreak:   { type: Number, default: 0 },
}, { timestamps: true })

userVocabStreakSchema.index({ userId: 1 })

export default mongoose.model('UserVocabStreak', userVocabStreakSchema)