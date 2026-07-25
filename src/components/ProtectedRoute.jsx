import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <p className="text-ink/50 font-display">Loading…</p>
      </div>
    )
  }

  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
