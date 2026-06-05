import mongoose from 'mongoose'

const gradeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  category: { type: String, required: true },
  name: { type: String, required: true },
  score: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  date: String,
}, { timestamps: true })

export default mongoose.model('Grade', gradeSchema)
