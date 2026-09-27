// server/models/PracticeSubject.js
// Admin-created subject bucket for the Practice Test engine (e.g. "Quant",
// "Reasoning", "English"). Separate from models/Subject.js on purpose — that
// one powers Home/Timer/Syllabus study-tracking subjects, this one is the
// Practice Test bank's own namespace. `examCategory` exists purely so a
// second exam bank (SSC, Railway...) can be introduced later without a
// migration — see practice-test-feature-plan.md Section 1.
import mongoose from 'mongoose'

const practiceSubjectSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },       // "Quant", "Reasoning", "English"
  examCategory: { type: String, default: 'Banking', trim: true },   // future-proofing, not filtered on in v1 UI
  color:        { type: String, default: '#f97316' },
  order:        { type: Number, default: 0 },                       // manual sort order for the landing page
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

practiceSubjectSchema.index({ examCategory: 1, order: 1 })

export default mongoose.model('PracticeSubject', practiceSubjectSchema)
