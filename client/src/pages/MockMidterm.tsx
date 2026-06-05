import { useState } from 'react'
import api from '../api'
import Spinner from '../components/Spinner'
import LanguageSelector from '../components/LanguageSelector'

export default function MockMidterm() {
  const [file, setFile] = useState<File | null>(null)
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!file) return
    setLoading(true)
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

  return (
    <div>
      <h2>Mock Midterm Generator</h2>
      <p style={{ color: '#666', fontSize: 14 }}>Upload an example exam (PDF or image). The AI will analyze its style and generate a new exam with different numbers but the same format and difficulty.</p>

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

      {exam && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          {exam.error ? (
            <p style={{ color: 'red' }}>{exam.error}</p>
          ) : (
            exam.questions?.map((q: any, i: number) => (
              <div key={i} style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                <p><strong>Q{i + 1} ({q.type || 'question'}):</strong> {q.prompt}</p>
                {q.options?.map((o: string, j: number) => (
                  <p key={j} style={{ margin: '2px 0 2px 16px', fontSize: 14 }}>{o}</p>
                ))}
                {q.explanation && <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{q.explanation}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

const primaryBtn: React.CSSProperties = { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }
