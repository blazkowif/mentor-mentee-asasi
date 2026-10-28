import { CSSProperties, FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loginWithEmail, loginWithMatric } from '@/services/authService'
import ppstLogo from '@/assets/logo-ppst-hd.png'

type Role = 'student' | 'staff'

function BackgroundIcons() {
  return (
    <div className="auth-icons" aria-hidden="true">
      <svg className="auth-icon auth-icon--flask" viewBox="0 0 64 64"><path d="M25 8h14M29 8v19L16 49a6 6 0 0 0 5 9h22a6 6 0 0 0 5-9L35 27V8M20 45h24M24 37h16" /></svg>
      <svg className="auth-icon auth-icon--atom" viewBox="0 0 64 64"><ellipse cx="32" cy="32" rx="25" ry="10" /><ellipse cx="32" cy="32" rx="25" ry="10" transform="rotate(60 32 32)" /><ellipse cx="32" cy="32" rx="25" ry="10" transform="rotate(120 32 32)" /><circle cx="32" cy="32" r="3" /></svg>
      <svg className="auth-icon auth-icon--gear" viewBox="0 0 64 64"><path d="m27 6 10 0 2 8a20 20 0 0 1 5 3l8-2 5 9-6 6a20 20 0 0 1 0 6l6 6-5 9-8-2a20 20 0 0 1-5 3l-2 8H27l-2-8a20 20 0 0 1-5-3l-8 2-5-9 6-6a20 20 0 0 1 0-6l-6-6 5-9 8 2a20 20 0 0 1 5-3l2-8Z" /><circle cx="32" cy="33" r="7" /></svg>
      <svg className="auth-icon auth-icon--chart" viewBox="0 0 64 64"><path d="M10 53V11M10 53h45M18 44l10-13 8 6 15-22" /><path d="m45 15 6-1-1 6" /></svg>
      <svg className="auth-icon auth-icon--clipboard" viewBox="0 0 64 64"><rect x="14" y="12" width="36" height="45" rx="4" /><path d="M24 12V8h16v4M23 27h18M23 37h14M23 47h9" /></svg>
      <svg className="auth-icon auth-icon--calendar" viewBox="0 0 64 64"><rect x="10" y="13" width="44" height="42" rx="5" /><path d="M10 24h44M21 8v10M43 8v10M20 34h1M31 34h1M42 34h1M20 44h1M31 44h1" /></svg>
    </div>
  )
}

function ArrowIcon() {
  return <span className="auth-arrow" aria-hidden="true">→</span>
}

export default function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>(location.pathname === '/staff-login' ? 'staff' : 'student')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  useEffect(() => {
    document.documentElement.classList.add('auth-lock')
    document.body.classList.add('auth-lock')
    return () => {
      document.documentElement.classList.remove('auth-lock')
      document.body.classList.remove('auth-lock')
    }
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    function handlePointerMove(event: PointerEvent) {
      if (frame) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        setParallax({
          x: ((event.clientX / window.innerWidth) - 0.5) * 24,
          y: ((event.clientY / window.innerHeight) - 0.5) * 24,
        })
      })
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  function switchRole(nextRole: Role) {
    if (nextRole === role) return
    setRole(nextRole)
    setError(null)
    setIdentifier('')
    setPassword('')
    setShowPassword(false)
    window.history.replaceState(
      {},
      '',
      nextRole === 'staff' ? '/staff-login' : '/login',
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      if (role === 'student') {
        await loginWithMatric(identifier, password)
      } else {
        await loginWithEmail(identifier, password)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isStudent = role === 'student'

  return (
    <main className="auth-page" data-role={role} style={{ '--parallax-x': `${parallax.x}px`, '--parallax-y': `${parallax.y}px` } as CSSProperties}>
      <section className="auth-intro" aria-label="PPST introduction">
        <div className="auth-aurora auth-aurora--one" aria-hidden="true" />
        <div className="auth-aurora auth-aurora--two" aria-hidden="true" />
        <BackgroundIcons />
        <header className="auth-brand">
          <img className="auth-brand__logo" src={ppstLogo} alt="Universiti Malaysia Sabah, Pusat Persediaan Sains dan Teknologi" />
        </header>
        <div className="auth-intro__content">
          <h1>Better guidance.<br /><em>Brighter outcomes.</em></h1>
          <p className="auth-intro__copy">
            A purposeful space for meaningful mentorship, progress tracking, and the people who help you move forward.
          </p>
        </div>
        <div className="auth-intro__footer">
          <span className="auth-status-dot" />
          <span>UMS student support network</span>
          <span className="auth-footer-line" />
          <span>Built for progress</span>
        </div>
      </section>

      <section className="auth-panel" aria-label={`${role} sign in`}>
        <div className="auth-panel__inner">
          <div className="auth-switch" role="tablist" aria-label="Choose account type">
            <button type="button" role="tab" aria-selected={isStudent} className={isStudent ? 'is-active' : ''} onClick={() => switchRole('student')}>Student</button>
            <button type="button" role="tab" aria-selected={!isStudent} className={!isStudent ? 'is-active' : ''} onClick={() => switchRole('staff')}>Staff</button>
          </div>
          <div className="auth-panel__heading" aria-live="polite">
            <p className="auth-panel__eyebrow">WELCOME</p>
            <p>{isStudent ? 'Sign in to pick up where you left off with your mentor and your goals.' : 'Access your mentoring workspace, updates, and student support tools.'}</p>
          </div>
          <form onSubmit={handleSubmit} className={`auth-form ${error ? 'has-error' : ''}`}>
            <label htmlFor="auth-identifier">{isStudent ? 'Matric number' : 'Staff ID'}</label>
            <div className="auth-field">
              <input
                id="auth-identifier"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={isStudent ? 'e.g. BA23110001' : 'name@ums.edu.my'}
                autoComplete="username"
                required
              />
              <span className="auth-field__line" aria-hidden="true" />
            </div>
            <label htmlFor="auth-password">{isStudent ? <>Password <span>(IC number)</span></> : 'Password'}</label>
            <div className="auth-field">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isStudent ? 'Enter your IC number' : 'Enter your password'}
                autoComplete="current-password"
                required
              />
              <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {error && <p className="auth-form__error" role="alert">{error}</p>}
            <button type="submit" className="auth-submit" disabled={isSubmitting}>
              <span>{isSubmitting ? <><span className="auth-spinner" aria-hidden="true" /> Signing in…</> : isStudent ? 'Continue to your space' : 'Enter staff workspace'}</span>
              {!isSubmitting && <ArrowIcon />}
            </button>
          </form>
          <div className="auth-panel__footer">
            {isStudent ? <>Lecturer or admin? <button type="button" onClick={() => switchRole('staff')}>Use staff login <ArrowIcon /></button></> : <>Student account? <button type="button" onClick={() => switchRole('student')}>Use student login <ArrowIcon /></button></>}
          </div>
        </div>
      </section>
    </main>
  )
}
