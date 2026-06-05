import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Layout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: '#1e293b', color: '#fff' }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: 18 }}>LockIn</Link>
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
