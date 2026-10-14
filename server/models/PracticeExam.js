// server/models/PracticeExam.js
// Top level of the Practice Test hierarchy:  Exam -> Subject -> Test.
// e.g. "IBPS Clerk" / "SBI PO" / "SSC CGL". A PracticeSubject belongs to
// exactly one exam (PracticeSubject.examId), so "Reasoning" can exist
// separately under Banking and under SSC without clashing.
import mongoose from 'mongoose'

const practiceExamSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  color:     { type: String, default: '#f97316' },
  order:     { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

practiceExamSchema.index({ order: 1, createdAt: 1 })

export default mongoose.model('PracticeExam', practiceExamSchema)