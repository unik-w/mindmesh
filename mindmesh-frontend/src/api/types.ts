import type { FeedItem } from '../pages/discover/types'

export type { FeedItem }

export type SessionSummary = {
  id: string
  title: string
  meta: string
  papers: FeedItem[]
  /** Likes in this session (from API list); used to choose arXiv vs recommendation feed. */
  likeCount?: number
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

/** Sent with POST /user/like when the paper is not in cache (e.g. arXiv search) so the backend can upsert `papers`. */
export type LikePaperPayload = {
  title: string
  summary?: string | null
  authors?: string[]
  categories?: string[]
  links?: Record<string, unknown>
  published?: string | null
}

export type CreateSessionInput = {
  title?: string
  source: 'paper' | 'pdf'
  paperQuery?: string
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
  /** Abstract / summary from DB search (shown as AI summary in the reel). */
  summary?: string
  categories?: string[]
  links?: Record<string, string>
  /** Display count; updated optimistically when liking from search results. */
  likes?: number
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
