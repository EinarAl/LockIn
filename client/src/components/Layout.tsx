import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/ai-chat', label: 'AI Tutor' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/mock-midterm', label: 'Mock Midterm' },
  { to: '/mock-interviews', label: 'Interviews' },
  { to: '/settings', label: 'Settings' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()

  return (
    <div>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: '#1e293b', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: 18 }}>LockIn</Link>
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} style={{
              color: location.pathname === l.to ? '#93c5fd' : '#cbd5e1',
              textDecoration: 'none',
              fontSize: 14,
            }}>{l.label}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14 }}>{user?.name}</span>
          <button onClick={logout} style={{ padding: '4px 12px', background: 'transparent', color: '#fff', border: '1px solid #fff', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Logout</button>
        </div>
      </nav>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        {children}
      </main>
    </div>
  )
}
