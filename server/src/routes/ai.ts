import { Router, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { authenticate, AuthRequest } from '../middleware/auth'
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

router.post('/solve', upload.single('image'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { prompt, language } = req.body
  let fullPrompt = prompt || ''

  if (req.file) {
    const text = await OCRService.processFile(req.file.path)
    fullPrompt = text + '\n\n' + (prompt || '')
  }

  if (!fullPrompt.trim()) {
    return res.status(400).json({ error: 'Provide a problem description or image' })
  }

  const result = await AIService.solveProblem(fullPrompt, 'code', language || 'Python')
  res.json(result)
}))

router.post('/generate-exam', upload.single('exampleExam'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { courseId, language } = req.body

  let context = ''
  if (req.file) {
    context = await OCRService.processFile(req.file.path)
  }

  if (!context.trim()) {
    return res.status(400).json({ error: 'Upload an example exam first' })
  }

  const result = await AIService.generateQuiz(context, 'exam', language || 'Python')
  res.json(result)
}))

router.post('/interview-challenges', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { topic, position, syllabusText, language } = req.body
  const result = await AIService.generateInterviewChallenges({ topic, position, syllabusText, language: language || 'Python' })
  res.json(result)
}))

router.post('/interview-challenge', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, language, position, topic } = req.body
  const result = await AIService.getInterviewChallenge({ title, language: language || 'Python', position, topic })
  res.json(result)
}))

router.post('/evaluate-answer', asyncHandler(async (req: AuthRequest, res: Response) => {
  const { problemTitle, problemDescription, userAnswer, language } = req.body
  const result = await AIService.evaluateInterviewAnswer({ problemTitle, problemDescription, userAnswer, language: language || 'Python' })
  res.json(result)
}))

export default router
