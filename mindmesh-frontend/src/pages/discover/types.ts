export type FeedItem = {
  id: string
  interestIds: readonly string[]
  authorLine: string
  title: string
  meta: string
  aiSummary: string
  stats: { saves: number; thread: number }
  tags: readonly [string, string]
  citations: number
  likes: number
  comments: number
  /** When set, PDF viewer uses this arXiv id (e.g. `1706.03762`) */
  arxivId?: string
  /** Long-form explanation for the paper sheet; falls back to an expanded default */
  paperDetail?: string
}

export type ReelItem =
  | { kind: 'paper'; post: FeedItem }
  | {
      kind: 'conference'
      id: string
      title: string
      venue: string
      when: string
      blurb: string
    }
  | {
      kind: 'job'
      id: string
      company: string
      role: string
      location: string
      blurb: string
      categoryLine: string
    }

export type MainPanel = 'feed' | 'discover' | 'authors'

export type NewSessionModalStep = 'choose' | 'paper' | 'upload'
