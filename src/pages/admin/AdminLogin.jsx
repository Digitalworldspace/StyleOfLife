import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function AdminLogin() {
  const { signIn, session, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (session && isAdmin) {
    navigate('/admin')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { error, data } = await signIn(email, password)
      if (error) throw error
      // isAdmin check happens async in AuthContext; give it a moment then redirect
      navigate('/admin')
    } catch (err) {
      setError(err.message || 'Sign in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-ivory rounded-sm overflow-hidden">
        <div className="woven-edge-dense w-full" />
        <div className="p-8">
          <h1 className="font-display text-2xl text-ink mb-1">Admin Panel</h1>
          <p className="text-sm text-ink/50 mb-6">Vastra Wholesale</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus-ring border border-gold-light/60 bg-white rounded-sm px-3 py-2.5 text-sm"
              required
            />
            {error && <p className="text-sm text-wine">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="focus-ring bg-wine text-ivory py-2.5 rounded-sm font-medium hover:bg-wine-dark transition-colors disabled:opacity-60 mt-1"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
