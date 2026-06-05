import { useEffect, useRef, useState, useCallback } from 'react'

const COLORS = ['#fff', '#eab308', '#f97316', '#000']
const GRAVITY = 0.5
const JUMP = -8
const PIPE_WIDTH = 50
const PIPE_GAP = 140
const PIPE_SPEED = 3
const GROUND_HEIGHT = 60

export default function FlappyBird({ onDone }: { onDone?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const gameRef = useRef<any>({})
  const animRef = useRef<number>(0)

  const getBirdGrid = (): string[] => {
    try {
      const saved = localStorage.getItem('birdGrid')
      return saved ? JSON.parse(saved) : ['00100', '01110', '11111', '11111', '01110', '00100']
    } catch {
      return ['00100', '01110', '11111', '11111', '01110', '00100']
    }
  }

  const drawBird = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number) => {
    const grid = getBirdGrid()
    ctx.save()
    ctx.translate(x + 15, y + 15)
    ctx.rotate(rotation)
    grid.forEach((row, ri) => {
      row.split('').forEach((cell, ci) => {
        if (cell !== '0') {
          ctx.fillStyle = COLORS[Number(cell)] || '#eab308'
          ctx.fillRect(ci * 5 - 12, ri * 5 - 12, 5, 5)
        }
      })
    })
    ctx.restore()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const state = {
      bird: { x: 60, y: 200, vy: 0 },
      pipes: [] as any[],
      score: 0,
      frame: 0,
    }

    gameRef.current = state

    const addPipe = () => {
      const minY = 60
      const maxY = canvas.height - GROUND_HEIGHT - PIPE_GAP - 60
      const topHeight = Math.floor(Math.random() * (maxY - minY) + minY)
      state.pipes.push({
        x: canvas.width,
        topHeight,
        scored: false,
      })
    }

    const jump = () => {
      if (gameOver) {
        reset()
        return
      }
      if (!playing) setPlaying(true)
      state.bird.vy = JUMP
    }

    const reset = () => {
      state.bird.y = 200
      state.bird.vy = 0
      state.pipes = []
      state.score = 0
      setScore(0)
      setGameOver(false)
      setPlaying(false)
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); jump() }
    }
    const handleClick = () => jump()

    window.addEventListener('keydown', handleKey)
    canvas.addEventListener('click', handleClick)

    const loop = () => {
      if (paused) {
        animRef.current = requestAnimationFrame(loop)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background
      ctx.fillStyle = '#87ceeb'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#90ee90'
      ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT)

      if (playing && !gameOver) {
        state.bird.vy += GRAVITY
        state.bird.y += state.bird.vy

        if (state.frame % 90 === 0) addPipe()

        state.pipes.forEach((pipe) => {
          pipe.x -= PIPE_SPEED

          // Collision
          if (
            state.bird.x + 25 > pipe.x &&
            state.bird.x < pipe.x + PIPE_WIDTH &&
            (state.bird.y < pipe.topHeight || state.bird.y + 20 > pipe.topHeight + PIPE_GAP)
          ) {
            setGameOver(true)
          }

          if (!pipe.scored && pipe.x + PIPE_WIDTH < state.bird.x) {
            pipe.scored = true
            state.score++
            setScore(state.score)
          }
        })

        state.pipes = state.pipes.filter((p) => p.x + PIPE_WIDTH > 0)

        if (state.bird.y + 20 > canvas.height - GROUND_HEIGHT || state.bird.y < 0) {
          setGameOver(true)
          state.bird.y = Math.max(0, Math.min(state.bird.y, canvas.height - GROUND_HEIGHT - 20))
        }
      }

      // Draw pipes
      state.pipes.forEach((pipe) => {
        ctx.fillStyle = '#228b22'
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight)
        ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, canvas.height - GROUND_HEIGHT - pipe.topHeight - PIPE_GAP)
        ctx.fillStyle = '#2ecc40'
        ctx.fillRect(pipe.x - 4, pipe.topHeight - 20, PIPE_WIDTH + 8, 20)
        ctx.fillRect(pipe.x - 4, pipe.topHeight + PIPE_GAP, PIPE_WIDTH + 8, 20)
      })

      // Draw bird
      const rotation = Math.min(Math.max(state.bird.vy * 0.05, -0.5), 0.5)
      if (!gameOver) {
        drawBird(ctx, state.bird.x, state.bird.y, rotation)
      }

      state.frame++
      animRef.current = requestAnimationFrame(loop)
    }

    animRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('keydown', handleKey)
      canvas.removeEventListener('click', handleClick)
    }
  }, [paused, gameOver, playing, drawBird])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef} width={400} height={500} style={{ border: '2px solid #333', borderRadius: 8, display: 'block' }} />
      <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 14 }}>Score: {score}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setPaused(!paused)} style={badgeStyle}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          {onDone && <button onClick={onDone} style={badgeStyle}>Close</button>}
        </div>
      </div>
      {gameOver && (
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Game Over!</p>
          <p style={{ color: '#fff', fontSize: 16 }}>Score: {score}</p>
          <p style={{ color: '#ccc', fontSize: 13 }}>Click or press Space to restart</p>
        </div>
      )}
      {!playing && !gameOver && (
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: 18, textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Click or press Space to start</p>
        </div>
      )}
    </div>
  )
}

const badgeStyle: React.CSSProperties = { background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12 }
