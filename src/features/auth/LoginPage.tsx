import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithMatric } from '@/services/authService'

export default function LoginPage() {
  const navigate = useNavigate()
  const [matricNumber, setMatricNumber] = useState('')
  const [icNumber, setIcNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await loginWithMatric(matricNumber, icNumber)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ums-gray-light px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
      >
        <h1 className="mb-1 text-xl font-semibold text-ums-blue">PPST Mentor-Mentee</h1>
        <p className="mb-6 text-sm text-gray-500">Universiti Malaysia Sabah</p>

        <label className="mb-1 block text-sm font-medium text-gray-700">Matric Number</label>
        <input
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-ums-blue focus:outline-none"
          value={matricNumber}
          onChange={(e) => setMatricNumber(e.target.value)}
          required
        />

        <label className="mb-1 block text-sm font-medium text-gray-700">IC Number</label>
        <input
          type="password"
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-ums-blue focus:outline-none"
          value={icNumber}
          onChange={(e) => setIcNumber(e.target.value)}
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
      </form>
    </div>
  )
}
