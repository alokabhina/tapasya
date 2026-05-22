import mongoose from 'mongoose'

const perQuestionSchema = new mongoose.Schema({
  questionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
  topic:        String,
  isCorrect:    Boolean,
  timeTaken:    Number, // seconds
  pointsEarned: Number,
  userAnswer:   String,
  correctAnswer:String,
}, { _id: false })

const gameSessionSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameType:      { type: String, required: true, enum: ['calculation', 'series', 'vocab', 'syllogism', 'survival'] },
  score:         { type: Number, default: 0 },
  xpEarned:      { type: Number, default: 0 },
  correctCount:  { type: Number, default: 0 },
  wrongCount:    { type: Number, default: 0 },
  totalQuestions:{ type: Number, default: 0 },
  avgTimeSecs:   { type: Number, default: 0 },
  maxStreak:     { type: Number, default: 0 },
  maxLevel:      { type: Number, default: 1 },   // for calculation climb
  survivalCount: { type: Number, default: 0 },   // for survival arena
  date:          { type: String },               // YYYY-MM-DD
  breakdown:     { type: [perQuestionSchema], default: [] },
}, { timestamps: true })

gameSessionSchema.index({ userId: 1, gameType: 1, createdAt: -1 })

export default mongoose.model('GameSession', gameSessionSchema)
