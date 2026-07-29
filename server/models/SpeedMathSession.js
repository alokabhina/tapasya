// server/models/SpeedMathSession.js
// One document per completed Speed Math test. Powers History + Stats trend charts.

import mongoose from 'mongoose'

const BreakdownItemSchema = new mongoose.Schema({
  module:        { type: String, enum: ['table', 'square', 'cube', 'percent'], required: true },
  itemKey:       { type: String, required: true },
  questionText:  { type: String },
  userAnswer:    { type: String },
  correctAnswer: { type: String },
  isCorrect:     { type: Boolean, required: true },
  timeTakenMs:   { type: Number, required: true },
}, { _id: false })

const SpeedMathSessionSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  modules: { type: [String], required: true }, // e.g. ['table'] or ['table','square','cube','percent'] for Mix

  config: {
    tableRange:      [Number],
    squareRange:      [Number],
    cubeRange:        [Number],
    percentTier:      String,
    questionCount:    Number,
    timePerQuestion:  Number,
  },

  totalQuestions: { type: Number, required: true },
  correctCount:   { type: Number, required: true },
  wrongCount:     { type: Number, required: true },
  skippedCount:   { type: Number, default: 0 }, // timed out with no answer
  avgTimeMs:      { type: Number, required: true },
  accuracy:       { type: Number, required: true }, // 0-100

  breakdown: { type: [BreakdownItemSchema], default: [] },
}, { timestamps: true })

SpeedMathSessionSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model('SpeedMathSession', SpeedMathSessionSchema)