// server/models/MoneyCategory.js
// A custom category name the user typed once — remembered so it shows up
// as a chip next time, on top of the built-in defaults (which live in
// client/src/utils/money.js and are never stored here).

import mongoose from 'mongoose'

const moneyCategorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:   { type: String, required: true, trim: true },
  type:   { type: String, enum: ['income', 'expense'], required: true },
}, { timestamps: true })

// One user can't save the same category name twice for the same type
moneyCategorySchema.index({ userId: 1, type: 1, name: 1 }, { unique: true })

export default mongoose.model('MoneyCategory', moneyCategorySchema)