import { Router, Response } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User'
import { config } from '../config'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

function signToken(userId: string) {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' })
}

router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' })
    }

    const user = await User.create({ email, password, name })
    const token = signToken(user._id.toString())
    res.status(201).json({ token, user: { id: user._id.toString(), email: user.email, name: user.name } })
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const match = await (user as any).comparePassword(password)
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken(user._id.toString())
    res.json({ token, user: { id: user._id.toString(), email: user.email, name: user.name } })
  } catch (err) {
    res.status(500).json({ error: 'Login failed' })
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({ user: { id: user._id.toString(), email: user.email, name: user.name } })
  } catch (err) {
    console.error('/auth/me error:', err)
    res.status(500).json({ error: 'Failed to get user' })
  }
})

export default router
