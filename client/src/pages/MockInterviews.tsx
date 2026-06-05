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
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)

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
    setSelected(null)
    setAnswer('')
    setEvaluation(null)
    setShowHint(false)
    setShowSolution(false)
    const { data } = await api.post('/ai/interview-challenge', {
      title: challenge.title,
      language: localStorage.getItem('language') || 'Python',
      position: position || undefined,
      topic: topic || undefined,
    })
    setSelected({ ...data, leetcodeSlug: challenge.leetcodeSlug })
  }

  const handleEvaluate = async () => {
    if (!selected || !answer.trim()) return
    setShowSolution(false)
    const { data } = await api.post('/ai/evaluate-answer', {
      problemTitle: selected.title,
      problemDescription: selected.description,
      userAnswer: answer,
      language: localStorage.getItem('language') || 'Python',
    })
    setEvaluation(data)
  }

  const leetcodeUrl = (slug: string) => slug ? `https://leetcode.com/problems/${slug}/` : null
  const leetcodeSearchUrl = (title: string) => `https://leetcode.com/search/?q=${encodeURIComponent(title)}`

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleGenerate} disabled={loading || (!position && !topic)} style={loading ? { ...primaryBtn, opacity: 0.6 } : primaryBtn}>
            {loading ? <Spinner size={16} /> : 'Generate Challenges'}
          </button>
        </div>
      </div>

      {challenges.length > 0 && !selected && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {challenges.map((c, i) => (
              <div key={i} onClick={() => handleOpen(c)} style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16, cursor: 'pointer' }}>
                <h4 style={{ margin: 0 }}>{c.title}</h4>
                <p style={{ fontSize: 13, color: '#666' }}>Difficulty: {c.difficulty}</p>
                <p style={{ fontSize: 13, color: '#888' }}>{c.topics?.join(', ')}</p>
                {c.leetcodeSlug && (
                  <a href={leetcodeUrl(c.leetcodeSlug)!} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, color: '#3b82f6' }}>Open on LeetCode &rarr;</a>
                )}
              </div>
            ))}
          </div>
          <button onClick={handleGenerate} disabled={loading} style={refreshBtn}>
            {loading ? <Spinner size={14} /> : 'Refresh Questions'}
          </button>
        </>
      )}

      {selected && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <button onClick={() => { setSelected(null); setEvaluation(null) }} style={smBtn}>&larr; Back</button>
            <div style={{ display: 'flex', gap: 4 }}>
              {selected.leetcodeSlug && (
                <a href={leetcodeUrl(selected.leetcodeSlug)!} target="_blank" rel="noopener noreferrer" style={smBtn}>Open on LeetCode</a>
              )}
              {!selected.leetcodeSlug && (
                <a href={leetcodeSearchUrl(selected.title)} target="_blank" rel="noopener noreferrer" style={smBtn}>Search LeetCode</a>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>{selected.title}</h3>
            <span style={{
              fontSize: 12, padding: '2px 8px', borderRadius: 4,
              background: selected.difficulty === 'Easy' ? '#dcfce7' : selected.difficulty === 'Medium' ? '#fef9c3' : '#fce7e7',
              color: selected.difficulty === 'Easy' ? '#16a34a' : selected.difficulty === 'Medium' ? '#ca8a04' : '#dc2626',
            }}>{selected.difficulty}</span>
          </div>

          {selected.topics && <p style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Topics: {selected.topics.join(', ')}</p>}

          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selected.description}</p>

          {selected.examples?.map((ex: any, i: number) => (
            <div key={i} style={{ background: '#f8fafc', padding: 12, borderRadius: 6, margin: '8px 0', fontFamily: 'monospace', fontSize: 13 }}>
              <strong>Example {i + 1}:</strong>
              <p style={{ margin: '4px 0' }}>{ex.input}</p>
              <p style={{ margin: '4px 0' }}>{ex.output}</p>
              {ex.explanation && <p style={{ margin: '4px 0', color: '#666', fontFamily: 'sans-serif' }}>{ex.explanation}</p>}
            </div>
          ))}

          {selected.constraints?.length > 0 && (
            <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, margin: '8px 0' }}>
              <strong>Constraints:</strong>
              {selected.constraints.map((c: string, i: number) => <li key={i} style={{ fontSize: 13 }}>{c}</li>)}
            </div>
          )}

          {selected.followUp && (
            <p style={{ color: '#888', fontSize: 13, fontStyle: 'italic', margin: '8px 0' }}>Follow-up: {selected.followUp}</p>
          )}

          {selected.starterCode && (
            <div>
              <strong>Starter Code:</strong>
              <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 12, borderRadius: 6, overflow: 'auto', margin: '8px 0', fontSize: 13 }}>{selected.starterCode}</pre>
            </div>
          )}

          {selected.timeComplexity && (
            <p style={{ fontSize: 13, color: '#888' }}>Expected: {selected.timeComplexity} time, {selected.spaceComplexity} space</p>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <strong>Your Solution ({localStorage.getItem('language') || 'Python'}):</strong>
              {selected.hint && !showHint && (
                <button onClick={() => setShowHint(true)} style={hintBtn}>Show Hint</button>
              )}
            </div>
            {showHint && selected.hint && (
              <div style={{ background: '#fef9c3', padding: 8, borderRadius: 4, marginBottom: 8, fontSize: 13 }}>Hint: {selected.hint}</div>
            )}
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={10} style={{ width: '100%', padding: 10, fontSize: 13, borderRadius: 6, border: '1px solid #d1d5db', fontFamily: 'monospace' }} placeholder="Write your solution here..." />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={handleEvaluate} disabled={!answer.trim()} style={primaryBtn}>Submit for Evaluation</button>
              {!showSolution && (
                <button onClick={() => setShowSolution(true)} style={hintBtn}>Show Solution</button>
              )}
            </div>

            {showSolution && selected.solution && (
              <div style={{ marginTop: 8 }}>
                <strong>Solution:</strong>
                <pre style={{ background: '#f0fdf4', padding: 12, borderRadius: 6, overflow: 'auto', margin: '4px 0', fontSize: 13, border: '1px solid #bbf7d0' }}>{selected.solution}</pre>
              </div>
            )}

            {evaluation && (
              <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <strong>Score: {evaluation.score}/100</strong>
                  <span style={{
                    fontSize: 12, padding: '2px 8px', borderRadius: 4,
                    background: evaluation.score >= 80 ? '#dcfce7' : evaluation.score >= 50 ? '#fef9c3' : '#fce7e7',
                    color: evaluation.score >= 80 ? '#16a34a' : evaluation.score >= 50 ? '#ca8a04' : '#dc2626',
                  }}>{evaluation.score >= 80 ? 'Pass' : evaluation.score >= 50 ? 'Needs Work' : 'Needs Improvement'}</span>
                </div>
                <p style={{ fontSize: 14 }}><strong>Feedback:</strong> {evaluation.feedback}</p>
                {evaluation.suggestions?.map((s: string, i: number) => (
                  <li key={i} style={{ fontSize: 13, color: '#666' }}>{s}</li>
                ))}
                {evaluation.timeComplexity && <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Your solution: {evaluation.timeComplexity} time, {evaluation.spaceComplexity} space</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = { display: 'block', width: '100%', marginBottom: 8, padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #d1d5db' }
const primaryBtn: React.CSSProperties = { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }
const smBtn: React.CSSProperties = { padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, textDecoration: 'none' }
const hintBtn: React.CSSProperties = { padding: '6px 14px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }
const refreshBtn: React.CSSProperties = { padding: '8px 16px', background: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: 6, cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }
