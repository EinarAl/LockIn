import { useState } from 'react'
import { useSettings } from '../store/settings'

const DEFAULT_BIRD = [
  '00100',
  '01110',
  '11111',
  '11111',
  '01110',
  '00100',
]

const COLORS = ['#fff', '#eab308', '#f97316', '#000']

export default function Settings() {
  const { language, setLanguage } = useSettings()
  const [birdGrid, setBirdGrid] = useState<string[]>(() => {
    const saved = localStorage.getItem('birdGrid')
    return saved ? JSON.parse(saved) : DEFAULT_BIRD
  })
  const [drawColor, setDrawColor] = useState(1)
  const [activeTab, setActiveTab] = useState<'general' | 'minigames'>('general')

  const toggleCell = (row: number, col: number) => {
    const newGrid = birdGrid.map((r, ri) => {
      if (ri !== row) return r
      const chars = r.split('')
      chars[col] = chars[col] === String(drawColor) ? '0' : String(drawColor)
      return chars.join('')
    })
    setBirdGrid(newGrid)
    localStorage.setItem('birdGrid', JSON.stringify(newGrid))
  }

  return (
    <div>
      <h2>Settings</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setActiveTab('general')} style={activeTab === 'general' ? activeTabStyle : tabStyle}>General</button>
        <button onClick={() => setActiveTab('minigames')} style={activeTab === 'minigames' ? activeTabStyle : tabStyle}>Minigames</button>
      </div>

      {activeTab === 'general' && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <label style={{ display: 'block', marginBottom: 8 }}><strong>Default Programming Language</strong></label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ padding: '8px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #d1d5db' }}>
            {['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin'].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>Used for code generation in quizzes, exams, and interviews.</p>
        </div>
      )}

      {activeTab === 'minigames' && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Bird Model</h3>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>Click cells to edit the pixel art bird model used in Flappy Bird.</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {COLORS.map((c, i) => (
              <button key={i} onClick={() => setDrawColor(i)} style={{
                width: 28, height: 28, borderRadius: 4, border: drawColor === i ? '2px solid #000' : '1px solid #ccc',
                background: c, cursor: 'pointer',
              }} />
            ))}
          </div>

          <div style={{ display: 'inline-block', border: '2px solid #333', borderRadius: 4, marginBottom: 16 }}>
            {birdGrid.map((row, ri) => (
              <div key={ri} style={{ display: 'flex' }}>
                {row.split('').map((cell, ci) => (
                  <div key={ci} onClick={() => toggleCell(ri, ci)} style={{
                    width: 24, height: 24, background: COLORS[Number(cell)] || '#fff',
                    border: '1px solid #ccc', cursor: 'pointer',
                  }} />
                ))}
              </div>
            ))}
          </div>

          <p style={{ fontSize: 13, color: '#888' }}>The bird will appear in game when you play Flappy Bird while waiting for AI responses.</p>
        </div>
      )}
    </div>
  )
}

const tabStyle: React.CSSProperties = { padding: '8px 16px', border: '1px solid #ddd', background: '#f5f5f5', borderRadius: 4, cursor: 'pointer' }
const activeTabStyle: React.CSSProperties = { ...tabStyle, background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }
