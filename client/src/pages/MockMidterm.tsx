import { useState } from 'react'
import api from '../api'
import Spinner from '../components/Spinner'
import LanguageSelector from '../components/LanguageSelector'

export default function MockMidterm() {
  const [file, setFile] = useState<File | null>(null)
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const handleGenerate = async () => {
    if (!file) return
    setLoading(true)
    setExam(null)
    setAnswers({})
    setSubmitted(false)
    try {
      const form = new FormData()
      form.append('exampleExam', file)
      form.append('language', localStorage.getItem('language') || 'Python')
      const { data } = await api.post('/ai/generate-exam', form)
      setExam(data)
    } catch (err: any) {
      setExam({ error: err.response?.data?.error || 'Failed to generate exam' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (!exam?.questions) return
    let correct = 0
    exam.questions.forEach((q: any, i: number) => {
      if (answers[i]?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()) {
        correct++
      }
    })
    setScore(correct)
    setSubmitted(true)
  }

  return (
    <div>
      <h2>Mock Midterm Generator</h2>
      <p style={{ color: '#666', fontSize: 14 }}>Upload an example exam (PDF or image). The AI will analyze its style and generate a new exam with different numbers but the same format, topics, and difficulty.</p>

      <div style={{ marginBottom: 16, padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LanguageSelector />
          <span style={{ fontSize: 13, color: '#888' }}>(language for code problems)</span>
        </div>
        <button onClick={handleGenerate} disabled={!file || loading} style={{ marginTop: 8, ...(loading ? { ...primaryBtn, opacity: 0.6 } : primaryBtn) }}>
          {loading ? <Spinner size={16} /> : 'Generate Mock Midterm'}
        </button>
      </div>

      {exam && !exam.error && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          {exam.instructions && <p style={{ fontStyle: 'italic', marginBottom: 12 }}>{exam.instructions}</p>}
          {exam.equationSheet && (
            <div style={{ background: '#f0f9ff', padding: 8, borderRadius: 4, marginBottom: 12 }}>
              <strong>Equation Sheet:</strong> {exam.equationSheet}
            </div>
          )}
          {exam.questions?.map((q: any, i: number) => (
            <div key={i} style={{ marginBottom: 16, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
              <p><strong>Q{i + 1} ({q.type}):</strong> {q.prompt}</p>
              {q.diagrams && <p style={{ color: '#888', fontSize: 13, fontStyle: 'italic' }}>Diagram: {q.diagrams}</p>}
              {q.options?.map((o: string, j: number) => {
                const sel = answers[i] === o
                const correct = submitted && o.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
                const wrong = submitted && sel && !correct
                return (
                  <div
                    key={j}
                    onClick={() => { if (!submitted) setAnswers(prev => ({ ...prev, [i]: o })) }}
                    style={{
                      padding: '6px 10px', margin: '2px 0', borderRadius: 4,
                      cursor: submitted ? 'default' : 'pointer',
                      background: correct ? '#dcfce7' : wrong ? '#fce7e7' : sel ? '#dbeafe' : '#fff',
                      border: '1px solid #e2e8f0', fontSize: 14,
                    }}
                  >{o}</div>
                )
              })}
              {q.type === 'short-answer' && (
                <textarea
                  placeholder="Your answer..."
                  value={answers[i] || ''}
                  onChange={(e) => { if (!submitted) setAnswers(prev => ({ ...prev, [i]: e.target.value })) }}
                  style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 4, border: '1px solid #d1d5db', marginTop: 4, fontFamily: 'inherit' }}
                  rows={2}
                  disabled={submitted}
                />
              )}
              {submitted && (
                <p style={{ fontSize: 13, marginTop: 4, color: (answers[i] || '').toLowerCase().trim() === q.correctAnswer.toLowerCase().trim() ? '#16a34a' : '#dc2626' }}>
                  {(answers[i] || '').toLowerCase().trim() === q.correctAnswer.toLowerCase().trim() ? 'Correct' : `Incorrect. Answer: ${q.correctAnswer}`}
                  {q.explanation && <span style={{ color: '#666' }}> - {q.explanation}</span>}
                </p>
              )}
            </div>
          ))}
          {!submitted && exam.questions?.length > 0 && (
            <button onClick={handleSubmit} style={primaryBtn}>Submit Exam</button>
          )}
          {submitted && (
            <p><strong>Score: {score}/{exam.questions?.length}</strong></p>
          )}
        </div>
      )}
      {exam?.error && <p style={{ color: 'red' }}>{exam.error}</p>}
    </div>
  )
}

const primaryBtn: React.CSSProperties = { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }
