import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  options: [String],
  correctAnswer: { type: String, required: true },
  type: { type: String, enum: ['multiple-choice', 'true-false', 'short-answer', 'word-problem'], default: 'multiple-choice' },
  explanation: String,
  points: { type: Number, default: 1 },
})

const quizSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  topic: String,
  title: String,
  questions: [questionSchema],
}, { timestamps: true })

export default mongoose.model('Quiz', quizSchema)
