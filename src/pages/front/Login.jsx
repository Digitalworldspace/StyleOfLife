import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/')
      } else {
        const { error } = await signUp(email, password)
        if (error) throw error
        setInfo('Account created. Check your email to confirm, then sign in.')
        setMode('signin')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="woven-edge-dense w-full mb-6" />
        <Link to="/" className="font-display text-lg text-wine block mb-1">
          Vastra Wholesale
        </Link>
        <h1 className="font-display text-2xl text-ink mb-6">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
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
            minLength={6}
          />

          {error && <p className="text-sm text-wine">{error}</p>}
          {info && <p className="text-sm text-sage">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="focus-ring bg-wine text-ivory py-2.5 rounded-sm font-medium hover:bg-wine-dark transition-colors disabled:opacity-60 mt-1"
          >
            {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError('')
            setInfo('')
          }}
          className="focus-ring text-sm text-ink/60 hover:text-wine mt-4"
        >
          {mode === 'signin' ? "New here? Create an account" : 'Already have an account? Sign in'}
        </button>

        <Link to="/" className="focus-ring block text-sm text-ink/40 hover:text-wine mt-6">
          ← Back to catalog
        </Link>
      </div>
    </div>
  )
}
