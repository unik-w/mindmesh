import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type SetStateAction,
} from 'react'
import {
  fetchFeedSummaries,
  loadMoreArxivResults,
  searchArxiv,
} from '../../api'
import type { ArxivPaper } from '../../api'
import { citationsForDemoId } from './data'
import { DiscoverFeedReel } from './DiscoverFeedReel'
import type { FeedItem, ReelItem } from './types'

const PAGE_SIZE = 6

function arxivPaperToFeedItem(paper: ArxivPaper): FeedItem {
  const authorLine = paper.authors.length
    ? paper.authors.join(', ')
    : 'Unknown authors'

  const idMatch = paper.id.match(/(\d{4}\.\d{4,5})(v\d+)?$/)
  const arxivId = idMatch ? idMatch[1] : undefined

  const metaParts: string[] = []
  if (paper.categories.length)
    metaParts.push(paper.categories.slice(0, 2).join(' · '))
  if (paper.published) {
    const d = new Date(paper.published)
    if (!Number.isNaN(d.getTime()))
      metaParts.push(
        d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      )
  }

  const tags: readonly [string, string] =
    paper.categories.length >= 2
      ? [paper.categories[0]!, paper.categories[1]!]
      : paper.categories.length === 1
        ? [paper.categories[0]!, paper.categories[0]!]
        : ['Research', 'Paper']

  return {
    id: paper.id,
    interestIds: [],
    authorLine,
    title: paper.title,
    meta: metaParts.join(' · ') || 'arXiv Paper',
    aiSummary: paper.summary || '',
    stats: { saves: 0, thread: 0 },
    tags,
    citations: citationsForDemoId(paper.id),
    likes: 0,
    comments: 0,
    arxivId,
    paperDetail: paper.summary || undefined,
  }
}

export type ArxivSearchPanelProps = {
  selected: Set<string>
  likedPosts: Record<string, boolean>
  togglePostLike: (post: FeedItem) => void
  /** Merged into arXiv result cards (Discover parent keeps counts after like/unlike). */
  likeCountsByPaperId?: Record<string, number>
  displayedLikeCount: (post: FeedItem) => number
  displayedCommentCount: (post: FeedItem) => number
  commentsOpenPostId: string | null
  toggleCommentsOpen: (postId: string) => void
  commentDraftByPost: Record<string, string>
  setCommentDraftByPost: Dispatch<SetStateAction<Record<string, string>>>
  commentExtras: Record<string, { id: string; author: string; body: string }[]>
  submitComment: (postId: string) => void
  handleCardMainClick: (
    e: ReactMouseEvent<HTMLDivElement>,
    post: FeedItem,
  ) => void
  onOpenPaperVideo?: (post: FeedItem) => void
  /** Shown below the search bar when the user has not run an arXiv search (e.g. session recommendations). */
  idleContent?: ReactNode
  /** Session recommendation feed loading; shown as a single overlay (hidden while an arXiv search is in flight). */
  sessionFeedLoading?: boolean
  /** Defaults to true; set false when idle content should keep focus (e.g. recommendation reel). */
  searchInputAutoFocus?: boolean
}

export function ArxivSearchPanel({
  selected,
  likedPosts,
  togglePostLike,
  displayedLikeCount,
  displayedCommentCount,
  commentsOpenPostId,
  toggleCommentsOpen,
  commentDraftByPost,
  setCommentDraftByPost,
  commentExtras,
  submitComment,
  handleCardMainClick,
  onOpenPaperVideo,
  idleContent,
  sessionFeedLoading = false,
  searchInputAutoFocus = true,
  likeCountsByPaperId = {},
}: ArxivSearchPanelProps) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [papers, setPapers] = useState<ArxivPaper[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  // LLM summaries keyed by paper id
  const [llmSummaries, setLlmSummaries] = useState<Record<string, string>>({})

  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const arxivStartRef = useRef(0)
  const dbOffsetRef = useRef(0)
  const seedPapersRef = useRef<{ title: string; summary: string }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeQueryRef = useRef('')

  function requestLlmSummaries(batch: ArxivPaper[]) {
    if (batch.length === 0) return
    // The /llm/feed-summary endpoint accepts max 6 papers at a time
    const chunks: ArxivPaper[][] = []
    for (let i = 0; i < batch.length; i += 6) {
      chunks.push(batch.slice(i, i + 6))
    }
    for (const chunk of chunks) {
      void fetchFeedSummaries(
        chunk.map((p) => ({
          id: p.id,
          title: p.title,
          summary: p.summary ?? null,
          authors: p.authors ?? [],
          categories: p.categories ?? [],
          links: p.links ?? null,
          published: p.published ?? null,
        })),
      ).then((summaries) => {
        const newMap: Record<string, string> = {}
        for (const s of summaries) {
          if (s.summary && !s.error) newMap[s.paper_id] = s.summary
        }
        if (Object.keys(newMap).length > 0) {
          setLlmSummaries((prev) => ({ ...prev, ...newMap }))
        }
      })
    }
  }

  function resetFeed() {
    setPapers([])
    setTotal(null)
    setSearched(false)
    setError(null)
    setHasMore(false)
    setLoadingMore(false)
    setLlmSummaries({})
    arxivStartRef.current = 0
    dbOffsetRef.current = 0
    seedPapersRef.current = []
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) {
      resetFeed()
      return
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(val.trim())
    }, 350)
  }

  async function runSearch(q: string) {
    activeQueryRef.current = q
    resetFeed()
    setLoading(true)
    try {
      const res = await searchArxiv(q, 0, PAGE_SIZE * 2)
      if (activeQueryRef.current !== q) return
      setPapers(res.papers)
      setTotal(res.total_results)
      setSearched(true)
      seedPapersRef.current = res.papers.slice(0, 5).map((p) => ({
        title: p.title,
        summary: p.summary,
      }))
      arxivStartRef.current = res.papers.length
      dbOffsetRef.current = 0
      setHasMore(res.total_results > res.papers.length)
      requestLlmSummaries(res.papers)
    } catch {
      if (activeQueryRef.current !== q) return
      setError('Search failed — check your connection or try again.')
    } finally {
      if (activeQueryRef.current === q) setLoading(false)
    }
  }

  const handleLoadMore = useCallback(async () => {
    const q = activeQueryRef.current
    if (!q || loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await loadMoreArxivResults({
        q,
        arxivStart: arxivStartRef.current,
        dbOffset: dbOffsetRef.current,
        pageSize: PAGE_SIZE,
        seedPapers: seedPapersRef.current,
      })
      if (activeQueryRef.current !== q) return
      if (res.papers.length === 0) {
        setHasMore(false)
        return
      }
      arxivStartRef.current = res.arxiv_start
      dbOffsetRef.current = res.db_offset
      const newPapers = res.papers.filter(
        (p) => !papers.some((ex) => ex.id === p.id),
      )
      setPapers((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...res.papers.filter((p) => !seen.has(p.id))]
      })
      if (res.source === 'arxiv' && res.total_results !== undefined) {
        setHasMore(res.arxiv_start < res.total_results)
      }
      requestLlmSummaries(newPapers)
    } catch {
      /* user can scroll again */
    } finally {
      if (activeQueryRef.current === q) setLoadingMore(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, papers])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    void runSearch(q)
  }

  const feedItems = useMemo(() => {
    return papers.map((p) => {
      const item = arxivPaperToFeedItem(p)
      const n = likeCountsByPaperId[p.id]
      if (typeof n === 'number' && Number.isFinite(n)) item.likes = Math.max(0, n)
      const llm = llmSummaries[p.id]
      if (llm) item.aiSummary = llm
      return item
    })
  }, [papers, llmSummaries, likeCountsByPaperId])

  const reelItems: ReelItem[] = useMemo(
    () => feedItems.map((post) => ({ kind: 'paper' as const, post })),
    [feedItems],
  )

  const showReel = !loading && searched && papers.length > 0
  const hasIdleSlot = idleContent != null

  const sessionFeedBusyOverlay =
    hasIdleSlot && sessionFeedLoading && !loading ? (
      <div
        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-100/60 backdrop-blur-[2px]"
        role="status"
        aria-live="polite"
      >
        <span className="text-sm font-medium text-slate-600">
          Updating feed…
        </span>
      </div>
    ) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-sm">
        <form
          className="mx-auto flex max-w-[420px] gap-2"
          onSubmit={handleSubmit}
          role="search"
          aria-label="arXiv search"
        >
          <label className="sr-only" htmlFor="arxiv-search-input">
            Search arXiv
          </label>
          <div className="min-w-0 flex-1 rounded-xl border border-slate-200/90 bg-white px-3 py-2 shadow-inner shadow-slate-100 focus-within:ring-2 focus-within:ring-violet-400/40">
            <input
              id="arxiv-search-input"
              type="search"
              value={query}
              onChange={handleChange}
              className="m-0 w-full border-0 bg-transparent p-0 font-inherit text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="Search anything on arXiv…"
              autoComplete="off"
              autoFocus={searchInputAutoFocus}
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-40"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
        {error ? (
          <p
            className="mx-auto mt-2 max-w-[420px] rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[0.8125rem] text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {loading ? (
          hasIdleSlot ? (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="pointer-events-none min-h-0 flex-1 opacity-45 select-none">
                {idleContent}
              </div>
              <div
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100/55 backdrop-blur-[2px]"
                role="status"
              >
                <div className="flex flex-col items-center gap-2">
                  <span
                    className="size-8 rounded-full border-2 border-slate-200 border-t-violet-600 animate-spin"
                    aria-hidden
                  />
                  <span className="text-sm font-medium text-slate-600">
                    Searching arXiv…
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center" role="status">
              <div className="flex flex-col items-center gap-2">
                <span
                  className="size-8 rounded-full border-2 border-slate-200 border-t-violet-600 animate-spin"
                  aria-hidden
                />
                <span className="text-sm font-medium text-slate-500">
                  Searching arXiv…
                </span>
              </div>
            </div>
          )
        ) : null}

        {!loading && searched && total === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4">
            <p className="text-sm text-slate-500">
              No results found — try a different query.
            </p>
          </div>
        ) : null}

        {showReel ? (
          <DiscoverFeedReel
            feedWithPromos={reelItems}
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
            onOpenPaperVideo={onOpenPaperVideo}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
            hasMore={hasMore}
          />
        ) : null}

        {!loading && !searched ? (
          hasIdleSlot ? (
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {idleContent}
              </div>
              {sessionFeedBusyOverlay}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4">
              <div className="max-w-xs text-center">
                <p className="m-0 text-[0.9375rem] font-medium text-slate-500">
                  Search anything on arXiv
                </p>
                <p className="mt-1 mb-0 text-[0.8125rem] text-slate-400">
                  Topics, titles, author names, arXiv IDs, or URLs
                </p>
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
