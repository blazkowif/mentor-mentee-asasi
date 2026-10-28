import { ReactNode } from 'react'

type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="auth-intro__glow auth-intro__glow--top" aria-hidden="true" />
        <div className="auth-intro__glow auth-intro__glow--bottom" aria-hidden="true" />

        <header className="auth-brand">
          <div className="auth-brand__mark">P</div>
          <div>
            <p className="auth-brand__name">PPST</p>
            <p className="auth-brand__subline">Mentor–Mentee System</p>
          </div>
        </header>

        <div className="auth-intro__content">
          <p className="auth-kicker">Student success, connected</p>
          <h1>Better guidance.<br /><em>Brighter outcomes.</em></h1>
          <p className="auth-intro__copy">
            One calm, purposeful space for meaningful mentorship, progress tracking,
            and the people who help you move forward.
          </p>
        </div>

        <div className="auth-intro__footer">
          <span className="auth-status-dot" />
          <span>UMS student support network</span>
          <span className="auth-footer-line" />
          <span>Built for progress</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel__inner">
          <div className="auth-panel__heading">
            <p className="auth-panel__eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {children}
          <div className="auth-panel__footer">{footer}</div>
        </div>
      </section>
    </main>
  )
}
