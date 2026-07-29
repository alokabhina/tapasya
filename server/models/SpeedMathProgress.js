// server/models/SpeedMathProgress.js
// One document per user. Tracks per-item stats (e.g. table-23, square-17, fraction 1/8)
// so we can compute weak-area suggestions + heatmaps on the Stats page.
// Kept fully separate from Practice Arena's UserGameProfile/GameSession by design.

import mongoose from 'mongoose'

const ItemStatSchema = new mongoose.Schema({
  module:        { type: String, enum: ['table', 'square', 'cube', 'percent'], required: true },
  itemKey:       { type: String, required: true }, // e.g. "23" (table/square/cube) or "1/8" (percent)
  attempts:      { type: Number, default: 0 },
  correctCount:  { type: Number, default: 0 },
  wrongCount:    { type: Number, default: 0 },
  totalTimeMs:   { type: Number, default: 0 }, // for avg speed
  lastAttempted: { type: Date },
}, { _id: false })

const SpeedMathProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  items:  { type: [ItemStatSchema], default: [] },

  // Aggregate, cheap-to-read counters (avoid recomputing from items[] on every home-screen load)
  totalTests:      { type: Number, default: 0 },
  totalQuestions:  { type: Number, default: 0 },
  totalCorrect:    { type: Number, default: 0 },
  currentStreak:   { type: Number, default: 0 }, // consecutive days with >=1 test
  bestStreak:      { type: Number, default: 0 },
  lastTestDate:    { type: Date },
}, { timestamps: true })

SpeedMathProgressSchema.methods.findOrCreateItem = function (module, itemKey) {
  let item = this.items.find((i) => i.module === module && i.itemKey === itemKey)
  if (!item) {
    item = { module, itemKey, attempts: 0, correctCount: 0, wrongCount: 0, totalTimeMs: 0 }
    this.items.push(item)
    item = this.items[this.items.length - 1]
  }
  return item
}

export default mongoose.model('SpeedMathProgress', SpeedMathProgressSchema)