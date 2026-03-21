import type { FeedItem } from './types'

/** Picks up to `limit` other papers, preferring shared interest tags. */
export function relatedPapersFor(
  post: FeedItem,
  pool: readonly FeedItem[],
  limit = 3,
): FeedItem[] {
  const others = pool.filter((p) => p.id !== post.id)
  const scored = others.map((p) => ({
    p,
    overlap: post.interestIds.filter((id) => p.interestIds.includes(id))
      .length,
  }))
  scored.sort((a, b) => {
    if (b.overlap !== a.overlap) return b.overlap - a.overlap
    return a.p.id.localeCompare(b.p.id)
  })

  const picked: FeedItem[] = []
  const seen = new Set<string>()
  for (const { p, overlap } of scored) {
    if (picked.length >= limit) break
    if (overlap > 0) {
      picked.push(p)
      seen.add(p.id)
    }
  }
  for (const { p } of scored) {
    if (picked.length >= limit) break
    if (!seen.has(p.id)) {
      picked.push(p)
      seen.add(p.id)
    }
  }
  return picked
}
