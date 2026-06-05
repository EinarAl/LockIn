import mongoose from 'mongoose'

const eventSchema = new mongoose.Schema({
  date: { type: String, required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['exam', 'quiz', 'assignment', 'project', 'other'], default: 'other' },
  color: { type: String, default: '#3b82f6' },
})

const gradeCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  weight: { type: Number, required: true },
})

const courseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  code: String,
  term: String,
  instructor: String,
  events: [eventSchema],
  gradeCategories: [gradeCategorySchema],
  rawSyllabusText: String,
}, { timestamps: true })

export default mongoose.model('Course', courseSchema)
