import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { SiteShell } from '../components/SiteShell'
import { btnBase, btnPrimary, gradientText, wrap } from '../uiClasses'

const INTERESTS = [
  { id: 'ml-ai', label: 'Machine learning & AI' },
  { id: 'biology', label: 'Biology & genomics' },
  { id: 'climate', label: 'Climate & sustainability' },
  { id: 'physics', label: 'Physics & applied math' },
  { id: 'medicine', label: 'Medicine & health' },
  { id: 'hci', label: 'HCI, design & computing' },
  { id: 'neuro', label: 'Neuroscience & cognition' },
  { id: 'materials', label: 'Chemistry & materials' },
  { id: 'robotics', label: 'Robotics & systems' },
  { id: 'policy', label: 'Economics & policy' },
  { id: 'social', label: 'Social & behavioral science' },
  { id: 'energy', label: 'Energy & infrastructure' },
] as const

export default function DiscoverPage() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [phase, setPhase] = useState<'interests' | 'done'>('interests')

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleContinue = () => {
    if (selected.size === 0) return
    setPhase('done')
  }

  useEffect(() => {
    if (phase !== 'interests') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase])

  const interestsModal =
    phase === 'interests' ? (
      <div className="fixed inset-0 z-10000 flex items-end justify-center p-4 pb-6 sm:items-center sm:pb-4">
        <div
          className="absolute inset-0 bg-white/90 backdrop-blur-2xl backdrop-saturate-150"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-20%,rgba(6,182,212,0.06),transparent_50%),radial-gradient(ellipse_80%_55%_at_100%_15%,rgba(124,58,237,0.05),transparent_45%),radial-gradient(ellipse_60%_50%_at_0%_90%,rgba(59,130,246,0.04),transparent_45%)]"
          aria-hidden="true"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="interest-dialog-title"
          aria-describedby="interest-dialog-desc"
          className="relative flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/40 bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.28),0_0_0_1px_rgba(255,255,255,0.6)_inset] ring-1 ring-slate-200/50"
        >
          <div className="shrink-0 border-b border-slate-100/90 bg-white px-5 pt-5 pb-4">
            <p
              className={`text-[0.72rem] font-semibold tracking-[0.12em] uppercase ${gradientText}`}
            >
              Discover
            </p>
            <h2
              id="interest-dialog-title"
              className="font-display mt-2 text-[clamp(1.15rem,3.5vw,1.35rem)] leading-tight font-bold tracking-[-0.02em] text-heading"
            >
              What are you interested in?
            </h2>
            <p
              id="interest-dialog-desc"
              className="mt-2 text-[0.875rem] leading-relaxed text-muted"
            >
              Select the areas that match your research. Choose as many as you
              like—we will use this to tune recommendations and Session ideas.
            </p>
          </div>

          <p id="interest-hint" className="sr-only">
            Toggle each topic on or off. Select at least one to continue.
          </p>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4">
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              role="group"
              aria-label="Research interests"
              aria-describedby="interest-hint"
            >
              {INTERESTS.map((item) => {
                const isOn = selected.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => toggle(item.id)}
                    className={`rounded-xl border px-3.5 py-3 text-left text-[0.875rem] font-medium transition-all duration-150 ${
                      isOn
                        ? 'border-transparent bg-linear-to-r from-cyan-500/15 via-blue-500/12 to-violet-500/15 text-heading shadow-md shadow-violet-500/10 ring-2 ring-violet-500/40'
                        : 'border-border/90 bg-white text-foreground hover:border-violet-200 hover:bg-slate-50/70'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 text-[10px] font-bold ${
                          isOn
                            ? 'border-violet-600 bg-violet-600 text-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="shrink-0 space-y-3 border-t border-slate-100/80 bg-white px-5 py-4">
            <p className="text-center text-xs text-muted">
              {selected.size === 0
                ? 'Select at least one topic to continue.'
                : `${selected.size} selected`}
            </p>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Link
                to="/"
                className={`${btnBase} justify-center border border-border bg-white px-5 py-2.5 text-foreground shadow-sm hover:bg-canvas-muted sm:min-w-0`}
              >
                Cancel
              </Link>
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={handleContinue}
                className={`${btnPrimary} justify-center px-6 disabled:pointer-events-none disabled:opacity-40`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null

  return (
    <SiteShell>
      <main className="flex flex-1 flex-col">
        {phase === 'done' ? (
          <div
            className={`${wrap} flex flex-1 flex-col items-center justify-center py-24 sm:py-32`}
          >
            <p className="font-display text-center text-lg font-medium tracking-wide text-muted sm:text-xl">
              Coming soon
            </p>
          </div>
        ) : null}
      </main>
      {interestsModal ? createPortal(interestsModal, document.body) : null}
    </SiteShell>
  )
}
