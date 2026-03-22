import { useEffect, useState } from 'react'
import { searchAuthors } from '../../api'
import { popularAuthorsWidget } from './data'

export function DiscoverAuthorsPanel() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<
    { name: string; affiliation: string }[]
  >([])

  const q = query.trim()
  const displayMatches = q ? results : []

  useEffect(() => {
    if (!q) return
    let cancelled = false
    const t = window.setTimeout(() => {
      setLoading(true)
      void searchAuthors(q).then((hits) => {
        if (!cancelled) {
          setResults(hits)
          setLoading(false)
        }
      })
    }, 220)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [q])

  return (
    <section
      className="flex min-h-0 flex-1 basis-0 flex-col overflow-y-auto px-6 py-6"
      aria-labelledby="authors-panel-title"
    >
      <h1
        id="authors-panel-title"
        className="m-0 text-lg font-semibold text-slate-900"
      >
        Search author
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Find people in your research graph
      </p>
      <label className="sr-only" htmlFor="author-search">
        Search authors
      </label>
      <div className="mt-6 max-w-md rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-inner shadow-slate-100">
        <input
          id="author-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="m-0 w-full border-0 bg-transparent p-0 font-inherit text-sm text-slate-900 outline-none placeholder:text-slate-400"
          placeholder="Search authors…"
          aria-label="Search authors"
          autoComplete="off"
        />
      </div>
      {loading && q ? (
        <p className="mt-3 max-w-md text-xs text-slate-500" role="status">
          Searching…
        </p>
      ) : null}
      <h2 className="mt-8 mb-0 max-w-md text-[0.8125rem] font-semibold tracking-wide text-slate-800">
        Popular authors
      </h2>
      <ul className="mt-3 max-w-md list-none divide-y divide-slate-200/80 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-0 shadow-sm">
        {popularAuthorsWidget.map((a) => (
          <li key={a.name}>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 via-blue-600 to-cyan-400 text-[0.65rem] font-bold text-white shadow-md shadow-violet-500/25"
                aria-hidden
              >
                {a.initials}
              </span>
              <span className="truncate text-[0.8125rem] font-medium text-slate-800">
                {a.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 mb-0 max-w-md text-[0.8125rem] font-semibold tracking-wide text-slate-800">
        Matches
      </h2>
      <ul className="mt-3 max-w-md list-none space-y-2 p-0">
        {!q && !loading ? (
          <li className="text-sm text-slate-500">
            Type to search the author index (demo data until the backend is
            live).
          </li>
        ) : null}
        {q && !loading && displayMatches.length === 0 ? (
          <li className="text-sm text-slate-500">
            No matches—try another name or affiliation.
          </li>
        ) : null}
        {displayMatches.map((a) => (
          <li key={`${a.name}-${a.affiliation}`}>
            <button
              type="button"
              className="w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:bg-slate-50"
            >
              <p className="m-0 text-sm font-semibold text-slate-900">
                {a.name}
              </p>
              <p className="mt-0.5 mb-0 text-xs text-slate-500">
                {a.affiliation}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
