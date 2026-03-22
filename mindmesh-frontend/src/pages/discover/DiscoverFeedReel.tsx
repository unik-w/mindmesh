import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from 'react'
import { btnPrimary, gradientText } from '../../uiClasses'
import { formatCount } from './format'
import type { FeedItem, ReelItem } from './types'
import { HeartIcon, UserCircleIcon } from './icons'

export type DiscoverFeedReelProps = {
  feedWithPromos: ReelItem[]
  selected: Set<string>
  likedPosts: Record<string, boolean>
  togglePostLike: (postId: string) => void
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
  onLoadMore?: () => void
  loadingMore?: boolean
  hasMore?: boolean
}

export function DiscoverFeedReel({
  feedWithPromos,
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
  onLoadMore,
  loadingMore,
  hasMore,
}: DiscoverFeedReelProps) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const prefetchTriggered = useRef(false)

  // Reset the prefetch guard whenever new items arrive so the next
  // batch can be triggered as the user keeps scrolling.
  useEffect(() => {
    prefetchTriggered.current = false
  }, [feedWithPromos.length])

  const PREFETCH_OFFSET = 3
  const triggerIndex = feedWithPromos.length - PREFETCH_OFFSET

  const prefetchRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
      if (!node || !onLoadMore || !hasMore) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0]?.isIntersecting &&
            !loadingMore &&
            !prefetchTriggered.current
          ) {
            prefetchTriggered.current = true
            onLoadMore()
          }
        },
        { rootMargin: '200px' },
      )
      observerRef.current.observe(node)
    },
    [onLoadMore, hasMore, loadingMore],
  )

  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      aria-label="Research feed"
    >
      <h1 className="sr-only">Research feed</h1>
      <div
        className="min-h-0 flex-1 basis-0 snap-y snap-mandatory overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] touch-pan-y"
        tabIndex={0}
        role="region"
        aria-label="Paper reels—scroll up or down; occasional conference and job cards may appear between papers"
      >
        {feedWithPromos.map((item, idx) => {
        const isPrefetchTrigger = idx === triggerIndex && hasMore
        if (item.kind === 'conference') {
          return (
            <article
              key={item.id}
              ref={isPrefetchTrigger ? prefetchRef : undefined}
              className="flex min-h-full snap-start snap-always shrink-0 flex-col justify-center px-4 py-3"
            >
              <div className="relative mx-auto flex h-[min(88dvh,700px)] w-full max-w-[420px] shrink-0 flex-col overflow-hidden rounded-[1.25rem] border border-violet-200/90 bg-linear-to-br from-white via-violet-50/50 to-cyan-50/40 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] ring-1 ring-violet-100/80 backdrop-blur-sm">
                <div
                  className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute bottom-1/3 -left-12 h-32 w-32 rounded-full bg-cyan-400/18 blur-3xl"
                  aria-hidden
                />
                <div className="relative z-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="min-h-0 flex-1 overflow-y-hidden lg:overflow-y-auto lg:overscroll-y-contain px-5 pt-5 pb-4 lg:[scrollbar-width:thin]">
                    <p
                      className={`m-0 text-[0.68rem] font-semibold tracking-[0.14em] uppercase ${gradientText}`}
                    >
                      Nearby research event
                    </p>
                    <h2 className="mt-3 mb-0 text-pretty text-[1.2rem] leading-[1.22] font-bold tracking-tight text-slate-900 sm:text-[1.35rem] sm:leading-[1.2]">
                      {item.title}
                    </h2>
                    <p className="mt-2 mb-0 text-[0.8125rem] font-medium text-slate-600">
                      {item.when}
                    </p>
                    <p className="mt-1 mb-0 text-[0.8125rem] text-slate-500">
                      {item.venue}
                    </p>
                    <div
                      className="mt-5 rounded-xl border border-violet-200/70 bg-white/90 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-violet-100/60"
                      aria-label="Event details"
                    >
                      <p className="m-0 text-[0.9rem] leading-[1.58] text-slate-700 wrap-anywhere">
                        {item.blurb}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-2 shrink-0 border-t border-violet-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[0.75rem] font-medium text-slate-500">
                        Promoted · conferences near you
                      </span>
                      <button
                        type="button"
                        className={`${btnPrimary} px-4 py-2 text-[0.8125rem]`}
                      >
                        Save to calendar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )
        }
        if (item.kind === 'job') {
          return (
            <article
              key={item.id}
              ref={isPrefetchTrigger ? prefetchRef : undefined}
              className="flex min-h-full snap-start snap-always shrink-0 flex-col justify-center px-4 py-3"
            >
              <div className="relative mx-auto flex h-[min(88dvh,700px)] w-full max-w-[420px] shrink-0 flex-col overflow-hidden rounded-[1.25rem] border border-slate-200/90 bg-linear-to-br from-white via-slate-50/80 to-cyan-50/30 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] ring-1 ring-slate-100/80 backdrop-blur-sm">
                <div
                  className="pointer-events-none absolute -top-12 right-8 h-36 w-36 rounded-full bg-cyan-400/15 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute bottom-1/4 -left-10 h-28 w-28 rounded-full bg-slate-400/10 blur-3xl"
                  aria-hidden
                />
                <div className="relative z-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <div className="min-h-0 flex-1 overflow-y-hidden lg:overflow-y-auto lg:overscroll-y-contain px-5 pt-5 pb-4 lg:[scrollbar-width:thin]">
                    <p
                      className={`m-0 text-[0.68rem] font-semibold tracking-[0.14em] uppercase ${gradientText}`}
                    >
                      Hiring spotlight
                    </p>
                    <p className="mt-3 mb-0 text-[0.8125rem] font-semibold text-slate-600">
                      {item.company}
                    </p>
                    <h2 className="mt-1 mb-0 text-pretty text-[1.15rem] leading-tight font-bold tracking-tight text-slate-900 sm:text-[1.28rem]">
                      {item.role}
                    </h2>
                    <p className="mt-2 mb-0 text-[0.8125rem] text-slate-500">
                      {item.location}
                    </p>
                    <p className="mt-3 mb-0 text-[0.78rem] font-medium text-slate-600">
                      Looking for someone strong in:{' '}
                      <span className="text-violet-700">
                        {item.categoryLine}
                      </span>
                    </p>
                    <div
                      className="mt-5 rounded-xl border border-slate-200/85 bg-white/95 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-slate-100/70"
                      aria-label="Role summary"
                    >
                      <p className="m-0 text-[0.9rem] leading-[1.58] text-slate-700 wrap-anywhere">
                        {item.blurb}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-2 shrink-0 border-t border-slate-200/85 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[0.75rem] font-medium text-slate-500">
                        Promoted · matched to your interests
                      </span>
                      <button
                        type="button"
                        className={`${btnPrimary} px-4 py-2 text-[0.8125rem]`}
                      >
                        View role
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )
        }
        const post = item.post
        const matched = post.interestIds.some((id) =>
          selected.has(id),
        )
        return (
          <article
            key={post.id}
            ref={isPrefetchTrigger ? prefetchRef : undefined}
            className="flex min-h-full snap-start snap-always shrink-0 flex-col justify-center px-4 py-3"
          >
            <div className="relative mx-auto flex h-[min(88dvh,700px)] w-full max-w-[420px] shrink-0 flex-col overflow-hidden rounded-[1.25rem] border border-slate-200/90 bg-white/95 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.12)] ring-1 ring-slate-100/80 backdrop-blur-sm">
              <div
                className="pointer-events-none absolute -top-16 right-0 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute bottom-1/3 -left-12 h-32 w-32 rounded-full bg-cyan-400/12 blur-3xl"
                aria-hidden
              />
              <div className="relative z-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <div
                  className="min-h-0 min-w-0 flex-1 cursor-pointer overflow-y-hidden lg:overflow-y-auto lg:overscroll-y-contain lg:[scrollbar-width:thin]"
                  onClick={(e) => handleCardMainClick(e, post)}
                >
                  <div className="relative px-5 pt-3 pb-3 sm:pt-3.5">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <h2 className="m-0 min-w-0 flex-1 text-pretty text-[1.2rem] leading-[1.22] font-bold tracking-tight text-slate-900 wrap-anywhere sm:text-[1.35rem] sm:leading-[1.2]">
                        <span className="line-clamp-6 sm:line-clamp-5">
                          {post.title}
                        </span>
                      </h2>
                      <button
                        type="button"
                        className="-mr-1 -mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                        aria-label={
                          matched
                            ? 'More options (recommended for you)'
                            : 'More options'
                        }
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <circle cx="5" cy="12" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="19" cy="12" r="2" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2.5 flex min-w-0 items-start gap-2.5">
                      <div
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-violet-600 text-white shadow-md shadow-violet-500/20"
                        aria-hidden
                      >
                        <UserCircleIcon className="size-[15px]" />
                      </div>
                      <p
                        className="m-0 min-w-0 flex-1 text-[0.8125rem] leading-snug text-slate-500"
                        title={post.authorLine}
                      >
                        <span className="line-clamp-4 wrap-anywhere">
                          {post.authorLine}
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="max-w-full truncate rounded-full border border-slate-200/90 bg-slate-100/90 px-3 py-1.5 text-[0.7rem] font-medium text-slate-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className="relative mx-4 mb-3 mt-0 max-h-[min(440px,58svh)] overflow-y-hidden lg:overflow-y-auto rounded-xl border border-slate-200/85 bg-linear-to-b from-slate-50/98 to-white px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-slate-100/70 [scrollbar-width:thin]"
                    aria-label="AI-generated summary"
                  >
                    <p
                      className={`m-0 text-[0.68rem] font-semibold tracking-[0.14em] uppercase ${gradientText}`}
                    >
                      AI summary
                    </p>
                    <div className="mt-2.5 space-y-2.5 text-[0.9rem] leading-[1.58] text-slate-700">
                      {post.aiSummary
                        .split('\n\n')
                        .map((para, i) => (
                          <p
                            key={`${post.id}-s-${i}`}
                            className="m-0 text-pretty wrap-anywhere"
                          >
                            {para}
                          </p>
                        ))}
                    </div>
                  </div>
                  {commentsOpenPostId === post.id ? (
                    <div
                      id={`comments-panel-${post.id}`}
                      role="region"
                      aria-labelledby={`comments-heading-${post.id}`}
                      className="border-t border-slate-100 px-5 pb-4"
                    >
                      <p
                        id={`comments-heading-${post.id}`}
                        className="m-0 text-[0.68rem] font-semibold tracking-wide text-slate-500 uppercase"
                      >
                        Comments
                      </p>
                      <ul className="mt-2.5 mb-3 max-h-36 list-none space-y-2.5 overflow-y-auto p-0 [scrollbar-width:thin]">
                        {(commentExtras[post.id] ?? []).length ===
                        0 ? (
                          <li className="text-[0.8125rem] text-slate-500">
                            No comments yet—say something
                            below.
                          </li>
                        ) : null}
                        {(commentExtras[post.id] ?? []).map(
                          (c) => (
                            <li
                              key={c.id}
                              className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                            >
                              <p className="m-0 text-[0.7rem] font-semibold text-violet-700">
                                @{c.author}
                              </p>
                              <p className="mt-1 mb-0 text-[0.8125rem] leading-snug text-slate-700 wrap-anywhere">
                                {c.body}
                              </p>
                            </li>
                          ),
                        )}
                      </ul>
                      <form
                        className="flex flex-col gap-2"
                        onSubmit={(e) => {
                          e.preventDefault()
                          submitComment(post.id)
                        }}
                      >
                        <label
                          className="sr-only"
                          htmlFor={`comment-${post.id}`}
                        >
                          Write a comment
                        </label>
                        <textarea
                          id={`comment-${post.id}`}
                          rows={2}
                          value={
                            commentDraftByPost[post.id] ?? ''
                          }
                          onChange={(e) =>
                            setCommentDraftByPost((p) => ({
                              ...p,
                              [post.id]: e.target.value,
                            }))
                          }
                          placeholder="Write a comment…"
                          className="resize-none rounded-lg border border-slate-200/90 bg-white px-3 py-2 font-inherit text-[0.8125rem] text-slate-900 outline-none ring-violet-400/40 placeholder:text-slate-400 focus:ring-2"
                        />
                        <button
                          type="submit"
                          className={`${btnPrimary} self-end px-4 py-2 text-[0.8125rem]`}
                        >
                          Post
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
                <div className="relative z-2 shrink-0 border-t border-slate-200/85 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_-14px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <span className="min-w-0 text-[0.8125rem] font-medium text-slate-800">
                      {formatCount(post.citations)}{' '}
                      Citations
                    </span>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                      <button
                        type="button"
                        aria-pressed={Boolean(
                          likedPosts[post.id],
                        )}
                        aria-label={
                          likedPosts[post.id]
                            ? 'Unlike'
                            : 'Like'
                        }
                        onClick={() =>
                          togglePostLike(post.id)
                        }
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.8125rem] transition-colors ${
                          likedPosts[post.id]
                            ? 'text-rose-600'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <HeartIcon
                          filled={Boolean(
                            likedPosts[post.id],
                          )}
                        />
                        <span className="tabular-nums">
                          {formatCount(
                            displayedLikeCount(post),
                          )}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-expanded={
                          commentsOpenPostId === post.id
                        }
                        aria-controls={`comments-panel-${post.id}`}
                        id={`comments-trigger-${post.id}`}
                        onClick={() =>
                          toggleCommentsOpen(post.id)
                        }
                        className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.8125rem] transition-colors ${
                          commentsOpenPostId === post.id
                            ? 'bg-violet-50 text-violet-800'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
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
                          className={`shrink-0 ${commentsOpenPostId === post.id ? 'text-violet-600' : 'text-slate-400'}`}
                          aria-hidden
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="tabular-nums">
                          {formatCount(
                            displayedCommentCount(post),
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        )
        })}
        {loadingMore ? (
          <div
            className="flex min-h-[120px] snap-start items-center justify-center py-6"
            aria-hidden="true"
          >
            <div className="flex flex-col items-center gap-2">
              <span
                className="size-8 rounded-full border-2 border-slate-200 border-t-violet-600 animate-spin"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-slate-500">
                Loading more papers…
              </span>
            </div>
          </div>
        ) : null}
        {!hasMore && feedWithPromos.length > 0 ? (
          <div className="flex min-h-[80px] snap-start items-center justify-center py-6">
            <span className="text-xs font-medium text-slate-400">
              You've reached the end of your feed
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
