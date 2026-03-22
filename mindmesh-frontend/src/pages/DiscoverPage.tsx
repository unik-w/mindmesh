import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import type { User } from '@supabase/supabase-js'
import { Link } from 'react-router-dom'
import {
  addCardComment,
  clearMindMeshApiSession,
  createSession,
  getDiscoveryFeed,
  getPersistedComments,
  getSavedInterests,
  getUserLikes,
  joinSession,
  listSessions,
  loadMoreFeedPapers,
  saveInterests,
  searchPapers,
  setCardLike,
  syncMindMeshAuth,
  analyzePdf,
} from '../api'
import type { PdfAnalysisResult, FeedSummaryItem } from '../api'
import {
  supabaseAccountInitials,
  supabaseAvatarUrl,
  supabaseDisplayName,
} from '../auth/supabaseUser'
import { supabase } from '../supabaseClient'
import { btnBase, btnPrimary, gradientText } from '../uiClasses'
import {
  arxivAbsUrl,
  arxivIdForPost,
  arxivPdfPreviewEmbedUrl,
  arxivPdfUrl,
  paperDetailText,
} from './discover/arxiv'
import { ArxivSearchPanel } from './discover/ArxivSearchPanel'
import { DiscoverAuthorsPanel } from './discover/DiscoverAuthorsPanel'
import { DiscoverFeedReel } from './discover/DiscoverFeedReel'
import { stopElevenLabsPlayback } from './discover/elevenlabsTts'
import { PaperVideoButton } from './discover/PaperVideoButton'

const PaperVideoDialog = lazy(() =>
  import('./discover/PaperVideoDialog').then((m) => ({
    default: m.PaperVideoDialog,
  })),
)
import { SummarySpeechButton } from './discover/SummarySpeechButton'
import { LikesPanel } from './discover/LikesPanel'
import { demoProfile, feedItems, INTERESTS } from './discover/data'
import {
  sessionRowActive,
  sessionRowBtn,
  sidebarNavBtn,
  sidebarNavBtnActive,
  sidebarNavBtnIdle,
} from './discover/discoverNavStyles'
import { interleaveFeedPromos } from './discover/feedPromos'
import { relatedPapersFor } from './discover/relatedPapers'
import type { PaperSearchHit, SessionSummary } from '../api/types'
import type { FeedItem, MainPanel, NewSessionModalStep } from './discover/types'
import {
  IconAuthor,
  IconPaper,
  IconPlus,
  MindMeshWordmark,
  SidebarNavIconDiscover,
  SidebarNavIconLikes,
  SidebarNavIconSearch,
} from './discover/icons'

export default function DiscoverPage() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [phase, setPhase] = useState<'interests' | 'done'>('interests')
  const [authReady, setAuthReady] = useState(false)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [signInBusy, setSignInBusy] = useState(false)
  const [mainPanel, setMainPanel] = useState<MainPanel>('discover')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [newSessionOpen, setNewSessionOpen] = useState(false)
  const [newSessionStep, setNewSessionStep] =
    useState<NewSessionModalStep>('choose')
  const [paperQuery, setPaperQuery] = useState('')
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({})
  const likedPostsRef = useRef(likedPosts)
  likedPostsRef.current = likedPosts
  const likeInFlightRef = useRef<Set<string>>(new Set())
  const [commentsOpenPostId, setCommentsOpenPostId] = useState<string | null>(
    null,
  )
  const [commentDraftByPost, setCommentDraftByPost] = useState<
    Record<string, string>
  >({})
  const [commentExtras, setCommentExtras] = useState<
    Record<string, { id: string; author: string; body: string }[]>
  >({})
  const [paperSheetPost, setPaperSheetPost] = useState<FeedItem | null>(null)

  const [workspaceSessions, setWorkspaceSessions] = useState<SessionSummary[]>(
    [],
  )
  const [discoveryFeedItems, setDiscoveryFeedItems] = useState<FeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [paperHits, setPaperHits] = useState<PaperSearchHit[]>([])
  const [paperSearchLoading, setPaperSearchLoading] = useState(false)

  const [feedOffset, setFeedOffset] = useState(0)
  const [feedHasMore, setFeedHasMore] = useState(true)
  const [feedLoadingMore, setFeedLoadingMore] = useState(false)

  const selectedInterestKey = useMemo(
    () => [...selected].sort().join(','),
    [selected],
  )

  const commentAuthorName =
    supabaseDisplayName(authUser)?.trim() ||
    authUser?.email?.split('@')[0] ||
    demoProfile.username

  const togglePostLike = useCallback((postId: string) => {
    if (likeInFlightRef.current.has(postId)) return

    const prevLiked = Boolean(likedPostsRef.current[postId])
    const nextLiked = !prevLiked
    const delta = nextLiked ? 1 : -1

    likedPostsRef.current = { ...likedPostsRef.current, [postId]: nextLiked }
    likeInFlightRef.current.add(postId)

    setLikedPosts((prev) => ({ ...prev, [postId]: nextLiked }))
    setDiscoveryFeedItems((items) =>
      items.map((p) =>
        p.id === postId ? { ...p, likes: Math.max(0, p.likes + delta) } : p,
      ),
    )
    setWorkspaceSessions((sessions) =>
      sessions.map((s) => ({
        ...s,
        papers: s.papers.map((p) =>
          p.id === postId
            ? { ...p, likes: Math.max(0, p.likes + delta) }
            : p,
        ),
      })),
    )

    void setCardLike(postId, nextLiked)
      .then((res) => {
        likedPostsRef.current = { ...likedPostsRef.current, [postId]: res.liked }
        setLikedPosts((p) => ({ ...p, [postId]: res.liked }))
        setDiscoveryFeedItems((items) =>
          items.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes:
                    res.likes !== undefined ? res.likes : p.likes,
                }
              : p,
          ),
        )
        setWorkspaceSessions((sessions) =>
          sessions.map((s) => ({
            ...s,
            papers: s.papers.map((p) =>
              p.id === postId
                ? {
                    ...p,
                    likes:
                      res.likes !== undefined ? res.likes : p.likes,
                  }
                : p,
            ),
          })),
        )
      })
      .catch(() => {
        likedPostsRef.current = { ...likedPostsRef.current, [postId]: prevLiked }
        setLikedPosts((p) => ({ ...p, [postId]: prevLiked }))
        setDiscoveryFeedItems((items) =>
          items.map((p) =>
            p.id === postId ? { ...p, likes: Math.max(0, p.likes - delta) } : p,
          ),
        )
        setWorkspaceSessions((sessions) =>
          sessions.map((s) => ({
            ...s,
            papers: s.papers.map((p) =>
              p.id === postId
                ? { ...p, likes: Math.max(0, p.likes - delta) }
                : p,
            ),
          })),
        )
      })
      .finally(() => {
        likeInFlightRef.current.delete(postId)
      })
  }, [])

  const displayedLikeCount = useCallback((post: FeedItem) => post.likes, [])

  const displayedCommentCount = useCallback((post: FeedItem) => post.comments, [])

  const openPaperVideo = useCallback((p: FeedItem) => {
    setVideoDialogPost(p)
  }, [])

  const toggleCommentsOpen = useCallback((postId: string) => {
    setCommentsOpenPostId((prev) => (prev === postId ? null : postId))
  }, [])

  const submitComment = useCallback(
    (postId: string) => {
      setCommentDraftByPost((draftState) => {
        const body = (draftState[postId] ?? '').trim()
        if (!body) return draftState
        void addCardComment(postId, body, commentAuthorName).then((row) => {
          setCommentExtras((prev) => ({
            ...prev,
            [postId]: [...(prev[postId] ?? []), row],
          }))
          setDiscoveryFeedItems((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, comments: p.comments + 1 } : p,
            ),
          )
          setWorkspaceSessions((prev) =>
            prev.map((s) => ({
              ...s,
              papers: s.papers.map((p) =>
                p.id === postId ? { ...p, comments: p.comments + 1 } : p,
              ),
            })),
          )
        })
        return { ...draftState, [postId]: '' }
      })
    },
    [commentAuthorName],
  )

  const closePaperSheet = useCallback(() => {
    stopElevenLabsPlayback()
    setPaperSheetPost(null)
    setPdfAnalysis(null)
    setPdfAnalysisLoading(false)
  }, [])

  const handleRequestPdfAnalysis = useCallback(() => {
    if (!paperSheetPost || pdfAnalysisLoading || pdfAnalysis) return
    setPdfAnalysisLoading(true)
    const pdfUrl = arxivPdfUrl(paperSheetPost)
    void analyzePdf(pdfUrl, paperSheetPost.title)
      .then((result) => setPdfAnalysis(result))
      .catch(() => { /* fall back to static text silently */ })
      .finally(() => setPdfAnalysisLoading(false))
  }, [paperSheetPost, pdfAnalysisLoading, pdfAnalysis])

  const handleCardMainClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>, post: FeedItem) => {
      const t = e.target as HTMLElement
      if (t.closest('button, a, textarea, input, label')) return
      setPaperSheetPost(post)
    },
    [],
  )

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const applySummaries = useCallback((summaries: FeedSummaryItem[]) => {
    const map = new Map(
      summaries
        .filter((s) => s.summary && !s.error)
        .map((s) => [s.paper_id, s.summary]),
    )
    if (map.size === 0) return
    setDiscoveryFeedItems((prev) =>
      prev.map((item) => {
        const llm = map.get(item.id)
        return llm ? { ...item, aiSummary: llm } : item
      }),
    )
  }, [])

  const handleContinue = useCallback(async () => {
    if (selected.size === 0) return
    try {
      await saveInterests([...selected])
      setPhase('done')
    } catch {
      /* ignore */
    }
  }, [selected])

  const handleLoadMore = useCallback(async () => {
    if (feedLoadingMore || !feedHasMore) return
    setFeedLoadingMore(true)
    try {
      const nextOffset = feedOffset + 6
      const more = await loadMoreFeedPapers(nextOffset, applySummaries)
      if (more.length === 0) {
        setFeedHasMore(false)
      } else {
        setDiscoveryFeedItems((prev) => [...prev, ...more])
        setFeedOffset(nextOffset)
        if (more.length < 6) setFeedHasMore(false)
      }
    } catch {
      /* ignore */
    } finally {
      setFeedLoadingMore(false)
    }
  }, [feedOffset, feedLoadingMore, feedHasMore, applySummaries])

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true)
      setAuthUser(null)
      return
    }

    let cancelled = false

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null)
      setAuthReady(true)
      if (cancelled) return
      void syncMindMeshAuth(session)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!authReady || authUser) return
    clearMindMeshApiSession()
    setPhase('interests')
    setSelected(new Set())
    setPaperSheetPost(null)
    setNewSessionOpen(false)
    setMainPanel('discover')
    setActiveSessionId(null)
    setWorkspaceSessions([])
    setDiscoveryFeedItems([])
    setFeedOffset(0)
    setFeedHasMore(true)
    setFeedLoadingMore(false)
    setLikedPosts({})
    setCommentExtras({})
  }, [authReady, authUser])

  useEffect(() => {
    if (!authReady || !authUser) return
    let cancelled = false
    void (async () => {
      const saved = await getSavedInterests()
      if (cancelled) return
      if (saved.length > 0) {
        setSelected(new Set(saved))
        setPhase('done')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, authUser])

  useEffect(() => {
    if (!authReady || !authUser || phase !== 'done') return
    if (selected.size === 0) return
    let cancelled = false
    void (async () => {
      setFeedLoading(true)
      setSessionsLoading(true)
      try {
        const [feed, list, likesMap, commentsMap] = await Promise.all([
          getDiscoveryFeed([...selected], (s) => {
            if (!cancelled) applySummaries(s)
          }),
          listSessions(),
          getUserLikes(),
          getPersistedComments(),
        ])
        if (cancelled) return
        setDiscoveryFeedItems(feed)
        setFeedOffset(0)
        setFeedHasMore(feed.length >= 6)
        setWorkspaceSessions(list)
        setLikedPosts(likesMap)
        setCommentExtras(commentsMap)
      } catch {
        if (!cancelled) {
          setDiscoveryFeedItems(
            [...feedItems].sort((a, b) => {
              const ma = a.interestIds.some((id) => selected.has(id))
              const mb = b.interestIds.some((id) => selected.has(id))
              return Number(mb) - Number(ma)
            }),
          )
        }
      } finally {
        if (!cancelled) {
          setFeedLoading(false)
          setSessionsLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedInterestKey encodes `selected` (Set)
  }, [authReady, authUser, phase, selectedInterestKey])

  const handleGoogleSignIn = useCallback(async () => {
    setSignInError(null)
    if (!supabase) {
      setSignInError(
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      )
      return
    }
    setSignInBusy(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/discover`,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) {
        setSignInError(error.message || 'Could not sign in. Please try again.')
        setSignInBusy(false)
      }
      /* On success the browser redirects to Google; keep busy until unload */
    } catch {
      setSignInError('Could not sign in. Please try again.')
      setSignInBusy(false)
    }
  }, [])

  const handleLogout = useCallback(async () => {
    setAccountMenuOpen(false)
    clearMindMeshApiSession()
    try {
      if (supabase) await supabase.auth.signOut()
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!accountMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      const el = accountMenuRef.current
      if (el && !el.contains(e.target as Node)) setAccountMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [accountMenuOpen])

  const closeNewSessionModal = useCallback(() => {
    setNewSessionOpen(false)
    setNewSessionStep('choose')
    setPaperQuery('')
    setPaperHits([])
  }, [])

  const finishNewSessionFromPaper = useCallback(async () => {
    try {
      if (newSessionStep === 'paper') {
        await createSession({
          source: 'paper',
          paperQuery: paperQuery.trim(),
        })
      }
      const list = await listSessions()
      setWorkspaceSessions(list)
    } catch {
      /* ignore */
    }
    closeNewSessionModal()
    setActiveSessionId(null)
    setMainPanel('discover')
  }, [closeNewSessionModal, newSessionStep, paperQuery])

  useEffect(() => {
    if (newSessionStep !== 'paper' || !newSessionOpen) {
      setPaperHits([])
      return
    }
    const q = paperQuery.trim()
    if (!q) {
      setPaperHits([])
      setPaperSearchLoading(false)
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      setPaperSearchLoading(true)
      void searchPapers(q).then((hits) => {
        if (!cancelled) {
          setPaperHits(hits)
          setPaperSearchLoading(false)
        }
      })
    }, 280)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [newSessionOpen, newSessionStep, paperQuery])

  const prioritizedFeed = useMemo(() => {
    if (activeSessionId) {
      const session = workspaceSessions.find((s) => s.id === activeSessionId)
      return session ? [...session.papers] : []
    }
    if (discoveryFeedItems.length > 0) {
      return [...discoveryFeedItems]
    }
    const scored = feedItems.map((item) => {
      const match = item.interestIds.some((id) => selected.has(id))
      return { item, match }
    })
    return scored
      .sort((a, b) => Number(b.match) - Number(a.match))
      .map((s) => s.item)
  }, [activeSessionId, workspaceSessions, discoveryFeedItems, selected])

  const relatedPaperPool = useMemo(() => {
    const byId = new Map<string, FeedItem>()
    for (const p of feedItems) byId.set(p.id, p)
    for (const p of discoveryFeedItems) byId.set(p.id, p)
    for (const s of workspaceSessions) {
      for (const p of s.papers) {
        byId.set(p.id, p)
      }
    }
    return [...byId.values()]
  }, [discoveryFeedItems, workspaceSessions])

  const feedWithPromos = useMemo(() => {
    const selectedKey = [...selected].sort().join(',')
    const feedKey = prioritizedFeed.map((p) => p.id).join(',')
    const seed = `${activeSessionId ?? 'discover'}|${selectedKey}|${feedKey}`
    let primaryInterestLabel = 'Research'
    for (const item of INTERESTS) {
      if (selected.has(item.id)) {
        primaryInterestLabel = item.label
        break
      }
    }
    return interleaveFeedPromos(
      prioritizedFeed,
      primaryInterestLabel,
      seed,
    )
  }, [prioritizedFeed, selected, activeSessionId])

  useEffect(() => {
    if (phase !== 'interests' || !authUser) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase, authUser])

  useEffect(() => {
    if (phase !== 'done' || !newSessionOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase, newSessionOpen])

  useEffect(() => {
    if (phase !== 'done' || !paperSheetPost) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase, paperSheetPost])

  useEffect(() => {
    if (!paperSheetPost) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePaperSheet()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [paperSheetPost, closePaperSheet])

  const interestsModal =
    authUser && phase === 'interests' ? (
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
          className="relative flex max-h-[min(90vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/40 bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.28),0_0_0_1px_rgba(255,255,255,0.6)_inset] ring-1 ring-slate-200/50 sm:max-w-2xl"
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
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
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
                    className={`rounded-xl border px-2.5 py-2.5 text-left text-[0.8125rem] font-medium transition-all duration-150 sm:px-3.5 sm:py-3 sm:text-[0.875rem] ${
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
                onClick={() => void handleContinue()}
                className={`${btnPrimary} justify-center px-6 disabled:pointer-events-none disabled:opacity-40`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null

  const sheetRelatedPapers = useMemo(
    () =>
      paperSheetPost
        ? relatedPapersFor(paperSheetPost, relatedPaperPool, 3)
        : [],
    [paperSheetPost, relatedPaperPool],
  )

  const paperSheetModal =
    phase === 'done' && paperSheetPost ? (
      <div className="fixed inset-0 z-10002 flex items-end justify-center sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          aria-label="Close paper details"
          onClick={closePaperSheet}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paper-sheet-title"
          className="relative flex max-h-[min(92dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-[0_-20px_60px_-20px_rgba(15,23,42,0.25)] sm:max-h-[min(88dvh,860px)] sm:rounded-2xl sm:shadow-2xl"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <p
                className={`m-0 text-[0.7rem] font-semibold tracking-[0.12em] uppercase ${gradientText}`}
              >
                Paper
              </p>
              <h2
                id="paper-sheet-title"
                className="font-display mt-1 text-[1.05rem] leading-snug font-bold tracking-tight text-slate-900 sm:text-[1.2rem]"
              >
                {paperSheetPost.title}
              </h2>
              <p className="mt-1 mb-0 text-[0.8125rem] text-slate-500">
                {paperSheetPost.authorLine}
              </p>
              <p className="mt-0.5 mb-0 text-[0.75rem] text-slate-400">
                {paperSheetPost.meta} · arXiv: {arxivIdForPost(paperSheetPost)}
              </p>
            </div>
            <button
              type="button"
              onClick={closePaperSheet}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-lg leading-none text-slate-600 transition-colors hover:bg-slate-100"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-white px-4 py-4 sm:px-6 [scrollbar-width:thin]">
            <section aria-labelledby="paper-detail-heading">
              <div className="flex items-start justify-between gap-2">
                <h3
                  id="paper-detail-heading"
                  className="m-0 min-w-0 flex-1 text-[0.8125rem] font-semibold tracking-wide text-slate-800"
                >
                  Detailed explanation
                </h3>
                <SummarySpeechButton
                  text={paperDetailText(paperSheetPost)}
                  className="-mr-1 -mt-0.5 text-slate-600"
                />
              </div>
              {pdfAnalysisLoading ? (
                <div className="mt-3 flex items-center gap-2.5 text-[0.8125rem] text-slate-500">
                  <span className="size-4 rounded-full border-2 border-slate-200 border-t-violet-500 animate-spin shrink-0" aria-hidden />
                  Generating detailed analysis from PDF…
                </div>
              ) : pdfAnalysis ? (
                <div className="mt-2 space-y-2.5 text-[0.9rem] leading-relaxed text-slate-700">
                  {pdfAnalysis.description_paragraphs.map((para, i) => (
                    <p key={`pd-${paperSheetPost.id}-${i}`} className="m-0 wrap-anywhere">
                      {para}
                    </p>
                  ))}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleRequestPdfAnalysis}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-violet-200/80 bg-violet-50/70 px-3.5 py-2 text-[0.8125rem] font-medium text-violet-700 transition-colors hover:bg-violet-100/70"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Generate detailed analysis from PDF
                  </button>
                  <div className="mt-3 space-y-2.5 text-[0.9rem] leading-relaxed text-slate-700">
                    {paperDetailText(paperSheetPost)
                      .split('\n\n')
                      .map((para, i) => (
                        <p key={`pd-${paperSheetPost.id}-${i}`} className="m-0 wrap-anywhere">
                          {para}
                        </p>
                      ))}
                  </div>
                </>
              )}
            </section>

            {pdfAnalysis && pdfAnalysis.research_directions.length > 0 ? (
              <section className="mt-8" aria-labelledby="research-directions-heading">
                <h3
                  id="research-directions-heading"
                  className="m-0 text-[0.8125rem] font-semibold tracking-wide text-slate-800"
                >
                  Research directions
                </h3>
                <ul className="m-0 mt-3 list-none space-y-3 p-0">
                  {pdfAnalysis.research_directions.map((d, i) => (
                    <li
                      key={i}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3"
                    >
                      <p className="m-0 text-[0.875rem] font-semibold leading-snug text-slate-900">
                        {d.question}
                      </p>
                      {d.explanation ? (
                        <p className="mt-1 mb-0 text-[0.8125rem] leading-snug text-slate-600 wrap-anywhere">
                          {d.explanation}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="mt-8" aria-labelledby="sponsor-heading">
              <h3
                id="sponsor-heading"
                className="m-0 text-[0.8125rem] font-semibold tracking-wide text-slate-800"
              >
                Fund or collaborate on this research
              </h3>
              <div className="mt-3 rounded-2xl border border-violet-200/80 bg-linear-to-br from-cyan-500/12 via-white to-violet-500/10 px-4 py-4 shadow-sm ring-1 ring-violet-500/15 sm:px-5">
                <p className="m-0 text-[0.875rem] leading-relaxed text-slate-700">
                  Support the people behind this research—whether you want to fund
                  the next steps or collaborate directly with the team.
                </p>
                <ul className="mt-3 mb-1 list-none space-y-3 p-0 text-[0.8125rem] leading-relaxed text-slate-600">
                  <li>
                    <span className="font-semibold text-slate-800">
                      Loved the work? Give something back.
                    </span>{' '}
                    If this paper or project resonated with you, you can support
                    the team as a thank-you—no strings, just a way to recognize
                    effort you believe in.
                  </li>
                  <li>
                    <span className="font-semibold text-slate-800">
                      Business or industry? Fund the next steps.
                    </span>{' '}
                    If you want to collaborate with the researchers and help them
                    continue this line of inquiry—equipment, people, or
                    follow-on studies—sponsorship can be structured as a
                    partnership so the work stays rigorous and independent.
                  </li>
                </ul>
                <p className="mt-3 mb-4 text-[0.8125rem] text-slate-500">
                  We will match you with the right path (individual support vs.
                  organizational collaboration) and keep disclosure transparent.
                </p>
                <button
                  type="button"
                  className={`${btnPrimary} w-full justify-center px-5 py-2.5 text-[0.875rem] sm:w-auto`}
                >
                  Get in touch
                </button>
              </div>
            </section>

            <section className="mt-8 pb-2" aria-labelledby="pdf-heading">
              <h3
                id="pdf-heading"
                className="m-0 text-[0.8125rem] font-semibold tracking-wide text-slate-800"
              >
                PDF preview
              </h3>
              <p className="mt-1 mb-3 text-[0.8125rem] text-slate-500">
                Read the paper in the frame below (embedded viewer for the arXiv
                PDF). Each card uses a demo arXiv id unless the catalog supplies
                one.
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-200/40 shadow-inner">
                <iframe
                  key={paperSheetPost.id}
                  title={`PDF preview for ${paperSheetPost.title}`}
                  src={arxivPdfPreviewEmbedUrl(paperSheetPost)}
                  className="h-[min(68vh,620px)] w-full min-h-[360px] bg-white"
                  allow="fullscreen"
                />
              </div>
              <p className="mt-3 mb-0 text-center text-[0.75rem] text-slate-500">
                Prefer a separate window?{' '}
                <a
                  href={arxivPdfUrl(paperSheetPost)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-800"
                >
                  Open PDF
                </a>
                {' · '}
                <a
                  href={arxivAbsUrl(paperSheetPost)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-2 hover:text-violet-800"
                >
                  arXiv abstract
                </a>
              </p>
            </section>

            {sheetRelatedPapers.length > 0 ? (
              <section
                className="mt-8 pb-2"
                aria-labelledby="related-papers-heading"
              >
                <h3
                  id="related-papers-heading"
                  className="m-0 text-[0.8125rem] font-semibold tracking-wide text-slate-800"
                >
                  Related research papers
                </h3>
                <ul className="m-0 mt-3 list-none space-y-4 border-t border-slate-100 pt-4 p-0">
                  {sheetRelatedPapers.map((rel) => (
                    <li
                      key={rel.id}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3"
                    >
                      <a
                        href={arxivAbsUrl(rel)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block no-underline"
                      >
                        <span className="text-[0.95rem] font-semibold leading-snug text-slate-900 transition-colors group-hover:text-violet-700 wrap-anywhere">
                          {rel.title}
                        </span>
                        <span className="mt-1 block text-[0.8125rem] leading-snug text-slate-500 wrap-anywhere">
                          {rel.authorLine}
                        </span>
                        <span className="mt-2 inline-block text-[0.75rem] font-medium text-violet-600 group-hover:underline">
                          View on arXiv
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    ) : null

  const newSessionModal =
    phase === 'done' && newSessionOpen ? (
      <div className="fixed inset-0 z-10001 flex items-end justify-center p-4 pb-6 sm:items-center sm:pb-4">
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
          aria-label="Close dialog"
          onClick={closeNewSessionModal}
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-20%,rgba(6,182,212,0.07),transparent_50%),radial-gradient(ellipse_80%_55%_at_100%_15%,rgba(124,58,237,0.06),transparent_45%)]"
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-session-title"
          aria-describedby="new-session-desc"
          className="relative flex max-h-[min(90vh,680px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/40 bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.28),0_0_0_1px_rgba(255,255,255,0.6)_inset] ring-1 ring-slate-200/50"
        >
          <div className="shrink-0 border-b border-slate-100/90 bg-white px-5 pt-5 pb-4">
            {newSessionStep !== 'choose' ? (
              <button
                type="button"
                onClick={() => {
                  setNewSessionStep('choose')
                  setPaperQuery('')
                  setPaperHits([])
                }}
                className="mb-3 -ml-1 flex items-center gap-1 rounded-lg px-1 py-1 text-[0.8125rem] font-medium text-violet-700 transition-colors hover:bg-violet-50"
              >
                <span aria-hidden>←</span> Back
              </button>
            ) : null}
            <p
              className={`text-[0.72rem] font-semibold tracking-[0.12em] uppercase ${gradientText}`}
            >
              Sessions
            </p>
            <h2
              id="new-session-title"
              className="font-display mt-2 text-[clamp(1.1rem,3.2vw,1.3rem)] leading-tight font-bold tracking-[-0.02em] text-heading"
            >
              {newSessionStep === 'choose'
                ? 'Start a new session'
                : 'Start from a paper'}
            </h2>
            <p
              id="new-session-desc"
              className="mt-2 text-[0.875rem] leading-relaxed text-muted"
            >
              {newSessionStep === 'choose'
                ? 'Pick how you want to seed your session—we will build a feed and collaborators around it.'
                : 'Search by title, DOI, arXiv ID, or keywords.'}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4">
            {newSessionStep === 'choose' ? (
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewSessionStep('paper')}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3.5 text-left shadow-sm transition-all hover:border-violet-200 hover:bg-slate-50/80 hover:shadow-md focus-visible:ring-2 focus-visible:ring-violet-400/50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500/15 to-violet-500/20 text-violet-700">
                    <IconPaper className="text-violet-700" />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-[0.9rem] font-semibold text-heading">
                      Search for a paper
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">
                      Find a publication to anchor recommendations and threads.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeNewSessionModal()
                    setActiveSessionId(null)
                    setMainPanel('authors')
                  }}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 py-3.5 text-left shadow-sm transition-all hover:border-violet-200 hover:bg-slate-50/80 hover:shadow-md focus-visible:ring-2 focus-visible:ring-violet-400/50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-cyan-500/15 to-violet-500/20 text-violet-700">
                    <IconAuthor className="text-violet-700" />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-[0.9rem] font-semibold text-heading">
                      Search for an author
                    </span>
                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">
                      Open author search and start a session from their graph.
                    </span>
                  </span>
                </button>
              </div>
            ) : null}

            {newSessionStep === 'paper' ? (
              <div className="flex flex-col gap-4">
                <label className="block" htmlFor="new-session-paper-q">
                  <span className="sr-only">Search papers</span>
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 shadow-inner shadow-slate-100 focus-within:ring-2 focus-within:ring-violet-400/40">
                    <input
                      id="new-session-paper-q"
                      type="search"
                      value={paperQuery}
                      onChange={(e) => setPaperQuery(e.target.value)}
                      placeholder="Title, DOI, arXiv, keywords…"
                      className="m-0 w-full border-0 bg-transparent p-0 font-inherit text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      autoComplete="off"
                    />
                  </div>
                </label>
                {paperSearchLoading ? (
                  <p className="m-0 text-xs text-slate-500">Searching…</p>
                ) : null}
                {paperHits.length > 0 ? (
                  <ul className="m-0 max-h-40 list-none space-y-1.5 overflow-y-auto p-0 [scrollbar-width:thin]">
                    {paperHits.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-left"
                      >
                        <p className="m-0 text-xs font-semibold text-slate-900 line-clamp-2">
                          {h.title}
                        </p>
                        <p className="mt-0.5 mb-0 text-[0.65rem] text-slate-500 line-clamp-1">
                          {h.authorLine} · {h.meta}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <button
                  type="button"
                  disabled={!paperQuery.trim()}
                  onClick={() => void finishNewSessionFromPaper()}
                  className={`${btnPrimary} w-full justify-center py-2.5 disabled:pointer-events-none disabled:opacity-40`}
                >
                  Start session
                </button>
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-slate-100/80 bg-white px-5 py-4">
            <button
              type="button"
              onClick={closeNewSessionModal}
              className={`${btnBase} w-full justify-center border border-border bg-white px-5 py-2.5 text-foreground shadow-sm hover:bg-canvas-muted`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    ) : null

  const showDiscoverApp = Boolean(
    authReady && authUser && phase === 'done',
  )

  return (
    <main
      className={
        showDiscoverApp
          ? 'flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-white'
          : 'flex min-h-dvh flex-col bg-white'
      }
    >
        {!authReady ? (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16"
            role="status"
            aria-live="polite"
          >
            <span
              className="size-10 rounded-full border-2 border-slate-200 border-t-violet-600 animate-spin"
              aria-hidden="true"
            />
            <p className="m-0 text-sm text-muted">Checking sign-in…</p>
          </div>
        ) : !authUser ? (
          <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-20%,rgba(6,182,212,0.08),transparent_50%),radial-gradient(ellipse_80%_55%_at_100%_15%,rgba(124,58,237,0.06),transparent_45%),radial-gradient(ellipse_60%_50%_at_0%_90%,rgba(59,130,246,0.05),transparent_45%)]"
              aria-hidden="true"
            />
            <div className="relative w-full max-w-md rounded-2xl border border-white/40 bg-white p-8 shadow-[0_24px_80px_-12px_rgba(15,23,42,0.2)] ring-1 ring-slate-200/50 sm:p-10">
              <p
                className={`m-0 text-[0.72rem] font-semibold tracking-[0.12em] uppercase ${gradientText}`}
              >
                Discover
              </p>
              <h1 className="font-display mt-2 mb-0 text-[clamp(1.25rem,3.5vw,1.5rem)] font-bold tracking-[-0.02em] text-heading">
                Please log in to continue
              </h1>
              <p className="mt-2 mb-6 text-[0.9rem] leading-relaxed text-muted">
                Sign in with Google to open your feed and choose your research
                interests.
              </p>
              {signInError ? (
                <p
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-800"
                  role="alert"
                >
                  {signInError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={signInBusy}
                onClick={handleGoogleSignIn}
                className={`${btnBase} mb-4 w-full gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-[0.95rem] font-semibold text-heading shadow-sm transition-[background-color,box-shadow] duration-150 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50`}
              >
                <svg
                  className="size-5 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {signInBusy ? 'Signing in…' : 'Continue with Google'}
              </button>
              <Link
                to="/"
                className={`${btnBase} w-full justify-center border border-border bg-white px-5 py-2.5 text-foreground shadow-sm no-underline hover:bg-canvas-muted`}
              >
                Back to home
              </Link>
            </div>
          </div>
        ) : showDiscoverApp ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden
              />
            )}
            <aside
              className={`fixed inset-y-0 left-0 z-40 flex h-full w-[280px] flex-col overflow-y-auto border-slate-200 bg-[#ececf0] shadow-xl transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:static lg:z-auto lg:h-full lg:w-[260px] lg:shrink-0 lg:translate-x-0 lg:shadow-none lg:border-r`}
              aria-label="Workspace"
            >
              <div className="flex shrink-0 items-center justify-between px-3 pt-3 pb-2">
                <MindMeshWordmark />
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 lg:hidden"
                  aria-label="Close sidebar"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col gap-1 p-2 pt-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionId(null)
                    setMainPanel((p) =>
                      p === 'discover' ? 'feed' : 'discover',
                    )
                    setSidebarOpen(false)
                  }}
                  className={`${sidebarNavBtn} ${mainPanel === 'discover' ? sidebarNavBtnActive : sidebarNavBtnIdle}`}
                >
                  <SidebarNavIconDiscover
                    className={`shrink-0 ${mainPanel === 'discover' ? 'text-violet-700' : 'text-slate-600 opacity-80'}`}
                  />
                  Discover
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionId(null)
                    setMainPanel((p) => (p === 'arxiv' ? 'discover' : 'arxiv'))
                    setSidebarOpen(false)
                  }}
                  className={`${sidebarNavBtn} ${mainPanel === 'arxiv' ? sidebarNavBtnActive : sidebarNavBtnIdle}`}
                >
                  <SidebarNavIconSearch
                    className={`shrink-0 ${mainPanel === 'arxiv' ? 'text-violet-700' : 'text-slate-600 opacity-80'}`}
                  />
                  Search arXiv
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionId(null)
                    setMainPanel((p) => (p === 'likes' ? 'discover' : 'likes'))
                    setSidebarOpen(false)
                  }}
                  className={`${sidebarNavBtn} ${mainPanel === 'likes' ? sidebarNavBtnActive : sidebarNavBtnIdle}`}
                >
                  <SidebarNavIconLikes
                    className={`shrink-0 ${mainPanel === 'likes' ? 'text-violet-700' : 'text-slate-600 opacity-80'}`}
                  />
                  My Likes
                </button>
              </div>

              <div className="mx-2 border-t border-slate-300/50" />

              <div className="flex min-h-0 flex-1 flex-col px-2 pt-2 pb-2">
                <p className="px-3 py-2 text-[0.6875rem] font-medium tracking-wide text-slate-500 uppercase">
                  Sessions
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNewSessionOpen(true)
                    setNewSessionStep('choose')
                    setPaperQuery('')
                    setPaperHits([])
                    setSidebarOpen(false)
                  }}
                  className={`${sidebarNavBtn} ${sidebarNavBtnIdle} mb-1.5 font-medium text-slate-800`}
                >
                  <IconPlus className="shrink-0 text-violet-600 opacity-90" />
                  New session
                </button>
                <ul className="m-0 flex min-h-0 list-none flex-col gap-1 overflow-y-auto px-1 py-1 [scrollbar-width:thin]">
                  {sessionsLoading ? (
                    <li className="px-3 py-2 text-xs text-slate-500">
                      Loading sessions…
                    </li>
                  ) : null}
                  {workspaceSessions.map((s) => {
                    const isActive =
                      activeSessionId === s.id && mainPanel === 'feed'
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            void joinSession(s.id)
                            setMainPanel('feed')
                            setActiveSessionId(s.id)
                            setSidebarOpen(false)
                          }}
                          className={`${sessionRowBtn} ${isActive ? sessionRowActive : ''}`}
                          title={s.meta}
                        >
                          {s.title}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div
                ref={accountMenuRef}
                className="relative mt-auto border-t border-slate-300/50 p-2"
              >
                {accountMenuOpen && authUser ? (
                  <div
                    role="menu"
                    aria-label="Account"
                    className="absolute right-0 bottom-full left-0 z-50 mb-1.5 overflow-hidden rounded-xl border border-slate-200/90 bg-white py-1 shadow-lg shadow-slate-400/20 ring-1 ring-white/90"
                  >
                    <Link
                      role="menuitem"
                      to="/profile"
                      onClick={() => setAccountMenuOpen(false)}
                      className={`${btnBase} w-full justify-start rounded-none border-0 px-3 py-2.5 text-left text-[0.8125rem] font-medium text-slate-800 no-underline hover:bg-slate-100`}
                    >
                      Profile
                    </Link>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={() => void handleLogout()}
                      className={`${btnBase} w-full justify-start rounded-none border-0 px-3 py-2.5 text-left text-[0.8125rem] font-medium text-red-700 hover:bg-red-50`}
                    >
                      Log out
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setAccountMenuOpen((o) => !o)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white/95 px-2.5 py-2 text-left shadow-md shadow-slate-300/25 ring-1 ring-white/80 transition-colors outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-violet-400/50"
                >
                  {supabaseAvatarUrl(authUser) ? (
                    <img
                      src={supabaseAvatarUrl(authUser)}
                      alt=""
                      className="size-8 shrink-0 rounded-full object-cover shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-violet-600 text-[0.65rem] font-bold text-white shadow-sm"
                      aria-hidden
                    >
                      {authUser
                        ? supabaseAccountInitials(authUser)
                        : demoProfile.initials}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-slate-800">
                    {supabaseDisplayName(authUser)?.trim() ||
                      authUser?.email?.split('@')[0] ||
                      `@${demoProfile.username}`}
                  </span>
                  <svg
                    className={`size-4 shrink-0 text-slate-500 transition-transform duration-150 ${accountMenuOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
            </aside>

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100/95">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="absolute left-3 top-3 z-20 flex size-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-white lg:hidden"
                  aria-label="Open sidebar"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="3" x2="21" y1="6" y2="6" />
                    <line x1="3" x2="21" y1="12" y2="12" />
                    <line x1="3" x2="21" y1="18" y2="18" />
                  </svg>
                </button>
                <div
                  className="pointer-events-none absolute inset-0 opacity-100"
                  aria-hidden
                  style={{
                    backgroundImage:
                      'radial-gradient(ellipse 70% 50% at 80% 20%, rgba(139,92,246,0.06), transparent), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(6,182,212,0.05), transparent)',
                  }}
                />
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  {mainPanel === 'feed' || mainPanel === 'discover' ? (
                    <div className="relative flex min-h-0 flex-1 flex-col">
                      {feedLoading ? (
                        <div
                          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/60 backdrop-blur-[2px]"
                          role="status"
                          aria-live="polite"
                        >
                          <span className="text-sm font-medium text-slate-600">
                            Updating feed…
                          </span>
                        </div>
                      ) : null}
                      <DiscoverFeedReel
                        feedWithPromos={feedWithPromos}
                        selected={selected}
                        likedPosts={likedPosts}
                        togglePostLike={togglePostLike}
                        displayedLikeCount={displayedLikeCount}
                        displayedCommentCount={displayedCommentCount}
                        commentsOpenPostId={commentsOpenPostId}
                        toggleCommentsOpen={toggleCommentsOpen}
                        commentDraftByPost={commentDraftByPost}
                        setCommentDraftByPost={setCommentDraftByPost}
                        commentExtras={commentExtras}
                        submitComment={submitComment}
                        handleCardMainClick={handleCardMainClick}
                        onOpenPaperVideo={openPaperVideo}
                        onLoadMore={handleLoadMore}
                        loadingMore={feedLoadingMore}
                        hasMore={feedHasMore}
                      />
                    </div>
                  ) : null}

                  {mainPanel === 'authors' ? <DiscoverAuthorsPanel /> : null}
                  {mainPanel === 'arxiv' ? (
                    <ArxivSearchPanel
                      selected={selected}
                      likedPosts={likedPosts}
                      togglePostLike={togglePostLike}
                      displayedLikeCount={displayedLikeCount}
                      displayedCommentCount={displayedCommentCount}
                      commentsOpenPostId={commentsOpenPostId}
                      toggleCommentsOpen={toggleCommentsOpen}
                      commentDraftByPost={commentDraftByPost}
                      setCommentDraftByPost={setCommentDraftByPost}
                      commentExtras={commentExtras}
                      submitComment={submitComment}
                      handleCardMainClick={handleCardMainClick}
                      onOpenPaperVideo={openPaperVideo}
                    />
                  ) : null}
                  {mainPanel === 'likes' ? (
                    <LikesPanel
                      likedPosts={likedPosts}
                      togglePostLike={togglePostLike}
                    />
                  ) : null}
                </div>
            </div>
          </div>
        ) : null}
        {interestsModal ? createPortal(interestsModal, document.body) : null}
        {newSessionModal
          ? createPortal(newSessionModal, document.body)
          : null}
        {paperSheetModal
          ? createPortal(paperSheetModal, document.body)
          : null}
        {videoDialogPost ? (
          <Suspense fallback={null}>
            <PaperVideoDialog
              key={videoDialogPost.id}
              post={videoDialogPost}
              onClose={() => setVideoDialogPost(null)}
            />
          </Suspense>
        ) : null}
    </main>
  )
}
