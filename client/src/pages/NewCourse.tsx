import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function NewCourse() {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [term, setTerm] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data } = await api.post('/courses', { name, code, term })
    navigate(`/courses/${data._id}`)
  }

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <h2>Add Course</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Course name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} required />
        <input placeholder="Course code (e.g. CS101)" value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle} />
        <input placeholder="Term (e.g. Fall 2026)" value={term} onChange={(e) => setTerm(e.target.value)} style={inputStyle} />
        <button type="submit" style={btnStyle}>Create Course</button>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = { display: 'block', width: '100%', marginBottom: 12, padding: 10, fontSize: 16 }
const btnStyle: React.CSSProperties = { display: 'block', width: '100%', padding: 10, fontSize: 16, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
