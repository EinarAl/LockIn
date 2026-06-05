import { useState, useRef } from 'react'
import api from '../api'
import Spinner from '../components/Spinner'
import LanguageSelector from '../components/LanguageSelector'

export default function AIChat() {
  const [prompt, setPrompt] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() && !image) return
    setLoading(true)
    setResult(null)

    try {
      const form = new FormData()
      if (image) form.append('image', image)
      form.append('prompt', prompt)
      form.append('language', localStorage.getItem('language') || 'Python')
      const { data } = await api.post('/ai/solve', form)
      setResult(data)
    } catch (err: any) {
      setResult({ error: err.response?.data?.error || 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>AI Tutor</h2>
      <p style={{ color: '#666', fontSize: 14 }}>Upload a problem image, describe it, or both. The AI will solve it step by step.</p>

      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <textarea
          placeholder="Describe your problem here..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          style={{ width: '100%', padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #d1d5db', marginBottom: 8, fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <button type="button" onClick={() => fileRef.current?.click()} style={smBtn}>
            {image ? image.name : 'Upload Image'}
          </button>
          <LanguageSelector />
          <span style={{ fontSize: 13, color: '#888' }}>(language for code)</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" hidden onChange={(e) => setImage(e.target.files?.[0] || null)} />
        <button type="submit" disabled={loading} style={loading ? { ...primaryBtn, opacity: 0.6 } : primaryBtn}>
          {loading ? <Spinner size={16} /> : 'Solve'}
        </button>
      </form>

      {result && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          {result.error ? (
            <p style={{ color: 'red' }}>{result.error}</p>
          ) : (
            <>
              <p><strong>Answer:</strong> {result.answer}</p>
              {result.steps?.map((s: any, i: number) => (
                <div key={i} style={{ marginTop: 8, padding: 8, background: '#f8fafc', borderRadius: 4 }}>
                  <strong>Step {i + 1}: {s.title}</strong>
                  <p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{s.content}</p>
                  {s.code && <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: 8, borderRadius: 4, overflow: 'auto' }}>{s.code}</pre>}
                </div>
              ))}
              {result.confidence && <p style={{ marginTop: 8, color: '#888', fontSize: 13 }}>Confidence: {result.confidence}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

const smBtn: React.CSSProperties = { padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }
const primaryBtn: React.CSSProperties = { ...smBtn, padding: '10px 20px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }
