import type { FeedItem } from '../pages/discover/types'

export type { FeedItem }

/** Cursor for loading more papers into a workspace session (real API: search + prefetch queue). */
export type SessionFeedMoreState = {
  q: string
  nextApiOffset: number
  pageSize: number
  prefetchQueue: FeedItem[]
  apiExhausted: boolean
}

export type SessionSummary = {
  id: string
  title: string
  meta: string
  papers: FeedItem[]
  moreFeed?: SessionFeedMoreState | null
}

export type CardComment = {
  id: string
  author: string
  body: string
}

export type LikeResult = {
  cardId: string
  liked: boolean
  /** Omitted when the API does not return an aggregate like count. */
  likes?: number
}

export type CreateSessionInput = {
  title?: string
  source: 'paper' | 'pdf'
  paperQuery?: string
  /** When set, that hit is pinned first; feed continues with search + infinite scroll. */
  seedPaperId?: string
  fileMeta?: { name: string }
}

export type CreateSessionResult = {
  session: SessionSummary
}

export type PaperSearchHit = {
  id: string
  title: string
  authorLine: string
  meta: string
}

export type AuthorSearchHit = {
  name: string
  affiliation: string
}

export type PdfUploadResult = {
  documentId: string
  status: 'processing' | 'ready'
  fileName: string
}

export type UserProfile = {
  fullName: string
  email: string
  affiliation: string
  bio: string
  googleScholarUrl: string | null
}

export type SponsorResearch = {
  id: string
  title: string
  sponsor: string
  status: string
  period: string
}
