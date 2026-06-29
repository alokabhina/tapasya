import mongoose from 'mongoose'
const subjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:   { type: String, required: true },
  color:  { type: String, default: '#f97316' },
  // 'main'    -> shows on Home page / Timer (the original study-tracking subjects)
  // 'syllabus'-> created from inside Syllabus Tracker, independent of Home/Timer
  // Existing documents have no scope set and are treated as 'main' for
  // backwards compatibility (see routes/subjects.js).
  scope:  { type: String, enum: ['main', 'syllabus'], default: 'main' },
}, { timestamps: true })
export default mongoose.model('Subject', subjectSchema)