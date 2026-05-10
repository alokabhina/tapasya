import mongoose from 'mongoose'
const todoSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:         { type: String, required: true },
  subjectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  subjectName:  String,
  subjectColor: String,
  photoUrl:     String,
  done:         { type: Boolean, default: false },
  date:         String, // "YYYY-MM-DD"
}, { timestamps: true })
todoSchema.index({ userId: 1, date: 1 })
export default mongoose.model('Todo', todoSchema)