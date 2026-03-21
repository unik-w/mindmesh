import { useCallback, useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import { Link, useNavigate } from 'react-router-dom'
import { SiteShell } from '../components/SiteShell'
import { auth } from '../firebase'
import {
  demoProfile,
  demoSponsoredResearches,
} from './discover/data'
import { btnBase, btnPrimary, wrap } from '../uiClasses'

const STORAGE_KEY = 'mindmesh_profile_v1'

type StoredProfile = {
  fullName: string
  email: string
  affiliation: string
  bio: string
  googleScholarUrl: string | null
}

const defaultStored = (): StoredProfile => ({
  fullName: demoProfile.fullName,
  email: demoProfile.email,
  affiliation: demoProfile.affiliation,
  bio: demoProfile.bio,
  googleScholarUrl: null,
})

function loadStored(): StoredProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultStored()
    const parsed = JSON.parse(raw) as Partial<StoredProfile>
    return { ...defaultStored(), ...parsed }
  } catch {
    return defaultStored()
  }
}

function saveStored(data: StoredProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function isLikelyScholarUrl(s: string) {
  const t = s.trim()
  if (!t) return false
  try {
    const u = new URL(t.startsWith('http') ? t : `https://${t}`)
    return u.hostname.includes('scholar.google')
  } catch {
    return false
  }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const [stored, setStored] = useState<StoredProfile>(() => loadStored())
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<StoredProfile>(() => loadStored())
  const [scholarInput, setScholarInput] = useState('')

  useEffect(() => {
    setDraft(stored)
  }, [stored])

  const persist = useCallback((next: StoredProfile) => {
    setStored(next)
    saveStored(next)
  }, [])

  const handleSaveProfile = () => {
    persist(draft)
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setDraft(stored)
    setEditing(false)
  }

  const handleConnectScholar = () => {
    const url = scholarInput.trim()
    if (!isLikelyScholarUrl(url)) return
    const normalized = url.startsWith('http') ? url : `https://${url}`
    persist({ ...stored, googleScholarUrl: normalized })
    setScholarInput('')
  }

  const handleDisconnectScholar = () => {
    persist({ ...stored, googleScholarUrl: null })
  }

  const handleLogout = async () => {
    localStorage.removeItem(STORAGE_KEY)
    try {
      await signOut(auth)
    } catch {
      /* ignore */
    }
    navigate('/')
  }

  const display = editing ? draft : stored

  const statusStyles = useMemo(
    () =>
      ({
        Active:
          'border-emerald-200 bg-emerald-50 text-emerald-800',
        Reporting:
          'border-amber-200 bg-amber-50 text-amber-900',
        Completed:
          'border-slate-200 bg-slate-100 text-slate-700',
      }) as const,
    [],
  )

  return (
    <SiteShell>
      <main
        id="top"
        className="relative flex-1 bg-[color-mix(in_srgb,var(--color-canvas)_92%,white)] py-10 pb-16"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(ellipse 60% 45% at 90% 0%, rgba(139,92,246,0.08), transparent), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(6,182,212,0.07), transparent)',
          }}
        />
        <div className={`${wrap} relative max-w-[720px]`}>
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="m-0 text-xs font-medium tracking-wide text-muted uppercase">
                Account
              </p>
              <h1 className="mt-1 mb-0 text-2xl font-semibold tracking-tight text-heading sm:text-[1.65rem]">
                Profile
              </h1>
              <p className="mt-2 mb-0 max-w-lg text-sm text-muted">
                Manage how you appear on MindMesh, link Google Scholar, and
                review sponsored research you are part of.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/discover"
                className={`${btnBase} border border-border bg-white px-4 py-2.5 text-foreground shadow-sm no-underline hover:bg-canvas-muted`}
              >
                Back to Discover
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={`${btnBase} border border-red-200 bg-white px-4 py-2.5 text-red-700 shadow-sm hover:bg-red-50`}
              >
                Log out
              </button>
            </div>
          </div>

          <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm shadow-slate-200/40">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-4">
                <span
                  className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-500 to-violet-600 text-lg font-bold text-white shadow-md"
                  aria-hidden
                >
                  {demoProfile.initials}
                </span>
                <div className="min-w-0">
                  <h2 className="m-0 text-lg font-semibold text-heading">
                    {display.fullName}
                  </h2>
                  <p className="m-0 mt-0.5 truncate text-sm text-muted">
                    @{demoProfile.username}
                  </p>
                </div>
              </div>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className={`${btnBase} border border-border bg-white px-4 py-2 text-sm text-foreground shadow-sm hover:bg-canvas-muted`}
                >
                  Edit profile
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className={`${btnBase} border border-border bg-white px-4 py-2 text-sm hover:bg-canvas-muted`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className={`${btnPrimary} px-4 py-2 text-sm`}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Full name
                </span>
                {editing ? (
                  <input
                    value={draft.fullName}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, fullName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none ring-violet-400/40 focus-visible:ring-2"
                  />
                ) : (
                  <p className="m-0 rounded-xl border border-transparent bg-slate-50/80 px-3 py-2.5 text-sm text-foreground">
                    {stored.fullName}
                  </p>
                )}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Email
                </span>
                {editing ? (
                  <input
                    type="email"
                    autoComplete="email"
                    value={draft.email}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, email: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none ring-violet-400/40 focus-visible:ring-2"
                  />
                ) : (
                  <p className="m-0 rounded-xl border border-transparent bg-slate-50/80 px-3 py-2.5 text-sm text-foreground">
                    {stored.email}
                  </p>
                )}
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Affiliation
                </span>
                {editing ? (
                  <input
                    value={draft.affiliation}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, affiliation: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none ring-violet-400/40 focus-visible:ring-2"
                  />
                ) : (
                  <p className="m-0 rounded-xl border border-transparent bg-slate-50/80 px-3 py-2.5 text-sm text-foreground">
                    {stored.affiliation}
                  </p>
                )}
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Bio
                </span>
                {editing ? (
                  <textarea
                    value={draft.bio}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, bio: e.target.value }))
                    }
                    rows={4}
                    className="w-full resize-y rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none ring-violet-400/40 focus-visible:ring-2"
                  />
                ) : (
                  <p className="m-0 whitespace-pre-wrap rounded-xl border border-transparent bg-slate-50/80 px-3 py-2.5 text-sm leading-relaxed text-foreground">
                    {stored.bio}
                  </p>
                )}
              </label>
            </div>
          </section>

          <section className="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm shadow-slate-200/40">
            <h2 className="m-0 text-lg font-semibold text-heading">
              Google Scholar
            </h2>
            <p className="mt-2 mb-0 text-sm text-muted">
              Link your public Scholar profile so collaborators can verify
              publications and citations.
            </p>
            {stored.googleScholarUrl ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-4 py-3">
                <div className="min-w-0">
                  <p className="m-0 text-xs font-medium text-emerald-900 uppercase">
                    Connected
                  </p>
                  <a
                    href={stored.googleScholarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-sm font-medium text-emerald-800 underline decoration-emerald-400/60 underline-offset-2 hover:decoration-emerald-700"
                  >
                    {stored.googleScholarUrl}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectScholar}
                  className={`${btnBase} shrink-0 border border-border bg-white px-3 py-2 text-sm hover:bg-canvas-muted`}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1">
                  <span className="mb-1.5 block text-xs font-medium text-muted">
                    Profile URL
                  </span>
                  <input
                    value={scholarInput}
                    onChange={(e) => setScholarInput(e.target.value)}
                    placeholder="https://scholar.google.com/citations?user=…"
                    className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none ring-violet-400/40 focus-visible:ring-2"
                  />
                </label>
                <button
                  type="button"
                  disabled={!isLikelyScholarUrl(scholarInput)}
                  onClick={handleConnectScholar}
                  className={`${btnPrimary} w-full justify-center px-5 py-2.5 sm:w-auto disabled:pointer-events-none disabled:opacity-45`}
                >
                  Connect
                </button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm shadow-slate-200/40">
            <h2 className="m-0 text-lg font-semibold text-heading">
              Sponsored research
            </h2>
            <p className="mt-2 mb-0 text-sm text-muted">
              Projects where you are listed as PI or co-PI with sponsor
              visibility on MindMesh.
            </p>
            <ul className="m-0 mt-5 list-none space-y-3 p-0">
              {demoSponsoredResearches.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/60 px-4 py-3.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="m-0 flex-1 text-[0.95rem] font-medium leading-snug text-heading">
                      {r.title}
                    </p>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase ${statusStyles[r.status as keyof typeof statusStyles] ?? 'border-slate-200 bg-slate-100 text-slate-700'}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="m-0 mt-2 text-sm text-muted">
                    <span className="font-medium text-foreground/80">
                      {r.sponsor}
                    </span>
                    <span aria-hidden> · </span>
                    {r.period}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </SiteShell>
  )
}
