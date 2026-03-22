import type { FeedItem } from '../pages/discover/types'
import type { SessionFeedMoreState, SessionSummary } from './types'

const STORAGE_KEY = 'mindmesh_workspace_sessions_v1'

function normalizePaper(p: unknown): FeedItem | null {
  if (!p || typeof p !== 'object') return null
  const o = p as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.title !== 'string') return null
  const stats = o.stats
  const st =
    stats && typeof stats === 'object' && stats !== null
      ? (stats as Record<string, unknown>)
      : {}
  const saves = typeof st.saves === 'number' ? st.saves : 0
  const thread = typeof st.thread === 'number' ? st.thread : 0
  const tagsRaw = o.tags
  const tags: readonly [string, string] =
    Array.isArray(tagsRaw) &&
    tagsRaw.length >= 2 &&
    typeof tagsRaw[0] === 'string' &&
    typeof tagsRaw[1] === 'string'
      ? [tagsRaw[0], tagsRaw[1]]
      : (['Research', 'Paper'] as const)
  const interestRaw = o.interestIds
  const interestIds: string[] = Array.isArray(interestRaw)
    ? interestRaw.filter((x): x is string => typeof x === 'string')
    : []

  return {
    id: o.id,
    interestIds,
    authorLine:
      typeof o.authorLine === 'string' ? o.authorLine : 'Unknown authors',
    title: o.title,
    meta: typeof o.meta === 'string' ? o.meta : 'Paper',
    aiSummary: typeof o.aiSummary === 'string' ? o.aiSummary : '',
    stats: { saves, thread },
    tags,
    citations: typeof o.citations === 'number' ? o.citations : 0,
    likes: typeof o.likes === 'number' ? o.likes : 0,
    comments: typeof o.comments === 'number' ? o.comments : 0,
    ...(typeof o.arxivId === 'string' ? { arxivId: o.arxivId } : {}),
    ...(typeof o.paperDetail === 'string' ? { paperDetail: o.paperDetail } : {}),
  }
}

function normalizeMoreFeed(m: unknown): SessionFeedMoreState | null {
  if (!m || typeof m !== 'object') return null
  const o = m as Record<string, unknown>
  if (typeof o.q !== 'string') return null
  if (typeof o.nextApiOffset !== 'number' || typeof o.pageSize !== 'number')
    return null
  if (typeof o.apiExhausted !== 'boolean') return null
  if (!Array.isArray(o.prefetchQueue)) return null
  const prefetchQueue = o.prefetchQueue
    .map(normalizePaper)
    .filter((p): p is FeedItem => p !== null)
  return {
    q: o.q,
    nextApiOffset: o.nextApiOffset,
    pageSize: o.pageSize,
    prefetchQueue,
    apiExhausted: o.apiExhausted,
  }
}

function normalizeSession(s: unknown): SessionSummary | null {
  if (!s || typeof s !== 'object') return null
  const o = s as Record<string, unknown>
  if (
    typeof o.id !== 'string' ||
    typeof o.title !== 'string' ||
    typeof o.meta !== 'string' ||
    !Array.isArray(o.papers)
  ) {
    return null
  }
  const papers = o.papers
    .map(normalizePaper)
    .filter((p): p is FeedItem => p !== null)
  const moreFeed =
    o.moreFeed === null || o.moreFeed === undefined
      ? undefined
      : normalizeMoreFeed(o.moreFeed)
  return {
    id: o.id,
    title: o.title,
    meta: o.meta,
    papers,
    ...(moreFeed ? { moreFeed } : {}),
  }
}

function cloneFeedItem(p: FeedItem): FeedItem {
  return {
    ...p,
    interestIds: [...p.interestIds],
    stats: { ...p.stats },
    tags: [p.tags[0], p.tags[1]] as [string, string],
  }
}

function cloneSession(s: SessionSummary): SessionSummary {
  const out: SessionSummary = {
    id: s.id,
    title: s.title,
    meta: s.meta,
    papers: s.papers.map(cloneFeedItem),
  }
  if (s.moreFeed) {
    out.moreFeed = {
      ...s.moreFeed,
      prefetchQueue: s.moreFeed.prefetchQueue.map(cloneFeedItem),
    }
  }
  return out
}

export function loadWorkspaceSessions(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: SessionSummary[] = []
    for (const row of parsed) {
      const s = normalizeSession(row)
      if (s) out.push(cloneSession(s))
    }
    return out
  } catch {
    return []
  }
}

export function saveWorkspaceSessions(sessions: SessionSummary[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    /* ignore quota / private mode */
  }
}

export function prependWorkspaceSession(session: SessionSummary): void {
  const next = [cloneSession(session), ...loadWorkspaceSessions()].filter(
    (s, i, arr) => arr.findIndex((x) => x.id === s.id) === i,
  )
  saveWorkspaceSessions(next)
}

export function updateWorkspaceSession(
  sessionId: string,
  updater: (s: SessionSummary) => SessionSummary,
): void {
  const all = loadWorkspaceSessions()
  const i = all.findIndex((s) => s.id === sessionId)
  if (i < 0) return
  all[i] = cloneSession(updater(all[i]!))
  saveWorkspaceSessions(all)
}
