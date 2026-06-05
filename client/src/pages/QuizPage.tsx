import { useState } from 'react'
import api from '../api'
import Spinner from '../components/Spinner'
import LanguageSelector from '../components/LanguageSelector'

export default function QuizPage() {
  const [topic, setTopic] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(0)

  const handleGenerate = async () => {
    if (!topic.trim() && !file) return
    setLoading(true)
    setQuiz(null)
    setAnswers({})
    setSubmitted(false)
    try {
      const form = new FormData()
      if (file) form.append('exampleExam', file)
      form.append('topic', topic)
      form.append('type', 'quiz')
      form.append('language', localStorage.getItem('language') || 'Python')
      const { data } = await api.post('/study/quiz/generate', form, {
        headers: file ? { 'Content-Type': 'multipart/form-data' } : {},
      })
      setQuiz(data)
    } catch (err: any) {
      setQuiz({ error: err.response?.data?.error || 'Failed to generate quiz' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (!quiz?.questions) return
    let correct = 0
    quiz.questions.forEach((q: any, i: number) => {
      if (answers[i]?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()) {
        correct++
      }
    })
    setScore(correct)
    setSubmitted(true)
  }

  return (
    <div>
      <h2>Quiz Generator</h2>
      <p style={{ color: '#666', fontSize: 14 }}>Describe a topic or upload class material. The AI will generate a practice quiz to help you study.</p>

      <div style={{ marginBottom: 16, padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}>
        <input placeholder="Topic or description of material" value={topic} onChange={(e) => setTopic(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8, padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #d1d5db' }} />
        <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginBottom: 8, display: 'block' }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <LanguageSelector />
          <span style={{ fontSize: 13, color: '#888' }}>(upload material or describe a topic)</span>
        </div>
        <button onClick={handleGenerate} disabled={loading || (!topic && !file)} style={loading ? { ...primaryBtn, opacity: 0.6 } : primaryBtn}>
          {loading ? <Spinner size={16} /> : 'Generate Quiz'}
        </button>
      </div>

      {quiz && !quiz.error && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <h4>{quiz.title || 'Quiz'}</h4>
          {quiz.questions?.map((q: any, i: number) => (
            <div key={i} style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
              <p><strong>Q{i + 1} ({q.type}):</strong> {q.prompt}</p>
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
          {!submitted && quiz.questions?.length > 0 && (
            <button onClick={handleSubmit} style={primaryBtn}>Submit Answers</button>
          )}
          {submitted && (
            <p><strong>Score: {score}/{quiz.questions?.length}</strong></p>
          )}
        </div>
      )}
      {quiz?.error && <p style={{ color: 'red' }}>{quiz.error}</p>}
    </div>
  )
}

const primaryBtn: React.CSSProperties = { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }
