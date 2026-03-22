import { useCallback, useEffect, useState } from 'react'
import { getUserLikedPapers, type LikedPaper } from '../../api'
import { HeartIcon } from './icons'
import type { FeedItem } from './types'

type Props = {
  likedPosts: Record<string, boolean>
  togglePostLike: (post: FeedItem) => void
}

function likedPaperAsFeedItem(p: LikedPaper): FeedItem {
  return {
    id: p.id,
    interestIds: [],
    authorLine: p.authorLine,
    title: p.title,
    meta: '',
    aiSummary: '',
    stats: { saves: 0, thread: 0 },
    tags: ['Research', 'Paper'] as const,
    citations: 0,
    likes: 0,
    comments: 0,
  }
}

export function LikesPanel({ likedPosts, togglePostLike }: Props) {
  const [papers, setPapers] = useState<LikedPaper[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getUserLikedPapers()
      .then((data) => {
        if (!cancelled) setPapers(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleUnlike = useCallback(
    (paper: LikedPaper) => {
      togglePostLike(likedPaperAsFeedItem(paper))
      setPapers((prev) => prev.filter((p) => p.id !== paper.id))
    },
    [togglePostLike],
  )

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <span className="text-sm text-slate-500">Loading liked papers…</span>
      </div>
    )
  }

  if (papers.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-300"
          aria-hidden
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <p className="text-sm font-medium text-slate-500">
          No liked papers yet
        </p>
        <p className="text-xs text-slate-400">
          Like papers from your feed and they will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-slate-200/80 px-5 py-4">
        <h2 className="m-0 text-[0.9375rem] font-semibold text-slate-800">
          My Likes
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {papers.length} paper{papers.length !== 1 ? 's' : ''}
        </p>
      </div>
      <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0 [scrollbar-width:thin]">
        {papers.map((paper) => (
          <li
            key={paper.id}
            className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5 transition-colors hover:bg-slate-50/60"
          >
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[0.8125rem] font-semibold leading-snug text-slate-900 wrap-anywhere">
                {paper.title}
              </p>
              <p className="m-0 mt-1 text-[0.75rem] leading-snug text-slate-500 wrap-anywhere">
                {paper.authorLine}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleUnlike(paper)}
              className="mt-0.5 flex shrink-0 items-center justify-center rounded-full p-1.5 transition-colors hover:bg-rose-50"
              aria-label={`Unlike ${paper.title}`}
              title="Remove like"
            >
              <HeartIcon
                filled={likedPosts[paper.id] !== false}
                className="!text-rose-500"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
