// server/models/QuickExpense.js
// A saved preset for one-tap expense logging — "Litti ₹20", "Namkeen ₹5",
// the small daily purchases a student makes repeatedly. Tapping the preset
// on the Money page creates a Transaction directly, no form.

import mongoose from 'mongoose'

const quickExpenseSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  label:    { type: String, required: true, trim: true },   // "Litti", "Namkeen"
  amount:   { type: Number, required: true, min: 0 },
  category: { type: String, required: true, trim: true },
  type:     { type: String, enum: ['income', 'expense'], default: 'expense' },
  order:    { type: Number, default: 0 }, // display order, oldest-first by default
}, { timestamps: true })

quickExpenseSchema.index({ userId: 1, order: 1 })

export default mongoose.model('QuickExpense', quickExpenseSchema)