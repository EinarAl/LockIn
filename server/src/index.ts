import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { config } from './config'
import authRoutes from './routes/auth'
import courseRoutes from './routes/courses'
import gradeRoutes from './routes/grades'
import studyRoutes from './routes/study'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/grades', gradeRoutes)
app.use('/api/study', studyRoutes)

mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('Connected to MongoDB')
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} (no database)`)
    })
  })
