import mongoose from 'mongoose'

const topicSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  examId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  name:      { type: String, required: true, trim: true },
  done:      { type: Boolean, default: false },
  source:    { type: String, enum: ['manual', 'pdf', 'paste'], default: 'manual' },
  order:     { type: Number, default: 0 },
  // Revision tracking
  revision1: { type: Boolean, default: false },
  revision2: { type: Boolean, default: false },
  // Confidence level: 0=not set, 1=low, 2=medium, 3=high
  confidence: { type: Number, default: 0, min: 0, max: 3 },
  notes:     { type: String, default: '' },
}, { timestamps: true })

topicSchema.index({ userId: 1, examId: 1, subjectId: 1 })

export default mongoose.model('SyllabusTopic', topicSchema)