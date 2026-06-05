import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import Calendar from '../components/Calendar'
import Spinner from '../components/Spinner'
import LanguageSelector from '../components/LanguageSelector'

interface Course { _id: string; name: string; code: string; term: string; events: any[]; gradeCategories: any[]; rawSyllabusText: string }

export default function CourseDetail() {
  const { id } = useParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [targetGrade, setTargetGrade] = useState('')
  const [whatIf, setWhatIf] = useState<any>(null)
  const [quizTopic, setQuizTopic] = useState('')
  const [quizFile, setQuizFile] = useState<File | null>(null)
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null)
  const [tab, setTab] = useState<'events' | 'grades' | 'quiz'>('events')
  const [parsing, setParsing] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [whatIfLoading, setWhatIfLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizScore, setQuizScore] = useState(0)

  const load = () => { if (id) api.get(`/courses/${id}`).then(({ data }) => setCourse(data)) }
  useEffect(() => { load() }, [id])

  const handleUploadSyllabus = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    const form = new FormData()
    form.append('file', file)
    await api.post(`/courses/${id}/upload-syllabus`, form)
    load()
  }

  const handleParseSyllabus = async () => {
    if (!id) return
    setParsing(true)
    try {
      await api.post(`/courses/${id}/parse-syllabus`)
      load()
    } finally {
      setParsing(false)
    }
  }

  const loadAnalysis = async () => {
    if (!id) return
    setAnalyzing(true)
    try {
      const { data } = await api.get(`/grades/${id}/analysis`)
      setAnalysis(data)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleWhatIf = async () => {
    if (!id) return
    setWhatIfLoading(true)
    try {
      const { data } = await api.post(`/grades/${id}/what-if`, { targetGrade: Number(targetGrade) })
      setWhatIf(data)
    } finally {
      setWhatIfLoading(false)
    }
  }

  const handleGenerateQuiz = async () => {
    if (!id) return
    setGenerating(true)
    setQuizSubmitted(false)
    setQuizAnswers({})
    try {
      const language = localStorage.getItem('language') || 'Python'
      const form = new FormData()
      if (quizFile) form.append('exampleExam', quizFile)
      form.append('topic', quizTopic)
      form.append('courseId', id)
      form.append('language', language)
      const { data } = await api.post('/study/quiz/generate', form, {
        headers: quizFile ? { 'Content-Type': 'multipart/form-data' } : {},
      })
      setGeneratedQuiz(data)
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmitQuiz = () => {
    if (!generatedQuiz) return
    let correct = 0
    generatedQuiz.questions.forEach((q: any, i: number) => {
      if (quizAnswers[i]?.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()) {
        correct++
      }
    })
    setQuizScore(correct)
    setQuizSubmitted(true)
  }

  if (!course) return <p>Loading...</p>

  return (
    <div>
      <Link to="/" style={{ color: '#3b82f6' }}>&larr; Back to courses</Link>
      <h2>{course.name} {course.code && `(${course.code})`}</h2>
      {course.term && <p style={{ color: '#666' }}>{course.term}</p>}

      <div style={{ marginBottom: 20 }}>
        <h3>Syllabus</h3>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleUploadSyllabus} />
        {course.rawSyllabusText && (
          <button onClick={handleParseSyllabus} disabled={parsing} style={{ marginLeft: 8, ...(parsing ? { ...smBtn, opacity: 0.6 } : smBtn) }}>
            {parsing ? <Spinner size={14} /> : 'Parse with AI'}
          </button>
        )}
        {course.events.length === 0 && course.gradeCategories.length === 0 && (
          <p style={{ fontSize: 14, color: '#888' }}>Upload a syllabus PDF or image, then click parse.</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('events')} style={tab === 'events' ? activeTab : tabStyle}>Calendar</button>
        <button onClick={() => setTab('grades')} style={tab === 'grades' ? activeTab : tabStyle}>Grades</button>
        <button onClick={() => setTab('quiz')} style={tab === 'quiz' ? activeTab : tabStyle}>Quiz</button>
      </div>

      {tab === 'events' && (
        <div>
          <Calendar events={course.events} courseId={course._id} onEventChange={load} />
        </div>
      )}

      {tab === 'grades' && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <button onClick={loadAnalysis} disabled={analyzing} style={analyzing ? { ...smBtn, opacity: 0.6 } : smBtn}>
              {analyzing ? <Spinner size={14} /> : 'Calculate Current Grade'}
            </button>
          </div>
          {analysis && (
            <div style={{ marginBottom: 16 }}>
              <p><strong>Current Grade:</strong> {analysis.currentGrade !== null ? `${analysis.currentGrade}%` : 'N/A'}</p>
              {analysis.categoryBreakdown?.map((b: any, i: number) => (
                <div key={i} style={eventCard}>
                  {b.category} ({b.weight}%): {b.percentage}% ({b.earned}/{b.max})
                </div>
              ))}
            </div>
          )}

          <h3>What If</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input placeholder="Target grade %" value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)} style={{ padding: 8, fontSize: 14, width: 150 }} />
            <button onClick={handleWhatIf} disabled={whatIfLoading} style={whatIfLoading ? { ...smBtn, opacity: 0.6 } : smBtn}>
              {whatIfLoading ? <Spinner size={14} /> : 'Calculate'}
            </button>
          </div>
          {whatIf && (
            <p>Need {whatIf.neededOnRemaining !== null ? `${whatIf.neededOnRemaining}%` : 'N/A'} on remaining {whatIf.remainingWeight}% to reach {whatIf.targetGrade}%</p>
          )}
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: 13, color: '#888' }}>Add grades via the API or parse a syllabus to define grade categories.</p>
          </div>
        </div>
      )}

      {tab === 'quiz' && (
        <div>
          <h3>Generate Quiz</h3>
          <div style={{ marginBottom: 16, padding: 16, background: '#fff', border: '1px solid #ddd', borderRadius: 8 }}>
            <input placeholder="Topic or description of material" value={quizTopic} onChange={(e) => setQuizTopic(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: 8, padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #d1d5db' }} />
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setQuizFile(e.target.files?.[0] || null)} style={{ marginBottom: 8, display: 'block' }} />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <LanguageSelector />
              <span style={{ fontSize: 13, color: '#888' }}>(upload material or describe a topic)</span>
            </div>
            <button onClick={handleGenerateQuiz} disabled={generating} style={generating ? { ...primaryBtn, opacity: 0.6 } : primaryBtn}>
              {generating ? <Spinner size={16} /> : 'Generate Quiz'}
            </button>
          </div>

          {generatedQuiz && (
            <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
              <h4>{generatedQuiz.title || 'Quiz'}</h4>
              {generatedQuiz.questions?.map((q: any, i: number) => (
                <div key={i} style={{ marginBottom: 12, padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                  <p><strong>Q{i + 1} ({q.type}):</strong> {q.prompt}</p>
                  {q.options?.map((o: string, j: number) => {
                    const isSelected = quizAnswers[i] === o
                    const isCorrect = o.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
                    let bg = '#fff'
                    if (quizSubmitted) {
                      if (isCorrect) bg = '#dcfce7'
                      else if (isSelected) bg = '#fce7e7'
                    } else if (isSelected) bg = '#dbeafe'
                    return (
                      <div
                        key={j}
                        onClick={() => {
                          if (!quizSubmitted) setQuizAnswers(prev => ({ ...prev, [i]: o }))
                        }}
                        style={{ padding: '6px 10px', margin: '2px 0', borderRadius: 4, cursor: quizSubmitted ? 'default' : 'pointer', background: bg, border: '1px solid #e2e8f0', fontSize: 14 }}
                      >{o}</div>
                    )
                  })}
                  {q.type === 'short-answer' && (
                    <textarea
                      placeholder="Your answer..."
                      value={quizAnswers[i] || ''}
                      onChange={(e) => { if (!quizSubmitted) setQuizAnswers(prev => ({ ...prev, [i]: e.target.value })) }}
                      style={{ width: '100%', padding: 8, fontSize: 13, borderRadius: 4, border: '1px solid #d1d5db', marginTop: 4, fontFamily: 'inherit' }}
                      rows={2}
                      disabled={quizSubmitted}
                    />
                  )}
                  {quizSubmitted && (
                    <p style={{ fontSize: 13, marginTop: 6, color: q.correctAnswer.toLowerCase().trim() === (quizAnswers[i] || '').toLowerCase().trim() ? '#16a34a' : '#dc2626' }}>
                      {q.correctAnswer.toLowerCase().trim() === (quizAnswers[i] || '').toLowerCase().trim() ? 'Correct!' : `Incorrect. Answer: ${q.correctAnswer}`}
                      {q.explanation && <span style={{ color: '#666' }}> - {q.explanation}</span>}
                    </p>
                  )}
                </div>
              ))}
              {!quizSubmitted && (
                <button onClick={handleSubmitQuiz} style={primaryBtn}>Submit Answers</button>
              )}
              {quizSubmitted && (
                <p><strong>Score: {quizScore}/{generatedQuiz.questions?.length}</strong></p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const eventCard: React.CSSProperties = { border: '1px solid #eee', borderRadius: 6, padding: 12, marginBottom: 8, background: '#fafafa' }
const smBtn: React.CSSProperties = { padding: '6px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }
const primaryBtn: React.CSSProperties = { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 8 }
const tabStyle: React.CSSProperties = { padding: '8px 16px', border: '1px solid #ddd', background: '#f5f5f5', borderRadius: 4, cursor: 'pointer' }
const activeTab: React.CSSProperties = { ...tabStyle, background: '#3b82f6', color: '#fff', borderColor: '#3b82f6' }
