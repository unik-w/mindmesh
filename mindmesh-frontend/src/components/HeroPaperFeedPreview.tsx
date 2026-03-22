import { feedItems } from '../pages/discover/data'
import type { FeedItem } from '../pages/discover/types'
import { UserCircleIcon } from '../pages/discover/icons'
import { gradientText } from '../uiClasses'

const PREVIEW_IDS = new Set(['f1', 'f2', 'f3', 'f4', 'f5'])

function truncateSummary(text: string, max = 220): string {
  const first = text.split('\n\n')[0]?.trim() ?? text
  if (first.length <= max) return first
  return `${first.slice(0, max - 1).trimEnd()}…`
}

function StaticPaperCard({ post }: { post: FeedItem }) {
  const blurb = truncateSummary(post.aiSummary)

  return (
    <div className="relative mx-auto w-full max-w-[340px] shrink-0 overflow-hidden rounded-[1.05rem] border border-slate-200/90 bg-white/95 shadow-md shadow-slate-900/5 ring-1 ring-slate-100/80">
      <div
        className="pointer-events-none absolute -top-10 right-0 h-28 w-28 rounded-full bg-violet-400/12 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-1/4 -left-8 h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl"
        aria-hidden
      />
      <div className="relative px-3.5 pt-2.5 pb-2">
        <h3 className="m-0 text-pretty text-[0.8125rem] font-bold leading-snug tracking-tight text-slate-900">
          <span className="line-clamp-3">{post.title}</span>
        </h3>
        <div className="mt-2 flex min-w-0 items-start gap-2">
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-violet-600 text-white shadow-sm shadow-violet-500/15"
            aria-hidden
          >
            <UserCircleIcon className="size-[13px]" />
          </div>
          <p
            className="m-0 min-w-0 flex-1 text-[0.7rem] leading-snug text-slate-500"
            title={post.authorLine}
          >
            <span className="line-clamp-2 wrap-anywhere">{post.authorLine}</span>
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="max-w-full truncate rounded-full border border-slate-200/90 bg-slate-100/90 px-2 py-0.5 text-[0.62rem] font-medium text-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div
        className="relative mx-2.5 mb-2.5 mt-0 rounded-lg border border-slate-200/85 bg-linear-to-b from-slate-50/98 to-white px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-slate-100/70"
        aria-label="AI-generated summary preview"
      >
        <p
          className={`m-0 text-[0.62rem] font-semibold tracking-[0.12em] uppercase ${gradientText}`}
        >
          AI summary
        </p>
        <p className="mt-1.5 m-0 text-[0.72rem] leading-[1.5] text-slate-700 wrap-anywhere">
          {blurb}
        </p>
      </div>
    </div>
  )
}

export function HeroPaperFeedPreview() {
  const papers = feedItems.filter((p) => PREVIEW_IDS.has(p.id))

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-xl shadow-violet-500/12 ring-1 ring-white/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-linear-to-r from-slate-50/95 to-slate-50/60 px-3 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#ff5f57]/95" />
          <span className="size-2.5 rounded-full bg-[#febc2e]/95" />
          <span className="size-2.5 rounded-full bg-[#28c840]/95" />
        </div>
        <span className="ml-1 truncate font-mono text-[11px] font-medium tracking-tight text-slate-500">
          mindmesh.app/discover
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-800 uppercase">
          <span
            className="size-1.5 animate-pulse rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          Live
        </span>
      </div>
      <div className="relative h-[min(420px,52vh)] overflow-hidden bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,rgba(99,102,241,0.06),transparent_55%)] [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)] min-[801px]:h-[440px]">
        <div className="mm-hero-feed-track space-y-3 px-3 py-3">
          {[...papers, ...papers].map((post, i) => (
            <StaticPaperCard key={`${post.id}-${i}`} post={post} />
          ))}
        </div>
      </div>
    </div>
  )
}
