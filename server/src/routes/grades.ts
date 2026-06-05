import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import Grade from '../models/Grade'
import Course from '../models/Course'

const router = Router()

router.use(authenticate)

router.get('/:courseId', async (req: AuthRequest, res: Response) => {
  const grades = await Grade.find({ user: req.userId, course: req.params.courseId }).sort({ createdAt: -1 })
  res.json(grades)
})

router.post('/:courseId', async (req: AuthRequest, res: Response) => {
  try {
    const { category, name, score, maxScore, date } = req.body
    const grade = await Grade.create({
      user: req.userId,
      course: req.params.courseId,
      category, name, score, maxScore, date,
    })
    res.status(201).json(grade)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create grade' })
  }
})

router.put('/:courseId/:gradeId', async (req: AuthRequest, res: Response) => {
  const grade = await Grade.findOneAndUpdate(
    { _id: req.params.gradeId, user: req.userId, course: req.params.courseId },
    req.body,
    { new: true }
  )
  if (!grade) return res.status(404).json({ error: 'Grade not found' })
  res.json(grade)
})

router.delete('/:courseId/:gradeId', async (req: AuthRequest, res: Response) => {
  const grade = await Grade.findOneAndDelete({ _id: req.params.gradeId, user: req.userId })
  if (!grade) return res.status(404).json({ error: 'Grade not found' })
  res.json({ message: 'Grade deleted' })
})

router.get('/:courseId/analysis', async (req: AuthRequest, res: Response) => {
  try {
    const course = await Course.findOne({ _id: req.params.courseId, user: req.userId })
    if (!course) return res.status(404).json({ error: 'Course not found' })

    const grades = await Grade.find({ user: req.userId, course: req.params.courseId })
    const categories = course.gradeCategories

    if (categories.length === 0) {
      return res.json({ currentGrade: null, categoryBreakdown: [], message: 'No grade categories defined. Parse your syllabus first.' })
    }

    const categoryBreakdown = categories.map((cat) => {
      const catGrades = grades.filter((g) => g.category === cat.name)
      const earned = catGrades.reduce((sum, g) => sum + g.score, 0)
      const max = catGrades.reduce((sum, g) => sum + g.maxScore, 0)
      const percentage = max > 0 ? (earned / max) * 100 : 0
      return {
        category: cat.name,
        weight: cat.weight,
        earned,
        max,
        percentage: Math.round(percentage * 100) / 100,
      }
    })

    const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0)
    let currentGrade = 0
    for (const b of categoryBreakdown) {
      currentGrade += (b.percentage / 100) * b.weight
    }
    if (totalWeight > 0) {
      currentGrade = Math.round((currentGrade / totalWeight) * 10000) / 100
    }

    res.json({ currentGrade, categoryBreakdown })
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate grades' })
  }
})

router.post('/:courseId/what-if', async (req: AuthRequest, res: Response) => {
  try {
    const { targetGrade } = req.body
    const course = await Course.findOne({ _id: req.params.courseId, user: req.userId })
    if (!course) return res.status(404).json({ error: 'Course not found' })

    const grades = await Grade.find({ user: req.userId, course: req.params.courseId })
    const categories = course.gradeCategories

    const breakdown = categories.map((cat) => {
      const catGrades = grades.filter((g) => g.category === cat.name)
      const earned = catGrades.reduce((sum, g) => sum + g.score, 0)
      const max = catGrades.reduce((sum, g) => sum + g.maxScore, 0)
      const percentage = max > 0 ? (earned / max) * 100 : 0
      return { name: cat.name, weight: cat.weight, percentage, earned, max }
    })

    const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0)
    let currentGrade = 0
    let weightSoFar = 0
    for (const b of breakdown) {
      currentGrade += (b.percentage / 100) * b.weight
      if (b.max > 0) weightSoFar += b.weight
    }
    const currentPercent = totalWeight > 0 ? (currentGrade / totalWeight) * 100 : 0

    const remainingWeight = Math.max(0, totalWeight - weightSoFar)
    let needed = null
    if (remainingWeight > 0 && targetGrade) {
      needed = ((targetGrade - currentPercent * (weightSoFar / totalWeight)) / (remainingWeight / totalWeight))
      needed = Math.round(needed * 100) / 100
    }

    res.json({ currentGrade: Math.round(currentPercent * 100) / 100, targetGrade, neededOnRemaining: needed, remainingWeight })
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate what-if' })
  }
})

export default router
