import mongoose from 'mongoose'
const subjectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:   { type: String, required: true },
  color:  { type: String, default: '#f97316' },
}, { timestamps: true })
export default mongoose.model('Subject', subjectSchema)