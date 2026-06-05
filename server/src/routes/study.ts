import { Router, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { authenticate, AuthRequest } from '../middleware/auth'
import Quiz from '../models/Quiz'
import Flashcard from '../models/Flashcard'
import Course from '../models/Course'
import { AIService } from '../services/ai'
import { OCRService } from '../services/ocr'

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext)
  },
})
const upload = multer({ storage })
const router = Router()

router.use(authenticate)

function asyncHandler(fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next)
  }
}

// --- Quizzes ---

router.get('/quiz/:courseId', async (req: AuthRequest, res: Response) => {
  const quizzes = await Quiz.find({ user: req.userId, course: req.params.courseId }).sort({ createdAt: -1 })
  res.json(quizzes)
})

router.post('/quiz/generate', upload.single('exampleExam'), asyncHandler(async (req: AuthRequest, res: Response) => {
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
}))

router.post('/quiz/:quizId/answer', asyncHandler(async (req: AuthRequest, res: Response) => {
  const quiz = await Quiz.findOne({ _id: req.params.quizId, user: req.userId })
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' })

  const { answers } = req.body
  let score = 0
  const results = quiz.questions.map((q, i) => {
    const userAns = (answers[i] || '').toLowerCase().trim()
    const correctAns = (q.correctAnswer || '').toLowerCase().trim()
    const correct = userAns === correctAns
    if (correct) score++
    return { prompt: q.prompt, correctAnswer: q.correctAnswer, userAnswer: answers[i], isCorrect: correct }
  })

  res.json({ score, total: quiz.questions.length, results })
}))

// --- Flashcards ---

router.get('/flashcard/:courseId', async (req: AuthRequest, res: Response) => {
  const flashcards = await Flashcard.find({ user: req.userId, course: req.params.courseId }).sort({ createdAt: -1 })
  res.json(flashcards)
})

router.post('/flashcard/generate', asyncHandler(async (req: AuthRequest, res: Response) => {
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
}))

router.delete('/flashcard/:id', async (req: AuthRequest, res: Response) => {
  const card = await Flashcard.findOneAndDelete({ _id: req.params.id, user: req.userId })
  if (!card) return res.status(404).json({ error: 'Flashcard not found' })
  res.json({ message: 'Flashcard deleted' })
})

export default router
