// server/models/Transaction.js
// One income/expense entry. Kept as its own model — completely separate
// from study data (Session/Todo/Subject) so the Money module never
// touches or shows up in study stats.

import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: ['income', 'expense'], required: true },
  amount:   { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true },
  note:     { type: String, trim: true, default: '' },
  date:     { type: String, required: true }, // "YYYY-MM-DD" — same convention as Todo.date
}, { timestamps: true })

transactionSchema.index({ userId: 1, date: 1 })
transactionSchema.index({ userId: 1, type: 1 })

export default mongoose.model('Transaction', transactionSchema)