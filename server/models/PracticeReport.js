// server/models/PracticeReport.js
// Red-flag reports raised by a student mid-test — either against one
// specific question ("this question looks wrong") or the whole test
// ("something's off with this paper"). Admin reviews these in
// /practice-tests/admin/reports (routes/practiceAttempts.js owns the
// admin list/resolve endpoints, same pattern as practiceAdminMiddleware
// elsewhere).
import mongoose from 'mongoose'

const practiceReportSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // null for scope: 'app' (a general feedback report raised from the bottom
  // nav, not tied to any test/attempt)
  testId:    { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeTest', default: null },
  attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeAttempt', default: null },

  scope:        { type: String, enum: ['question', 'test', 'app'], required: true },
  sectionIndex: { type: Number, default: null },
  qNo:          { type: Number, default: null }, // only set when scope === 'question'
  page:         { type: String, default: null }, // only set when scope === 'app' — the route the user was on
  message:      { type: String, default: '', trim: true, maxlength: 1000 },

  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
}, { timestamps: true })

practiceReportSchema.index({ status: 1, createdAt: -1 })
practiceReportSchema.index({ testId: 1 })

export default mongoose.model('PracticeReport', practiceReportSchema)