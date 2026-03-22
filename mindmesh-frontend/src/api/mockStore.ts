import {
  authorSearchPreview,
  demoSponsoredResearches,
  feedItems,
  popularAuthorsWidget,
  sessions as seedSessions,
} from '../pages/discover/data'
import type { FeedItem } from '../pages/discover/types'
import type {
  AuthorSearchHit,
  CardComment,
  CreateSessionInput,
  CreateSessionResult,
  LikeResult,
  PaperSearchHit,
  PdfUploadResult,
  SessionFeedMoreState,
  SessionSummary,
  SponsorResearch,
} from './types'

const STORAGE_KEY = 'mindmesh_api_mock_v1'

type Persisted = {
  interestIds: string[]
  sessions: SessionSummary[]
  userLiked: Record<string, boolean>
  commentsByCard: Record<string, CardComment[]>
  joinedSessionIds: string[]
  nextSessionKey: number
}

function cloneItem(item: FeedItem): FeedItem {
  return {
    ...item,
    interestIds: [...item.interestIds],
    stats: { ...item.stats },
    tags: [...item.tags] as [string, string],
  }
}

function cloneSession(s: SessionSummary): SessionSummary {
  const out: SessionSummary = {
    id: s.id,
    title: s.title,
    meta: s.meta,
    papers: s.papers.map(cloneItem),
    likeCount: s.likeCount ?? 0,
  }
  if (s.moreFeed) {
    out.moreFeed = {
      ...s.moreFeed,
      prefetchQueue: s.moreFeed.prefetchQueue.map(cloneItem),
    }
  }
  return out
}

function seedState(): Persisted {
  return {
    interestIds: [],
    sessions: seedSessions.map((s) => cloneSession(s as SessionSummary)),
    userLiked: {},
    commentsByCard: {},
    joinedSessionIds: [],
    nextSessionKey: 1,
  }
}

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedState()
    const parsed = JSON.parse(raw) as Partial<Persisted>
    const base = seedState()
    return {
      interestIds: Array.isArray(parsed.interestIds)
        ? parsed.interestIds
        : base.interestIds,
      sessions: Array.isArray(parsed.sessions) && parsed.sessions.length > 0
        ? parsed.sessions.map((s) => cloneSession(s as SessionSummary))
        : base.sessions,
      userLiked:
        parsed.userLiked && typeof parsed.userLiked === 'object'
          ? parsed.userLiked
          : {},
      commentsByCard:
        parsed.commentsByCard && typeof parsed.commentsByCard === 'object'
          ? parsed.commentsByCard
          : {},
      joinedSessionIds: Array.isArray(parsed.joinedSessionIds)
        ? parsed.joinedSessionIds
        : [],
      nextSessionKey:
        typeof parsed.nextSessionKey === 'number'
          ? parsed.nextSessionKey
          : base.nextSessionKey,
    }
  } catch {
    return seedState()
  }
}

let mem = loadPersisted()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mem))
  } catch {
    /* ignore */
  }
}

export function mockResetForTests() {
  mem = seedState()
  persist()
}

function findRawFeedItem(id: string): FeedItem | undefined {
  for (const p of feedItems) {
    if (p.id === id) return p
  }
  for (const s of mem.sessions) {
    for (const p of s.papers) {
      if (p.id === id) return p
    }
  }
  return undefined
}

function allFeedItemsPool(): FeedItem[] {
  const byId = new Map<string, FeedItem>()
  for (const p of feedItems) byId.set(p.id, p)
  for (const s of mem.sessions) {
    for (const p of s.papers) byId.set(p.id, p)
  }
  return [...byId.values()]
}

function applyOverlays(item: FeedItem): FeedItem {
  const liked = mem.userLiked[item.id] ?? false
  const extra = mem.commentsByCard[item.id]?.length ?? 0
  return {
    ...item,
    likes: item.likes + (liked ? 1 : 0),
    comments: item.comments + extra,
  }
}

function searchPapersInternal(query: string): PaperSearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const pool = allFeedItemsPool()
  return pool
    .filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.authorLine.toLowerCase().includes(q) ||
        p.meta.toLowerCase().includes(q),
    )
    .slice(0, 12)
    .map((p) => ({
      id: p.id,
      title: p.title,
      authorLine: p.authorLine,
      meta: p.meta,
      summary: p.aiSummary || p.paperDetail,
      likes: p.likes,
    }))
}

export const mockStore = {
  getInterests(): string[] {
    return [...mem.interestIds]
  },

  setInterests(ids: string[]) {
    mem.interestIds = [...ids]
    persist()
  },

  getDiscoveryFeed(interestIds: string[]): FeedItem[] {
    const selected = new Set(interestIds)
    const scored = feedItems.map((item) => {
      const match = item.interestIds.some((id) => selected.has(id))
      return { item: cloneItem(item), match }
    })
    return scored
      .sort((a, b) => Number(b.match) - Number(a.match))
      .map((s) => applyOverlays(s.item))
  },

  listSessions(): SessionSummary[] {
    return mem.sessions.map((s) => ({
      ...cloneSession(s),
      papers: s.papers.map((p) => applyOverlays(cloneItem(p))),
    }))
  },

  getSessionFeed(sessionId: string): FeedItem[] | null {
    const s = mem.sessions.find((x) => x.id === sessionId)
    if (!s) return null
    return s.papers.map((p) => applyOverlays(cloneItem(p)))
  },

  joinSession(sessionId: string) {
    if (!mem.sessions.some((s) => s.id === sessionId)) return
    if (!mem.joinedSessionIds.includes(sessionId)) {
      mem.joinedSessionIds.push(sessionId)
      persist()
    }
  },

  deleteSession(sessionId: string) {
    mem.sessions = mem.sessions.filter((s) => s.id !== sessionId)
    mem.joinedSessionIds = mem.joinedSessionIds.filter((id) => id !== sessionId)
    persist()
  },

  setCardLike(cardId: string, liked: boolean): LikeResult {
    if (liked) mem.userLiked[cardId] = true
    else delete mem.userLiked[cardId]
    persist()
    const raw = findRawFeedItem(cardId)
    const base = raw?.likes ?? 0
    const total = base + (mem.userLiked[cardId] ? 1 : 0)
    return { cardId, liked: Boolean(mem.userLiked[cardId]), likes: total }
  },

  addCardComment(
    cardId: string,
    body: string,
    author: string,
  ): CardComment {
    const id = `${cardId}-c-${Date.now()}`
    const row: CardComment = { id, author, body }
    mem.commentsByCard[cardId] = [...(mem.commentsByCard[cardId] ?? []), row]
    persist()
    return row
  },

  getCardComments(cardId: string): CardComment[] {
    return [...(mem.commentsByCard[cardId] ?? [])]
  },

  searchPapers(query: string): PaperSearchHit[] {
    return searchPapersInternal(query)
  },

  searchAuthors(query: string): AuthorSearchHit[] {
    const q = query.trim().toLowerCase()
    const combined: AuthorSearchHit[] = [
      ...popularAuthorsWidget.map((a) => ({
        name: a.name,
        affiliation: 'MindMesh graph',
      })),
      ...authorSearchPreview.map((a) => ({
        name: a.name,
        affiliation: a.affiliation,
      })),
    ]
    if (!q) return combined
    return combined.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.affiliation.toLowerCase().includes(q),
    )
  },

  createSession(input: CreateSessionInput): CreateSessionResult {
    const n = mem.nextSessionKey++
    const id = `session-${n}`
    let papers: FeedItem[]
    let title: string
    let meta: string
    let moreFeed: SessionFeedMoreState | undefined

    if (input.source === 'paper') {
      const q = (input.paperQuery ?? '').trim()
      const seedId = input.seedPaperId?.trim()
      const rawHits = searchPapersInternal(q)
      const seedIdx =
        seedId && rawHits.length > 0
          ? rawHits.findIndex((h) => h.id === seedId)
          : -1
      const hits =
        seedIdx > 0
          ? [
              rawHits[seedIdx]!,
              ...rawHits.filter((_, i) => i !== seedIdx),
            ]
          : rawHits
      const pool = allFeedItemsPool()
      if (hits.length > 0) {
        papers = hits.slice(0, 6).map((h, i) => {
          const raw = pool.find((p) => p.id === h.id) ?? feedItems[0]!
          return {
            ...cloneItem(raw),
            id: `${id}-hit-${i}`,
            title: h.title,
            authorLine: h.authorLine,
            meta: h.meta,
          }
        })
        const extra = feedItems
          .filter((p) => !papers.some((pp) => pp.title === p.title))
          .slice(0, 12)
          .map((p, i) => ({
            ...cloneItem(p),
            id: `${id}-more-${i}`,
          }))
        moreFeed =
          extra.length > 0
            ? {
                q: '',
                nextApiOffset: 0,
                pageSize: 6,
                prefetchQueue: extra.map(cloneItem),
                apiExhausted: true,
              }
            : undefined
        const seedTitle = papers[0]?.title?.trim() ?? q
        title =
          input.title?.trim() ||
          (seedTitle
            ? `Session · ${seedTitle.slice(0, 32)}${seedTitle.length > 32 ? '…' : ''}`
            : 'New paper session')
      } else {
        const pick = pool.find((p) => p.id === seedId) ?? feedItems[0]
        const base = pick ? cloneItem(pick) : cloneItem(feedItems[0]!)
        papers = [
          {
            ...base,
            id: `${id}-p1`,
            title: q
              ? `${base.title} · “${q.slice(0, 40)}${q.length > 40 ? '…' : ''}”`
              : base.title,
          },
          ...feedItems.slice(1, 4).map((p, i) => ({
            ...cloneItem(p),
            id: `${id}-seed-${i}`,
          })),
        ]
        title =
          input.title?.trim() ||
          (q
            ? `Session · ${q.slice(0, 32)}${q.length > 32 ? '…' : ''}`
            : 'New paper session')
        moreFeed = undefined
      }
      meta = 'You · just now'
    } else {
      const name = input.fileMeta?.name ?? 'upload.pdf'
      papers = feedItems.slice(0, 4).map((p, i) => ({
        ...cloneItem(p),
        id: `${id}-pdf-${i}`,
        title: i === 0 ? `PDF: ${name}` : p.title,
      }))
      title =
        input.title?.trim() ||
        `PDF · ${name.replace(/\.pdf$/i, '').slice(0, 36)}`
      meta = 'You · uploaded'
    }

    const session: SessionSummary = {
      id,
      title,
      meta,
      papers,
      likeCount: 0,
      ...(moreFeed ? { moreFeed } : {}),
    }
    mem.sessions = [session, ...mem.sessions]
    persist()
    return { session: cloneSession(session) }
  },

  loadMoreSessionPapers(sessionId: string): FeedItem[] {
    const s = mem.sessions.find((x) => x.id === sessionId)
    if (!s?.moreFeed) return []
    const mf = s.moreFeed
    const take = mf.prefetchQueue.slice(0, mf.pageSize)
    const rest = mf.prefetchQueue.slice(mf.pageSize)
    s.papers = [...s.papers, ...take.map(cloneItem)]
    s.moreFeed =
      rest.length > 0
        ? { ...mf, prefetchQueue: rest.map(cloneItem) }
        : undefined
    persist()
    return take.map((p: FeedItem) => applyOverlays(cloneItem(p)))
  },

  uploadPdf(file: File): PdfUploadResult {
    return {
      documentId: `doc-${Date.now()}`,
      status: 'processing',
      fileName: file.name,
    }
  },

  getSponsoredResearches(): SponsorResearch[] {
    return demoSponsoredResearches.map((r) => ({ ...r }))
  },

  exportUserLikes(): Record<string, boolean> {
    return { ...mem.userLiked }
  },

  exportCommentsByCard(): Record<string, CardComment[]> {
    const out: Record<string, CardComment[]> = {}
    for (const k of Object.keys(mem.commentsByCard)) {
      out[k] = [...(mem.commentsByCard[k] ?? [])]
    }
    return out
  },
}
