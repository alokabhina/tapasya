import mongoose from 'mongoose'
const sessionSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  subjectName:  String,
  subjectColor: String,
  startTime:    Date,
  endTime:      Date,
  duration:     Number, // seconds
  notes:        String,
  date:         String, // "YYYY-MM-DD"
}, { timestamps: true })
// Index for fast date-range queries
sessionSchema.index({ userId: 1, date: 1 })
export default mongoose.model('Session', sessionSchema)