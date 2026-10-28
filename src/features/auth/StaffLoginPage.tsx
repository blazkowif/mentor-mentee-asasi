import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithEmail } from '@/services/authService'
import AuthShell from './components/AuthShell'

export default function StaffLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await loginWithEmail(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Staff access"
      title="Keep your people moving forward."
      description="Access your mentoring workspace, updates, and student support tools."
      footer={<>Student account? <Link to="/login">Use student login <span aria-hidden="true">→</span></Link></>}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="staff-email">Work email</label>
        <input
          id="staff-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@ums.edu.my"
          autoComplete="username"
          required
        />

        <label htmlFor="staff-password">Password</label>
        <input
          id="staff-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />

        {error && <p className="auth-form__error" role="alert">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? 'Signing in…' : 'Enter staff workspace'}</span>
          {!isSubmitting && <span aria-hidden="true">→</span>}
        </button>
      </form>
    </AuthShell>
  )
}