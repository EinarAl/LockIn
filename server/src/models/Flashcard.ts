import mongoose from 'mongoose'

const flashcardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  topic: String,
  front: { type: String, required: true },
  back: { type: String, required: true },
}, { timestamps: true })

export default mongoose.model('Flashcard', flashcardSchema)
