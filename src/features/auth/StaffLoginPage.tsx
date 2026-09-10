import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginWithEmail } from '@/services/authService'

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
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10"
      style={{
        backgroundImage: "url('/login-background.jpg')",
        backgroundColor: '#000',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'contain',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at 8% 14%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 18% 78%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 31% 10%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 46% 88%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 68% 12%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 83% 72%, #fff 0 1px, transparent 1.5px), radial-gradient(circle at 94% 28%, #fff 0 1px, transparent 1.5px)',
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
      >
        <h1 className="mb-1 text-xl font-semibold text-ums-blue">Staff Sign In</h1>
        <p className="mb-6 text-sm text-gray-500">For Lecturer and Admin accounts</p>

        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input
          type="email"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-ums-blue focus:outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
        <input
          type="password"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-ums-blue focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-ums-blue py-2 text-sm font-medium text-white hover:bg-ums-blue-light disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Student account?{' '}
          <Link className="font-medium text-ums-blue hover:underline" to="/login">
            Use student login
          </Link>
        </p>
      </form>
    </div>
  )
}