import mongoose from 'mongoose'

const weakTopicSchema = new mongoose.Schema({
  topic:         String,
  wrongCount:    { type: Number, default: 0 },
  totalAttempts: { type: Number, default: 0 },
}, { _id: false })

const gameStatSchema = new mongoose.Schema({
  gamesPlayed: { type: Number, default: 0 },
  bestScore:   { type: Number, default: 0 },
  bestStreak:  { type: Number, default: 0 },
  rankPoints:  { type: Number, default: 0 },
  rank:        { type: String, default: 'bronze', enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'] },
  weakTopics:  { type: [weakTopicSchema], default: [] },
}, { _id: false })

const questionHistorySchema = new mongoose.Schema({
  questionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  topic:        String,
  gameType:     String,
  wrongCount:   { type: Number, default: 0 },
  attemptCount: { type: Number, default: 0 },
  lastAttempted:{ type: Date, default: Date.now },
}, { _id: false })

const userGameProfileSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  totalXP:  { type: Number, default: 0 },
  level:    { type: String, default: 'aspirant', enum: ['aspirant', 'learner', 'contender', 'achiever', 'champion', 'legend'] },
  gameStats: {
    calculation: { type: gameStatSchema, default: () => ({}) },
    series:      { type: gameStatSchema, default: () => ({}) },
    vocab:       { type: gameStatSchema, default: () => ({}) },
    syllogism:   { type: gameStatSchema, default: () => ({}) },
    survival:    { type: gameStatSchema, default: () => ({}) },
  },
  questionHistory: { type: [questionHistorySchema], default: [] },
  dailyStreak:     { type: Number, default: 0 },
  lastGameDate:    { type: String, default: '' }, // YYYY-MM-DD
}, { timestamps: true })

userGameProfileSchema.index({ userId: 1 })

export default mongoose.model('UserGameProfile', userGameProfileSchema)
