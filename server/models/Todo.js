import mongoose from 'mongoose'
const todoSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:            { type: String, required: true },
  subjectId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  subjectName:     String,
  subjectColor:    String,
  photoUrl:        String,
  photoUploadedAt: Date,
  done:            { type: Boolean, default: false },
  date:            String,
  priority:        { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  estMins:         Number,
  completedAt:     String,
}, { timestamps: true })
todoSchema.index({ userId: 1, date: 1 })
export default mongoose.model('Todo', todoSchema)
