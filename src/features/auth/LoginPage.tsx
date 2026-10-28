import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithMatric } from '@/services/authService'
import AuthShell from './components/AuthShell'

export default function LoginPage() {
  const navigate = useNavigate()
  const [matricNumber, setMatricNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await loginWithMatric(matricNumber, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Your next step starts here."
      description="Sign in to pick up where you left off with your mentor and your goals."
      footer={<>Lecturer or admin? <Link to="/staff-login">Use staff login <span aria-hidden="true">→</span></Link></>}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="matric-number">Matric number</label>
        <input
          id="matric-number"
          value={matricNumber}
          onChange={(e) => setMatricNumber(e.target.value)}
          placeholder="e.g. BA23110001"
          autoComplete="username"
          required
        />

        <label htmlFor="student-password">Password</label>
        <input
          id="student-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter the password set by admin"
          autoComplete="current-password"
          required
        />

        {error && <p className="auth-form__error" role="alert">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? 'Signing in…' : 'Continue to your space'}</span>
          {!isSubmitting && <span aria-hidden="true">→</span>}
        </button>
      </form>
    </AuthShell>
  )
}
