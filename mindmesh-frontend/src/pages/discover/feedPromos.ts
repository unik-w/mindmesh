import type { FeedItem, ReelItem } from './types'

function hashSeed(parts: readonly string[]): number {
  let h = 2166136261
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) {
      h ^= p.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function interleaveFeedPromos(
  posts: readonly FeedItem[],
  categoryLabel: string,
  seedStr: string,
): ReelItem[] {
  if (posts.length === 0) return []
  const rand = mulberry32(hashSeed([seedStr]))
  const out: ReelItem[] = []
  let promoSeq = 0
  let papersUntilPromo = 2 + Math.floor(rand() * 4)

  const conferenceVenues = [
    'University conference center · 1.8 mi',
    'Innovation hub · 3.1 mi',
    'Downtown auditorium · 0.9 mi',
  ] as const
  const jobCompanies = [
    'Northwind Research',
    'Heliobridge Labs',
    'Cedarbench Applied Science',
  ] as const

  for (let i = 0; i < posts.length; i++) {
    out.push({ kind: 'paper', post: posts[i] })
    papersUntilPromo -= 1
    const hasMorePapers = i < posts.length - 1
    if (hasMorePapers && papersUntilPromo <= 0) {
      promoSeq += 1
      const isConference = rand() >= 0.5
      if (isConference) {
        const vi = Math.floor(rand() * conferenceVenues.length)
        out.push({
          kind: 'conference',
          id: `reel-conf-${promoSeq}-${posts[i]!.id}`,
          title: `Regional ${categoryLabel} showcase`,
          venue: conferenceVenues[vi]!,
          when: 'Weekend workshop · May 17–18',
          blurb:
            'Talks, posters, and a mentor lounge for grad students. Nearby labs and funders are hosting office hours—great if you want collaborators outside your usual circle.',
        })
      } else {
        const ci = Math.floor(rand() * jobCompanies.length)
        out.push({
          kind: 'job',
          id: `reel-job-${promoSeq}-${posts[i]!.id}`,
          company: jobCompanies[ci]!,
          role: `Research scientist — ${categoryLabel}`,
          location: 'Hybrid · commutable',
          blurb:
            'Industry team hiring for depth in this area: you would lead applied projects, partner with academics, and still have room to publish. Cross-functional partners in product and policy.',
          categoryLine: categoryLabel,
        })
      }
      papersUntilPromo = 3 + Math.floor(rand() * 5)
    }
  }
  return out
}
