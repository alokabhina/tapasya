// server/models/MockExam.js
// A user-defined exam profile (e.g. "IBPS Clerk") with sections they've
// chosen (Quant, English, Reasoning...). Mock attempts (see MockAttempt.js)
// hang off this. Optionally linked to the existing calendar `Exam` (the
// countdown one) — purely optional, never required.
import mongoose from 'mongoose'

const mockExamSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:          { type: String, required: true, trim: true }, // "IBPS Clerk"
  sections:      [{ name: { type: String, required: true, trim: true } }], // ["Quant","English","Reasoning"]
  linkedExamId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null }, // optional link to calendar countdown exam
}, { timestamps: true })

mockExamSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.model('MockExam', mockExamSchema)