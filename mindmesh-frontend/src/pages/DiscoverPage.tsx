import {
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
  deleteSession,
  getDiscoveryFeed,
  getPersistedComments,
  getSavedInterests,
  getSessionFeed,
  getUserLikes,
  joinSession,
  listSessions,
  loadMoreFeedPapers,
  saveInterests,
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
import type { LikePaperPayload, SessionSummary } from '../api/types'
import type { FeedItem, MainPanel } from './discover/types'
import {
  IconPlus,
  MindMeshWordmark,
  SidebarNavIconDiscover,
  SidebarNavIconLikes,
  SidebarNavIconSearch,
} from './discover/icons'

function discoveryFallbackFeed(selected: Set<string>): FeedItem[] {
  return [...feedItems].sort((a, b) => {
    const ma = a.interestIds.some((id) => selected.has(id))
    const mb = b.interestIds.some((id) => selected.has(id))
    return Number(mb) - Number(ma)
  })
}

function likePaperPayloadFromFeedItem(
  post: FeedItem,
): LikePaperPayload | undefined {
  if (!post.title?.trim()) return undefined
  const authors = post.authorLine
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
  return {
    title: post.title,
    summary: (post.paperDetail ?? post.aiSummary)?.trim() || null,
    authors: authors.length > 0 ? authors : [post.authorLine || 'Unknown'],
    categories: [post.tags[0], post.tags[1]].filter(
      (t): t is string => Boolean(t),
    ),
    links: post.arxivId
      ? { abs: `https://arxiv.org/abs/${post.arxivId}` }
      : {},
    published: null,
  }
}

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
  const [newSessionName, setNewSessionName] = useState('')
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
  const commentDraftByPostRef = useRef(commentDraftByPost)
  commentDraftByPostRef.current = commentDraftByPost
  const [commentExtras, setCommentExtras] = useState<
    Record<string, { id: string; author: string; body: string }[]>
  >({})
  const [paperSheetPost, setPaperSheetPost] = useState<FeedItem | null>(null)
  const [pdfAnalysis, setPdfAnalysis] = useState<PdfAnalysisResult | null>(null)
  const [pdfAnalysisLoading, setPdfAnalysisLoading] = useState(false)

  const [workspaceSessions, setWorkspaceSessions] = useState<SessionSummary[]>(
    [],
  )
  const [discoveryFeedItems, setDiscoveryFeedItems] = useState<FeedItem[]>([])
  const [arxivLikeById, setArxivLikeById] = useState<Record<string, number>>(
    {},
  )
  const [feedLoading, setFeedLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const [feedOffset, setFeedOffset] = useState(0)
  const [feedHasMore, setFeedHasMore] = useState(true)
  const [feedLoadingMore, setFeedLoadingMore] = useState(false)

  const [sessionFeedItems, setSessionFeedItems] = useState<FeedItem[]>([])
  const [sessionFeedLoading, setSessionFeedLoading] = useState(false)
  const [sessionFeedOffset, setSessionFeedOffset] = useState(0)
  const [sessionFeedHasMore, setSessionFeedHasMore] = useState(true)
  const [sessionFeedLoadingMore, setSessionFeedLoadingMore] = useState(false)

  const activeSessionLikeCount = useMemo(() => {
    if (!activeSessionId) return 0
    return (
      workspaceSessions.find((s) => s.id === activeSessionId)?.likeCount ?? 0
    )
  }, [activeSessionId, workspaceSessions])

  const sessionRecoMode = Boolean(activeSessionId && activeSessionLikeCount > 0)

  const selectedInterestKey = useMemo(
    () => [...selected].sort().join(','),
    [selected],
  )

  const commentAuthorName =
    supabaseDisplayName(authUser)?.trim() ||
    authUser?.email?.split('@')[0] ||
    demoProfile.username

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

  const applySessionSummaries = useCallback((summaries: FeedSummaryItem[]) => {
    const map = new Map(
      summaries
        .filter((s) => s.summary && !s.error)
        .map((s) => [s.paper_id, s.summary]),
    )
    if (map.size === 0) return
    setSessionFeedItems((prev) =>
      prev.map((item) => {
        const llm = map.get(item.id)
        return llm ? { ...item, aiSummary: llm } : item
      }),
    )
  }, [])

  const togglePostLike = useCallback((post: FeedItem) => {
    const postId = post.id
    if (likeInFlightRef.current.has(postId)) return

    const prevLiked = Boolean(likedPostsRef.current[postId])
    const nextLiked = !prevLiked
    const paperForInsert = likePaperPayloadFromFeedItem(post)

    likedPostsRef.current = { ...likedPostsRef.current, [postId]: nextLiked }
    likeInFlightRef.current.add(postId)

    setLikedPosts((prev) => ({ ...prev, [postId]: nextLiked }))

    void setCardLike(
      postId,
      nextLiked,
      activeSessionId ?? undefined,
      paperForInsert,
    )
      .then((res) => {
        likedPostsRef.current = { ...likedPostsRef.current, [postId]: res.liked }
        setLikedPosts((p) => ({ ...p, [postId]: res.liked }))
        const nextLikes = (p: FeedItem) => {
          if (p.id !== postId) return p
          const n =
            typeof res.likes === 'number' && Number.isFinite(res.likes)
              ? Math.max(0, Math.trunc(res.likes))
              : Math.max(
                  0,
                  (p.likes ?? 0) +
                    (res.liked ? 1 : 0) -
                    (prevLiked ? 1 : 0),
                )
          return { ...p, likes: n }
        }
        setDiscoveryFeedItems((items) => items.map(nextLikes))
        setSessionFeedItems((items) => items.map(nextLikes))
        const sessionDelta = Number(res.liked) - Number(prevLiked)
        setWorkspaceSessions((sessions) =>
          sessions.map((s) => ({
            ...s,
            likeCount:
              s.id === activeSessionId
                ? Math.max(0, (s.likeCount ?? 0) + sessionDelta)
                : (s.likeCount ?? 0),
            papers: s.papers.map(nextLikes),
          })),
        )
        setArxivLikeById((prev) => {
          const base = prev[postId] ?? post.likes ?? 0
          const n =
            typeof res.likes === 'number' && Number.isFinite(res.likes)
              ? Math.max(0, Math.trunc(res.likes))
              : Math.max(
                  0,
                  base + (res.liked ? 1 : 0) - (prevLiked ? 1 : 0),
                )
          return { ...prev, [postId]: n }
        })
      })
      .catch(() => {
        likedPostsRef.current = { ...likedPostsRef.current, [postId]: prevLiked }
        setLikedPosts((p) => ({ ...p, [postId]: prevLiked }))
      })
      .finally(() => {
        likeInFlightRef.current.delete(postId)
      })
  }, [activeSessionId])

  const displayedLikeCount = useCallback(
    (post: FeedItem) => post.likes ?? 0,
    [],
  )

  const displayedCommentCount = useCallback((post: FeedItem) => post.comments, [])

  /** Video explainer UI is kept; LiveKit integration is not wired (avoids loading `livekit-client`). */
  const openPaperVideo = useCallback((_post: FeedItem) => {}, [])

  const toggleCommentsOpen = useCallback((postId: string) => {
    setCommentsOpenPostId((prev) => (prev === postId ? null : postId))
  }, [])

  const submitComment = useCallback(
    (postId: string) => {
      const body = (commentDraftByPostRef.current[postId] ?? '').trim()
      if (!body) return
      setCommentDraftByPost((draftState) => ({
        ...draftState,
        [postId]: '',
      }))
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
        setSessionFeedItems((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments: p.comments + 1 } : p,
          ),
        )
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

  useEffect(() => {
    if (!paperSheetPost) return
    let cancelled = false
    setPdfAnalysis(null)
    setPdfAnalysisLoading(true)
    void analyzePdf(arxivPdfUrl(paperSheetPost), paperSheetPost.title)
      .then((result) => { if (!cancelled) setPdfAnalysis(result) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPdfAnalysisLoading(false) })
    return () => { cancelled = true }
  }, [paperSheetPost])

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
    if (activeSessionId && sessionRecoMode) {
      if (
        sessionFeedLoading ||
        sessionFeedLoadingMore ||
        !sessionFeedHasMore
      )
        return
      setSessionFeedLoadingMore(true)
      try {
        const nextOffset = sessionFeedOffset + 6
        const more = await loadMoreFeedPapers(
          nextOffset,
          applySessionSummaries,
          activeSessionId,
        )
        if (more.length === 0) {
          setSessionFeedHasMore(false)
        } else {
          setSessionFeedItems((prev) => [...prev, ...more])
          setSessionFeedOffset(nextOffset)
          if (more.length < 6) setSessionFeedHasMore(false)
        }
      } catch {
        /* ignore */
      } finally {
        setSessionFeedLoadingMore(false)
      }
      return
    }
    if (activeSessionId) return
    if (feedLoading || feedLoadingMore || !feedHasMore) return
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
  }, [
    activeSessionId,
    sessionRecoMode,
    sessionFeedLoading,
    sessionFeedLoadingMore,
    sessionFeedHasMore,
    sessionFeedOffset,
    applySessionSummaries,
    feedLoading,
    feedLoadingMore,
    feedHasMore,
    feedOffset,
    applySummaries,
  ])

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
    setArxivLikeById({})
    setFeedOffset(0)
    setFeedHasMore(true)
    setFeedLoadingMore(false)
    setSessionFeedItems([])
    setSessionFeedLoading(false)
    setSessionFeedOffset(0)
    setSessionFeedHasMore(true)
    setSessionFeedLoadingMore(false)
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
      setDiscoveryFeedItems(discoveryFallbackFeed(selected))
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
        const nextFeed =
          feed.length > 0 ? feed : discoveryFallbackFeed(selected)
        setDiscoveryFeedItems(nextFeed)
        setFeedOffset(0)
        setFeedHasMore(nextFeed.length >= 6)
        setWorkspaceSessions(list)
        setLikedPosts(likesMap)
        setCommentExtras(commentsMap)
      } catch {
        if (!cancelled) {
          setDiscoveryFeedItems(discoveryFallbackFeed(selected))
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

  useEffect(() => {
    if (!activeSessionId) {
      setSessionFeedItems([])
      setSessionFeedOffset(0)
      setSessionFeedHasMore(true)
      setSessionFeedLoadingMore(false)
      setSessionFeedLoading(false)
      return
    }
    if (!sessionRecoMode) {
      setSessionFeedItems([])
      setSessionFeedOffset(0)
      setSessionFeedHasMore(true)
      setSessionFeedLoadingMore(false)
      setSessionFeedLoading(false)
      return
    }
    if (!authReady || !authUser || phase !== 'done') return

    let cancelled = false
    void (async () => {
      setSessionFeedLoading(true)
      try {
        const items = await getSessionFeed(activeSessionId, (summaries) => {
          if (!cancelled) applySessionSummaries(summaries)
        })
        if (cancelled) return
        setSessionFeedItems(items)
        setSessionFeedOffset(0)
        setSessionFeedHasMore(items.length >= 6)
      } catch {
        if (!cancelled) {
          setSessionFeedItems([])
          setSessionFeedHasMore(false)
        }
      } finally {
        if (!cancelled) setSessionFeedLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    activeSessionId,
    sessionRecoMode,
    authReady,
    authUser,
    phase,
    applySessionSummaries,
  ])

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
    setNewSessionName('')
  }, [])

  const finishNewSession = useCallback(async () => {
    const name = newSessionName.trim()
    if (!name) return
    try {
      const res = await createSession({
        source: 'paper',
        title: name,
      })
      const created = res.session
      const list = await listSessions()
      const merged = list.some((s) => s.id === created.id)
        ? list.map((s) =>
            s.id === created.id ? { ...s, papers: created.papers } : s,
          )
        : [{ ...created, likeCount: created.likeCount ?? 0 }, ...list]
      setWorkspaceSessions(merged)
      setActiveSessionId(created.id)
      setMainPanel('feed')
    } catch {
      /* ignore */
    }
    closeNewSessionModal()
  }, [closeNewSessionModal, newSessionName])

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSession(sessionId)
        setWorkspaceSessions((prev) => prev.filter((s) => s.id !== sessionId))
        if (activeSessionId === sessionId) {
          setActiveSessionId(null)
          setMainPanel('discover')
          setSessionFeedItems([])
          setSessionFeedOffset(0)
          setSessionFeedHasMore(true)
          setSessionFeedLoading(false)
          setSessionFeedLoadingMore(false)
        }
      } catch {
        /* ignore */
      }
    },
    [activeSessionId],
  )

  const prioritizedFeed = useMemo(() => {
    if (discoveryFeedItems.length > 0) {
      return [...discoveryFeedItems]
    }
    return discoveryFallbackFeed(selected)
  }, [discoveryFeedItems, selected])

  const relatedPaperPool = useMemo(() => {
    const byId = new Map<string, FeedItem>()
    for (const p of feedItems) byId.set(p.id, p)
    for (const p of discoveryFeedItems) byId.set(p.id, p)
    for (const p of sessionFeedItems) byId.set(p.id, p)
    for (const s of workspaceSessions) {
      for (const p of s.papers) {
        byId.set(p.id, p)
      }
    }
    return [...byId.values()]
  }, [discoveryFeedItems, workspaceSessions, sessionFeedItems])

  const sessionFeedWithPromos = useMemo(() => {
    const selectedKey = [...selected].sort().join(',')
    const feedKey = sessionFeedItems.map((p) => p.id).join(',')
    const seed = `session-reco|${activeSessionId ?? ''}|${selectedKey}|${feedKey}`
    let primaryInterestLabel = 'Research'
    for (const item of INTERESTS) {
      if (selected.has(item.id)) {
        primaryInterestLabel = item.label
        break
      }
    }
    return interleaveFeedPromos(
      sessionFeedItems,
      primaryInterestLabel,
      seed,
    )
  }, [sessionFeedItems, selected, activeSessionId])

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
                <div className="mt-2 space-y-2.5 text-[0.9rem] leading-relaxed text-slate-700">
                  {paperDetailText(paperSheetPost)
                    .split('\n\n')
                    .map((para, i) => (
                      <p key={`pd-${paperSheetPost.id}-${i}`} className="m-0 wrap-anywhere">
                        {para}
                      </p>
                    ))}
                </div>
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
            <p
              className={`text-[0.72rem] font-semibold tracking-[0.12em] uppercase ${gradientText}`}
            >
              Sessions
            </p>
            <h2
              id="new-session-title"
              className="font-display mt-2 text-[clamp(1.1rem,3.2vw,1.3rem)] leading-tight font-bold tracking-[-0.02em] text-heading"
            >
              New session
            </h2>
            <p
              id="new-session-desc"
              className="mt-2 text-[0.875rem] leading-relaxed text-muted"
            >
              Name your session. A session is a separate workspace tailored to
              a specific topic or search flow.
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4">
            <label className="block" htmlFor="new-session-name-input">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">
                Session name
              </span>
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 shadow-inner shadow-slate-100 focus-within:ring-2 focus-within:ring-violet-400/40">
                <input
                  id="new-session-name-input"
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g. Diffusion models reading group"
                  className="m-0 w-full border-0 bg-transparent p-0 font-inherit text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </label>
            <button
              type="button"
              disabled={!newSessionName.trim()}
              onClick={() => void finishNewSession()}
              className={`${btnPrimary} mt-4 w-full justify-center py-2.5 disabled:pointer-events-none disabled:opacity-40`}
            >
              Create and open
            </button>
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
                    setNewSessionName('')
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
                      <li key={s.id} className="flex min-w-0 items-stretch gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            void joinSession(s.id)
                            setMainPanel('feed')
                            setActiveSessionId(s.id)
                            setSidebarOpen(false)
                          }}
                          className={`${sessionRowBtn} min-w-0 flex-1 ${isActive ? sessionRowActive : ''}`}
                          title={s.meta}
                        >
                          {s.title}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            void handleDeleteSession(s.id)
                          }}
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete session: ${s.title}`}
                          title="Delete session"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" />
                            <line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
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
                  {mainPanel === 'feed' && activeSessionId ? (
                    <ArxivSearchPanel
                      key={activeSessionId}
                      selected={selected}
                      likedPosts={likedPosts}
                      likeCountsByPaperId={arxivLikeById}
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
                      searchInputAutoFocus={!sessionRecoMode}
                      sessionFeedLoading={
                        sessionRecoMode && sessionFeedLoading
                      }
                      idleContent={
                        sessionRecoMode ? (
                          <div className="flex min-h-0 flex-1 flex-col">
                            <DiscoverFeedReel
                              feedWithPromos={sessionFeedWithPromos}
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
                              loadingMore={sessionFeedLoadingMore}
                              hasMore={sessionFeedHasMore}
                            />
                          </div>
                        ) : undefined
                      }
                    />
                  ) : null}

                  {mainPanel === 'discover' ||
                  (mainPanel === 'feed' && !activeSessionId) ? (
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
                        loadingMore={
                          activeSessionId
                            ? sessionFeedLoadingMore
                            : feedLoadingMore
                        }
                        hasMore={
                          activeSessionId ? sessionFeedHasMore : feedHasMore
                        }
                      />
                    </div>
                  ) : null}

                  {mainPanel === 'authors' ? <DiscoverAuthorsPanel /> : null}
                  {mainPanel === 'arxiv' ? (
                    <ArxivSearchPanel
                      selected={selected}
                      likedPosts={likedPosts}
                      likeCountsByPaperId={arxivLikeById}
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
    </main>
  )
}
