import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import NewCourse from './pages/NewCourse'
import CourseDetail from './pages/CourseDetail'
import Layout from './components/Layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser)
  const loading = useAuthStore((s) => s.loading)

  useEffect(() => { loadUser() }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/courses/new" element={<ProtectedRoute><Layout><NewCourse /></Layout></ProtectedRoute>} />
      <Route path="/courses/:id" element={<ProtectedRoute><Layout><CourseDetail /></Layout></ProtectedRoute>} />
    </Routes>
  )
}
