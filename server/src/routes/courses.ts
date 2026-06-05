import { Router, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { authenticate, AuthRequest } from '../middleware/auth'
import Course from '../models/Course'
import { OCRService } from '../services/ocr'
import { generateCalendarEvents } from '../services/syllabus'

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

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, term, instructor } = req.body
    const course = await Course.create({ user: req.userId, name, code, term, instructor })
    res.status(201).json(course)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create course' })
  }
})

router.get('/', async (req: AuthRequest, res: Response) => {
  const courses = await Course.find({ user: req.userId }).sort({ createdAt: -1 })
  res.json(courses)
})

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const course = await Course.findOne({ _id: req.params.id, user: req.userId })
  if (!course) return res.status(404).json({ error: 'Course not found' })
  res.json(course)
})

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const course = await Course.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    req.body,
    { new: true }
  )
  if (!course) return res.status(404).json({ error: 'Course not found' })
  res.json(course)
})

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const course = await Course.findOneAndDelete({ _id: req.params.id, user: req.userId })
  if (!course) return res.status(404).json({ error: 'Course not found' })
  res.json({ message: 'Course deleted' })
})

router.post('/:id/upload-syllabus', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, user: req.userId })
    if (!course) return res.status(404).json({ error: 'Course not found' })

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

    const text = await OCRService.processFile(req.file.path)
    course.rawSyllabusText = text
    await course.save()

    res.json({ message: 'Syllabus uploaded', textLength: text.length })
  } catch (err) {
    res.status(500).json({ error: 'Failed to process syllabus' })
  }
})

router.post('/:id/parse-syllabus', async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, user: req.userId })
    if (!course) return res.status(404).json({ error: 'Course not found' })
    if (!course.rawSyllabusText) return res.status(400).json({ error: 'No syllabus text. Upload a syllabus first.' })

    const parsed = await generateCalendarEvents(course.rawSyllabusText, course.name)

    if (parsed.events) {
      for (const e of parsed.events) {
        (course.events as any).push({ date: e.date, title: e.title, type: e.type || 'other' })
      }
    }
    if (parsed.gradeCategories) {
      for (const g of parsed.gradeCategories) {
        (course.gradeCategories as any).push({ name: g.name, weight: g.weight })
      }
    }

    await course.save()
    res.json({ events: course.events, gradeCategories: course.gradeCategories })
  } catch (err) {
    res.status(500).json({ error: 'Failed to parse syllabus' })
  }
})

router.post('/:id/events', async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, user: req.userId })
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const { date, title, type, color } = req.body
    ;(course.events as any).push({ date, title, type: type || 'other', color: color || '#3b82f6' })
    await course.save()
    res.status(201).json(course.events[course.events.length - 1])
  } catch (err) {
    res.status(500).json({ error: 'Failed to add event' })
  }
})

router.put('/:id/events/:eventId', async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, user: req.userId })
    if (!course) return res.status(404).json({ error: 'Course not found' })
    const event = (course.events as any).id(req.params.eventId)
    if (!event) return res.status(404).json({ error: 'Event not found' })
    const { title, type, color, date } = req.body
    if (title !== undefined) event.title = title
    if (type !== undefined) event.type = type
    if (color !== undefined) event.color = color
    if (date !== undefined) event.date = date
    await course.save()
    res.json(event)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update event' })
  }
})

router.delete('/:id/events/:eventId', async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findOne({ _id: req.params.id, user: req.userId })
    if (!course) return res.status(404).json({ error: 'Course not found' })
    ;(course.events as any).pull({ _id: req.params.eventId })
    await course.save()
    res.json({ message: 'Event deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' })
  }
})

export default router
