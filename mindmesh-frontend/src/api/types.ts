import type { FeedItem } from '../pages/discover/types'

export type { FeedItem }

export type SessionSummary = {
  id: string
  title: string
  meta: string
  papers: FeedItem[]
}

export type CardComment = {
  id: string
  author: string
  body: string
}

export type LikeResult = {
  cardId: string
  liked: boolean
  likes: number
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
