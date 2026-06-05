import { useState } from 'react'
import api from '../api'
import Spinner from '../components/Spinner'
import LanguageSelector from '../components/LanguageSelector'

export default function MockInterviews() {
  const [position, setPosition] = useState('')
  const [topic, setTopic] = useState('')
  const [challenges, setChallenges] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<any>(null)

  const handleGenerate = async () => {
    if (!position.trim() && !topic.trim()) return
    setLoading(true)
    setChallenges([])
    setSelected(null)
    setEvaluation(null)
    try {
      const { data } = await api.post('/ai/interview-challenges', {
        position: position || undefined,
        topic: topic || undefined,
        language: localStorage.getItem('language') || 'Python',
      })
      setChallenges(data.challenges || [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = async (challenge: any) => {
    setSelected(challenge)
    setAnswer('')
    setEvaluation(null)
    const { data } = await api.post('/ai/interview-challenge', {
      title: challenge.title,
      language: localStorage.getItem('language') || 'Python',
      position: position || undefined,
      topic: topic || undefined,
    })
    setSelected(data)
  }

  const handleEvaluate = async () => {
    if (!selected || !answer.trim()) return
    const { data } = await api.post('/ai/evaluate-answer', {
      problemTitle: selected.title,
      problemDescription: selected.description,
      userAnswer: answer,
      language: localStorage.getItem('language') || 'Python',
    })
    setEvaluation(data)
  }

  return (
    <div>
      <h2>Mock Interviews</h2>
      <p style={{ color: '#666', fontSize: 14 }}>Practice technical interviews with LeetCode-style problems.</p>

      <div style={{ marginBottom: 16, padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}>
        <input placeholder="Position (e.g. Software Engineer)" value={position} onChange={(e) => setPosition(e.target.value)} style={inputStyle} />
        <input placeholder="Topic (optional, e.g. Dynamic Programming)" value={topic} onChange={(e) => setTopic(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <LanguageSelector />
        </div>
        <button onClick={handleGenerate} disabled={loading || (!position && !topic)} style={loading ? { ...primaryBtn, opacity: 0.6 } : primaryBtn}>
          {loading ? <Spinner size={16} /> : 'Generate Challenges'}
        </button>
      </div>

      {challenges.length > 0 && !selected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {challenges.map((c, i) => (
            <div key={i} onClick={() => handleOpen(c)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16, cursor: 'pointer' }}>
              <h4 style={{ margin: 0 }}>{c.title}</h4>
              <p style={{ fontSize: 13, color: '#666' }}>Difficulty: {c.difficulty}</p>
              <p style={{ fontSize: 13, color: '#888' }}>{c.topics?.join(', ')}</p>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <button onClick={() => { setSelected(null); setEvaluation(null) }} style={{ marginBottom: 12, ...smBtn }}>&larr; Back to challenges</button>
          <h3>{selected.title}</h3>
          <p style={{ color: '#666', fontSize: 13 }}>Difficulty: {selected.difficulty} | Time: {selected.timeComplexity} | Space: {selected.spaceComplexity}</p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{selected.description}</p>

          {selected.constraints && (
            <div style={{ background: '#f8fafc', padding: 8, borderRadius: 4, margin: '8px 0' }}>
              <strong>Constraints:</strong>
              {selected.constraints.map((c: string, i: number) => <li key={i}>{c}</li>)}
            </div>
          )}

          {selected.examples?.map((ex: any, i: number) => (
            <div key={i} style={{ background: '#f0fdf4', padding: 8, borderRadius: 4, margin: '4px 0' }}>
              <strong>Example {i + 1}:</strong> Input: {ex.input} &rarr; Output: {ex.output}
            </div>
          ))}

          {selected.starterCode && (
            <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 12, borderRadius: 4, overflow: 'auto', margin: '8px 0' }}>{selected.starterCode}</pre>
          )}

          <h4>Your Solution</h4>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={8} style={{ width: '100%', padding: 10, fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db', fontFamily: 'monospace' }} />
          <button onClick={handleEvaluate} disabled={!answer.trim()} style={{ marginTop: 8, ...smBtn }}>Evaluate</button>

          {evaluation && (
            <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
              <p><strong>Score:</strong> {evaluation.score}/100</p>
              <p><strong>Feedback:</strong> {evaluation.feedback}</p>
              {evaluation.suggestions?.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = { display: 'block', width: '100%', marginBottom: 8, padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #d1d5db' }
const primaryBtn: React.CSSProperties = { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }
const smBtn: React.CSSProperties = { padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }
