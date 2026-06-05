import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

interface Course { _id: string; name: string; code: string; term: string; events: any[]; gradeCategories: any[] }

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    api.get('/courses').then(({ data }) => setCourses(data))
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>My Courses</h2>
        <Link to="/courses/new" style={btnStyle}>+ Add Course</Link>
      </div>

      {courses.length === 0 && <p>No courses yet. Add one to get started.</p>}

      <div style={{ display: 'grid', gap: 16 }}>
        {courses.map((c) => (
          <Link key={c._id} to={`/courses/${c._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={cardStyle}>
              <h3 style={{ margin: 0 }}>{c.name}</h3>
              <p style={{ margin: '4px 0', color: '#666' }}>{c.code} &middot; {c.term}</p>
              <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
                {c.events.length} events &middot; {c.gradeCategories.length} grade categories
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 8, padding: 16, background: '#fff' }
const btnStyle: React.CSSProperties = { display: 'inline-block', padding: '8px 16', background: '#3b82f6', color: '#fff', textDecoration: 'none', borderRadius: 6, fontSize: 14 }
