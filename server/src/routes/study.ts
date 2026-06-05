import { Router, Response } from 'express'
import multer from 'multer'
import { authenticate, AuthRequest } from '../middleware/auth'
import Quiz from '../models/Quiz'
import Flashcard from '../models/Flashcard'
import Course from '../models/Course'
import { AIService } from '../services/ai'
import { OCRService } from '../services/ocr'

const upload = multer({ dest: 'uploads/' })
const router = Router()

router.use(authenticate)

// --- Quizzes ---

router.get('/quiz/:courseId', async (req: AuthRequest, res: Response) => {
  const quizzes = await Quiz.find({ user: req.userId, course: req.params.courseId }).sort({ createdAt: -1 })
  res.json(quizzes)
})

router.post('/quiz/generate', upload.single('exampleExam'), async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, topic, type, language } = req.body
    let materialText = topic || ''

    if (req.file) {
      const text = await OCRService.processFile(req.file.path)
      if (text.trim()) materialText = text + '\n\n' + (materialText || '')
    }
    let context = materialText

    if (courseId) {
      const course = await Course.findOne({ _id: courseId, user: req.userId })
      if (course?.rawSyllabusText && !req.file) {
        context = `Course: ${course.name}\nSyllabus: ${course.rawSyllabusText.slice(0, 3000)}`
      }
    }

    const quizData = await AIService.generateQuiz(context || 'General topic', type || 'quiz', language)
    const quiz = await Quiz.create({
      user: req.userId,
      course: courseId,
      topic: topic || 'General',
      title: `${topic || 'Practice'} Quiz`,
      questions: quizData.questions || [],
    })

    res.status(201).json(quiz)
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate quiz' })
  }
})

router.post('/quiz/:quizId/answer', async (req: AuthRequest, res: Response) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.quizId, user: req.userId })
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

    const { answers } = req.body
    let score = 0
    const results = quiz.questions.map((q, i) => {
      const correct = answers[i]?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
      if (correct) score++
      const isCorrect = correct
      return { question: q.question, correctAnswer: q.correctAnswer, userAnswer: answers[i], isCorrect }
    })

    res.json({ score, total: quiz.questions.length, results })
  } catch (err) {
    res.status(500).json({ error: 'Failed to grade quiz' })
  }
})

// --- Flashcards ---

router.get('/flashcard/:courseId', async (req: AuthRequest, res: Response) => {
  const flashcards = await Flashcard.find({ user: req.userId, course: req.params.courseId }).sort({ createdAt: -1 })
  res.json(flashcards)
})

router.post('/flashcard/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { courseId, topic, text } = req.body

    let flashcardsData
    if (text) {
      flashcardsData = await AIService.extractFlashcards(text)
    } else {
      flashcardsData = await AIService.generateFlashcards(topic || 'General')
    }

    const cards = (flashcardsData.flashcards || []).map((f: any) => ({
      user: req.userId,
      course: courseId,
      topic: topic || 'General',
      front: f.front,
      back: f.back,
    }))

    const created = await Flashcard.insertMany(cards)
    res.status(201).json(created)
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate flashcards' })
  }
})

router.delete('/flashcard/:id', async (req: AuthRequest, res: Response) => {
  const card = await Flashcard.findOneAndDelete({ _id: req.params.id, user: req.userId })
  if (!card) return res.status(404).json({ error: 'Flashcard not found' })
  res.json({ message: 'Flashcard deleted' })
})

export default router
