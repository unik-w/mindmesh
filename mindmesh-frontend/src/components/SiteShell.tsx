import { Link } from 'react-router-dom'
import { btnPrimary, wrap } from '../uiClasses'

const navLinks = [
  { to: '/#product', label: 'Product' },
  { to: '/#sessions', label: 'Sessions' },
  { to: '/discover', label: 'Get started' },
] as const

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_-30%,rgba(6,182,212,0.14),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_10%,rgba(124,58,237,0.12),transparent_50%),radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(59,130,246,0.08),transparent_45%)]"
        aria-hidden="true"
      />

      <header className="sticky top-0 z-20 h-16 shrink-0 border-b border-border/80 bg-[color-mix(in_srgb,var(--color-canvas)_85%,white)] backdrop-blur-md">
        <div className={`${wrap} flex h-full items-center justify-between gap-4`}>
          <Link
            className="flex shrink-0 items-center no-underline transition-opacity hover:opacity-90"
            to="/"
          >
            <img
              src="/mindmesh-logo.png"
              alt="MindMesh"
              className="h-8 w-auto sm:h-9"
            />
          </Link>
          <nav className="hidden sm:block" aria-label="Primary">
            <ul className="m-0 flex list-none flex-wrap justify-center gap-[22px] p-0">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    className="text-sm font-medium text-muted no-underline transition-colors duration-150 hover:text-heading"
                    to={l.to}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            className={`${btnPrimary} max-[480px]:hidden px-4`}
            to="/discover"
          >
            Get started
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {children}
      </div>

      <footer className="relative z-10 mt-auto shrink-0 border-t border-border py-[22px] pb-9">
        <div
          className={`${wrap} flex flex-wrap items-center justify-between gap-4`}
        >
          <Link to="/" className="no-underline">
            <img
              src="/mindmesh-logo.png"
              alt="MindMesh"
              className="h-7 w-auto opacity-95 sm:h-8"
            />
          </Link>
          <p className="m-0 text-[0.82rem] text-muted">
            © {new Date().getFullYear()} · Research discovery, connected
          </p>
        </div>
      </footer>
    </div>
  )
}
