import type { Session } from '@supabase/supabase-js'
import {
  authorSearchPreview,
  demoProfile,
  demoSponsoredResearches,
  INTERESTS,
  popularAuthorsWidget,
} from '../pages/discover/data'
import type { FeedItem } from '../pages/discover/types'
import {
  apiFetchJson,
  apiFetchJsonPublic,
  apiUploadPdf,
  getApiBaseUrl,
  isMockApiMode,
  ROUTES,
  setApiBearerToken,
} from './httpClient'
import { mockStore } from './mockStore'
import type {
  AuthorSearchHit,
  CardComment,
  CreateSessionInput,
  CreateSessionResult,
  LikePaperPayload,
  LikeResult,
  PaperSearchHit,
  PdfUploadResult,
  SessionSummary,
  SponsorResearch,
  UserProfile,
} from './types'

const PROFILE_STORAGE_KEY = 'mindmesh_profile_v1'
const MINDMESH_JWT_STORAGE_KEY = 'mindmesh_backend_jwt_v1'

const interestLabelById = new Map<string, string>(
  INTERESTS.map((i) => [i.id, i.label]),
)
const interestIdByLabel = new Map<string, string>(
  INTERESTS.map((i) => [i.label.trim().toLowerCase(), i.id]),
)

const legacyLabelToIds: Record<string, string[]> = {
  'machine learning & ai': ['ml', 'ai'],
  'biology & genomics': ['biology', 'genomics'],
  'climate & sustainability': ['climate', 'sustainability'],
  'physics & applied math': ['physics', 'applied-math'],
  'medicine & health': ['medicine', 'health'],
  'hci, design & computing': ['hci', 'design', 'computing'],
  'neuroscience & cognition': ['neuro', 'cognition'],
  'chemistry & materials': ['chemistry', 'materials'],
  'robotics & systems': ['robotics', 'systems'],
  'economics & policy': ['economics', 'policy'],
  'social & behavioral science': ['social-science', 'behavioral-science'],
  'energy & infrastructure': ['energy', 'infrastructure'],
}

function delay(ms = 180) {
  return new Promise((r) => setTimeout(r, ms))
}

function defaultUserProfile(): UserProfile {
  return {
    fullName: demoProfile.fullName,
    email: demoProfile.email,
    affiliation: demoProfile.affiliation,
    bio: demoProfile.bio,
    googleScholarUrl: null,
  }
}

function loadProfileFromStorage(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) return defaultUserProfile()
    const parsed = JSON.parse(raw) as Partial<UserProfile>
    return { ...defaultUserProfile(), ...parsed }
  } catch {
    return defaultUserProfile()
  }
}

function saveProfileToStorage(p: UserProfile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(p))
}

function looksLikeJwtDotSegments(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 3 && parts.every((p) => p.length > 0)
}

type BackendPaper = {
  id: string
  title: string
  summary?: string | null
  authors?: string[] | null
  categories?: string[] | null
  links?: Record<string, string> | null
  published?: string | null
  similarity?: number | null
  score?: number | null
}

function formatPaperMeta(
  published?: string | null,
  categories?: string[] | null,
): string {
  const parts: string[] = []
  if (categories?.length) {
    parts.push(categories.slice(0, 2).join(' · '))
  }
  if (published) {
    const d = new Date(published)
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
      )
    }
  }
  return parts.join(' · ') || 'Paper'
}

function extractArxivId(p: BackendPaper): string | undefined {
  const fromPdf = p.links?.pdf?.match(/(\d{4}\.\d{5,}|\d{4}\.\d{4})(v\d+)?/i)
  if (fromPdf) return fromPdf[1]!.replace(/v\d+$/i, '')
  const fromAbs =
    p.links?.arxiv ??
    p.links?.abs ??
    p.id.match(/arxiv\.org\/abs\/([\d.]+)/i)?.[1]
  if (fromAbs) {
    const m = String(fromAbs).match(/(\d{4}\.\d{5,}|\d{4}\.\d{4})/)
    if (m) return m[1]
  }
  const m = p.id.match(/(\d{4}\.\d{5,}|\d{4}\.\d{4})(v\d+)?$/i)
  if (m) return m[1]!
  return undefined
}

function backendPaperToFeedItem(p: BackendPaper): FeedItem {
  const authorLine =
    p.authors?.length ? p.authors.join(', ') : 'Unknown authors'
  const summary = (p.summary ?? '').trim()
  const simRaw = p.similarity ?? p.score
  const simNote =
    typeof simRaw === 'number' && Number.isFinite(simRaw)
      ? `\n\nRecommendation match: ${Math.round(simRaw * 100)}%`
      : ''
  const tags: readonly [string, string] =
    p.categories?.length && p.categories[0]
      ? [
          p.categories[0]!,
          p.categories[1] ?? p.categories[0]!,
        ]
      : (['Research', 'Paper'] as const)

  return {
    id: p.id,
    interestIds: [],
    authorLine,
    title: p.title,
    meta: formatPaperMeta(p.published, p.categories ?? null),
    aiSummary: summary + simNote,
    stats: { saves: 0, thread: 0 },
    tags,
    citations: 0,
    likes: 0,
    comments: 0,
    arxivId: extractArxivId(p),
    paperDetail: summary || undefined,
  }
}

export function paperSearchHitToFeedItem(h: PaperSearchHit): FeedItem {
  const summary = (h.summary ?? '').trim()
  const tags: readonly [string, string] =
    h.categories?.length && h.categories[0]
      ? [
          h.categories[0]!,
          h.categories[1] ?? h.categories[0]!,
        ]
      : (['Paper', 'Search'] as const)
  const bp: BackendPaper = {
    id: h.id,
    title: h.title,
    links: h.links ?? null,
  }
  return {
    id: h.id,
    interestIds: [],
    authorLine: h.authorLine,
    title: h.title,
    meta: h.meta,
    aiSummary: summary,
    stats: { saves: 0, thread: 0 },
    tags,
    citations: 0,
    likes: h.likes ?? 0,
    comments: 0,
    arxivId: extractArxivId(bp),
    paperDetail: summary || undefined,
  }
}

function backendUserToProfile(raw: Record<string, unknown>): UserProfile {
  const base = loadProfileFromStorage()
  const email =
    (typeof raw.email === 'string' && raw.email.trim()) || base.email
  const fullName =
    (typeof raw.full_name === 'string' && raw.full_name.trim()) ||
    (typeof raw.name === 'string' && raw.name.trim()) ||
    (typeof raw.fullName === 'string' && raw.fullName.trim()) ||
    base.fullName
  return {
    ...base,
    email,
    fullName,
  }
}

function interestIdsToApiLabels(ids: string[]): string[] {
  return ids.map((id) => interestLabelById.get(id) ?? id)
}

function apiLabelsToInterestIds(labels: string[]): string[] {
  const out: string[] = []
  for (const l of labels) {
    const key = l.trim().toLowerCase()
    const id = interestIdByLabel.get(key)
    if (id) {
      out.push(id)
    } else {
      const legacy = legacyLabelToIds[key]
      if (legacy) out.push(...legacy)
    }
  }
  return out
}

export { setApiBearerToken }

/** Clears the MindMesh API JWT cache and in-memory bearer token. */
export function clearMindMeshApiSession() {
  try {
    localStorage.removeItem(MINDMESH_JWT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  setApiBearerToken(null)
}

/**
 * Syncs the MindMesh backend JWT with the current Supabase session.
 * Uses `session.provider_token` (Google OAuth) for POST /auth/login when present;
 * otherwise reuses a cached MindMesh JWT from a previous exchange.
 * If your backend requires a Google *ID* token specifically, use `loginWithGoogleIdToken`
 * after obtaining the credential from Google Identity Services, or ensure the token
 * you pass here is the ID token JWT (three dot-separated segments).
 */
export async function syncMindMeshAuth(session: Session | null): Promise<void> {
  if (isMockApiMode()) {
    setApiBearerToken(session?.access_token ?? null)
    return
  }

  if (!session) {
    clearMindMeshApiSession()
    return
  }

  const base = getApiBaseUrl()
  if (!base) {
    clearMindMeshApiSession()
    return
  }

  const provider = session.provider_token?.trim()

  if (provider) {
    try {
      const res = await apiFetchJsonPublic<{ token: string }>(ROUTES.authLogin, {
        method: 'POST',
        json: { token: provider },
      })
      if (res.token) {
        setApiBearerToken(res.token)
        try {
          localStorage.setItem(MINDMESH_JWT_STORAGE_KEY, res.token)
        } catch {
          /* ignore */
        }
      }
      return
    } catch {
      /* fall through to cached JWT */
    }
  }

  try {
    const cached = localStorage.getItem(MINDMESH_JWT_STORAGE_KEY)?.trim()
    if (cached) {
      setApiBearerToken(cached)
      return
    }
  } catch {
    /* ignore */
  }

  setApiBearerToken(null)
}

/**
 * Exchanges a Google credential for a MindMesh JWT (POST /auth/login).
 * Pass the Google ID token (JWT) if your backend verifies ID tokens; otherwise
 * use whatever string your server expects in the `token` field.
 */
export async function loginWithGoogleIdToken(idToken: string): Promise<void> {
  if (isMockApiMode()) {
    setApiBearerToken(idToken)
    return
  }
  const res = await apiFetchJsonPublic<{ token: string }>(ROUTES.authLogin, {
    method: 'POST',
    json: { token: idToken },
  })
  if (!res.token) throw new Error('Login response missing token')
  setApiBearerToken(res.token)
  try {
    localStorage.setItem(MINDMESH_JWT_STORAGE_KEY, res.token)
  } catch {
    /* ignore */
  }
}

/** @deprecated Use syncMindMeshAuth(session) */
export async function syncAuthToken(token: string): Promise<void> {
  if (isMockApiMode()) {
    setApiBearerToken(token)
    await delay(120)
    return
  }
  if (looksLikeJwtDotSegments(token)) {
    await loginWithGoogleIdToken(token)
    return
  }
  setApiBearerToken(token)
}

export async function getSavedInterests(): Promise<string[]> {
  if (isMockApiMode()) {
    await delay(40)
    return mockStore.getInterests()
  }
  const me = await apiFetchJson<Record<string, unknown>>(ROUTES.authMe, {
    method: 'GET',
  })
  const interests = me.interests
  if (!Array.isArray(interests)) return []
  const strings = interests.filter((x): x is string => typeof x === 'string')
  return apiLabelsToInterestIds(strings)
}

export async function saveInterests(interestIds: string[]): Promise<void> {
  if (isMockApiMode()) {
    await delay()
    mockStore.setInterests(interestIds)
    return
  }
  await apiFetchJson(ROUTES.userUpdateInterests, {
    method: 'PUT',
    json: { interests: interestIdsToApiLabels(interestIds) },
  })
}

export async function getUserLikes(): Promise<Record<string, boolean>> {
  if (isMockApiMode()) {
    await delay(20)
    return mockStore.exportUserLikes()
  }
  const papers = await apiFetchJson<BackendPaper[]>(ROUTES.userLikes, {
    method: 'GET',
  })
  const map: Record<string, boolean> = {}
  if (Array.isArray(papers)) {
    for (const p of papers) {
      if (p?.id) map[p.id] = true
    }
  }
  return map
}

export type LikedPaper = {
  id: string
  title: string
  authorLine: string
}

export async function getUserLikedPapers(): Promise<LikedPaper[]> {
  if (isMockApiMode()) {
    await delay(20)
    return []
  }
  const papers = await apiFetchJson<BackendPaper[]>(ROUTES.userLikes, {
    method: 'GET',
  })
  if (!Array.isArray(papers)) return []
  return papers
    .filter((p): p is BackendPaper & { id: string } => !!p?.id)
    .map((p) => ({
      id: p.id,
      title: p.title || 'Untitled',
      authorLine: p.authors?.join(', ') ?? 'Unknown authors',
    }))
}

export async function getPersistedComments(): Promise<
  Record<string, CardComment[]>
> {
  if (isMockApiMode()) {
    await delay(20)
    return mockStore.exportCommentsByCard()
  }
  return {}
}

const FEED_PAGE_SIZE = 6

export type FeedSummaryItem = {
  paper_id: string
  title: string
  summary: string
  error?: string | null
}

export type ResearchDirection = {
  question: string
  explanation: string
}

export type PdfAnalysisResult = {
  title: string
  description_paragraphs: string[]
  research_directions: ResearchDirection[]
}

export async function analyzePdf(
  pdfUrl: string,
  title?: string,
): Promise<PdfAnalysisResult> {
  return apiFetchJson<PdfAnalysisResult>(ROUTES.llmPdfAnalysis, {
    method: 'POST',
    json: { pdf_url: pdfUrl, title: title ?? null },
  })
}

export async function fetchFeedSummaries(
  papers: { id: string; title: string; summary?: string | null; authors?: string[] | null; categories?: string[] | null; links?: Record<string, string> | null; published?: string | null; similarity?: number | null }[],
): Promise<FeedSummaryItem[]> {
  try {
    const res = await apiFetchJson<{
      total: number
      summaries: FeedSummaryItem[]
    }>(ROUTES.llmFeedSummary, {
      method: 'POST',
      json: {
        papers: papers.map((p) => ({
          id: p.id,
          title: p.title,
          summary: p.summary ?? null,
          authors: p.authors ?? [],
          categories: p.categories ?? [],
          links: p.links ?? null,
          published: p.published ?? null,
          similarity: p.similarity ?? null,
        })),
      },
    })
    return res.summaries ?? []
  } catch {
    return []
  }
}

const rawPaperCache = new Map<string, BackendPaper>()

function cachePapers(papers: BackendPaper[]) {
  for (const p of papers) rawPaperCache.set(p.id, p)
}

/** Like count for one paper (GET /paper/likes?paper_id=). No auth required. */
export async function fetchPaperLikeCount(paperId: string): Promise<number> {
  const res = await apiFetchJsonPublic<Record<string, unknown>>(
    `${ROUTES.paperLikes}?paper_id=${encodeURIComponent(paperId)}`,
    { method: 'GET' },
  )
  const raw = res.likes ?? res.count
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0
}

/** Parallel count lookups for feeds/search (caps at 50 ids). */
export async function fetchPaperLikeCounts(
  paperIds: string[],
): Promise<Map<string, number>> {
  const unique = [...new Set(paperIds)].slice(0, 50)
  if (unique.length === 0) return new Map()
  const pairs = await Promise.all(
    unique.map(async (id) => {
      const n = await fetchPaperLikeCount(id)
      return [id, n] as const
    }),
  )
  return new Map(pairs)
}

async function attachLikeCountsToFeedItems(
  items: FeedItem[],
): Promise<FeedItem[]> {
  if (items.length === 0) return items
  try {
    const m = await fetchPaperLikeCounts(items.map((i) => i.id))
    return items.map((i) => ({ ...i, likes: m.get(i.id) ?? i.likes }))
  } catch {
    return items
  }
}

function feedQueryString(offset: number, sessionId?: string | null): string {
  const params = new URLSearchParams({
    limit: String(FEED_PAGE_SIZE),
    offset: String(offset),
  })
  if (sessionId) params.set('session_id', sessionId)
  return params.toString()
}

export async function getDiscoveryFeed(
  _interestIds: string[],
  onSummaries?: (summaries: FeedSummaryItem[]) => void,
): Promise<FeedItem[]> {
  if (isMockApiMode()) {
    await delay()
    return mockStore.getDiscoveryFeed(_interestIds)
  }
  const papers = await apiFetchJson<BackendPaper[]>(
    `${ROUTES.userFeed}?${feedQueryString(0)}`,
    { method: 'GET' },
  )
  if (!Array.isArray(papers) || papers.length === 0) return []
  cachePapers(papers)
  const items = papers.map(backendPaperToFeedItem)
  void fetchFeedSummaries(papers).then((summaries) => {
    if (summaries.length > 0) onSummaries?.(summaries)
  })
  return attachLikeCountsToFeedItems(items)
}

export async function loadMoreFeedPapers(
  offset: number,
  onSummaries?: (summaries: FeedSummaryItem[]) => void,
  sessionId?: string | null,
): Promise<FeedItem[]> {
  if (isMockApiMode()) {
    await delay()
    return []
  }
  const papers = await apiFetchJson<BackendPaper[]>(
    `${ROUTES.userFeed}?${feedQueryString(offset, sessionId)}`,
    { method: 'GET' },
  )
  if (!Array.isArray(papers) || papers.length === 0) return []
  cachePapers(papers)
  const items = papers.map(backendPaperToFeedItem)
  void fetchFeedSummaries(papers).then((summaries) => {
    if (summaries.length > 0) onSummaries?.(summaries)
  })
  return attachLikeCountsToFeedItems(items)
}

function formatSessionListMeta(createdAt?: string | null): string {
  if (!createdAt) return 'Your session'
  const d = new Date(createdAt)
  if (Number.isNaN(d.getTime())) return 'Your session'
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function listSessions(): Promise<SessionSummary[]> {
  if (isMockApiMode()) {
    await delay()
    return mockStore.listSessions()
  }
  const rows = await apiFetchJson<
    {
      id: string
      name: string
      created_at?: string
      like_count?: number
    }[]
  >(ROUTES.userSessions, { method: 'GET' })
  if (!Array.isArray(rows)) return []
  return rows.map((r) => ({
    id: r.id,
    title: r.name,
    meta: formatSessionListMeta(r.created_at),
    papers: [],
    likeCount: typeof r.like_count === 'number' ? r.like_count : 0,
  }))
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (isMockApiMode()) {
    await delay(80)
    mockStore.deleteSession(sessionId)
    return
  }
  await apiFetchJson<{ deleted?: boolean }>(
    `${ROUTES.userSessionDelete}?session_id=${encodeURIComponent(sessionId)}`,
    { method: 'DELETE' },
  )
}

export async function createSession(
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  if (isMockApiMode()) {
    await delay(220)
    return mockStore.createSession(input)
  }
  let papers: FeedItem[] = []
  if (input.source === 'paper') {
    const q = input.paperQuery?.trim() ?? ''
    if (q) {
      const hits = await searchPapers(q)
      papers = hits.slice(0, 6).map(paperSearchHitToFeedItem)
    }
  }
  const derivedName =
    input.title?.trim() ||
    (input.source === 'paper' && input.paperQuery?.trim()
      ? `Session · ${input.paperQuery.trim().slice(0, 80)}${input.paperQuery.trim().length > 80 ? '…' : ''}`
      : input.source === 'pdf'
        ? `PDF · ${(input.fileMeta?.name ?? 'upload').replace(/\.pdf$/i, '').slice(0, 80)}`
        : 'New session')
  const row = await apiFetchJson<{ id: string; name: string; created_at?: string }>(
    ROUTES.userSessions,
    {
      method: 'POST',
      json: { name: derivedName },
    },
  )
  return {
    session: {
      id: row.id,
      title: row.name,
      meta: formatSessionListMeta(row.created_at),
      papers,
      likeCount: 0,
    },
  }
}

export async function getSessionFeed(
  sessionId: string,
  onSummaries?: (summaries: FeedSummaryItem[]) => void,
): Promise<FeedItem[]> {
  if (isMockApiMode()) {
    await delay()
    const feed = mockStore.getSessionFeed(sessionId)
    if (!feed) throw new Error('Session not found')
    return feed
  }
  const papers = await apiFetchJson<BackendPaper[]>(
    `${ROUTES.userFeed}?${feedQueryString(0, sessionId)}`,
    { method: 'GET' },
  )
  if (!Array.isArray(papers) || papers.length === 0) return []
  cachePapers(papers)
  const items = papers.map(backendPaperToFeedItem)
  void fetchFeedSummaries(papers).then((summaries) => {
    if (summaries.length > 0) onSummaries?.(summaries)
  })
  return attachLikeCountsToFeedItems(items)
}

export async function joinSession(sessionId: string): Promise<void> {
  if (isMockApiMode()) {
    await delay(80)
    mockStore.joinSession(sessionId)
    return
  }
  void sessionId
  await delay(40)
}

function likesFromMutationBody(body: unknown): number | undefined {
  if (!body || typeof body !== 'object') return undefined
  const n = (body as { likes?: unknown }).likes
  if (typeof n === 'number' && Number.isFinite(n))
    return Math.max(0, Math.trunc(n))
  return undefined
}

export async function setCardLike(
  cardId: string,
  liked: boolean,
  sessionId?: string | null,
  paperForInsert?: LikePaperPayload | null,
): Promise<LikeResult> {
  if (isMockApiMode()) {
    await delay(90)
    return mockStore.setCardLike(cardId, liked)
  }
  if (liked) {
    const cached = rawPaperCache.get(cardId)
    const insert =
      cached != null
        ? {
            title: cached.title,
            summary: cached.summary ?? null,
            authors: cached.authors ?? [],
            categories: cached.categories ?? [],
            links: cached.links ?? {},
            published: cached.published ?? null,
          }
        : paperForInsert?.title
          ? {
              title: paperForInsert.title,
              summary: paperForInsert.summary ?? null,
              authors: paperForInsert.authors ?? [],
              categories: paperForInsert.categories ?? [],
              links: paperForInsert.links ?? {},
              published: paperForInsert.published ?? null,
            }
          : {}
    const body = await apiFetchJson<Record<string, unknown>>(ROUTES.userLike, {
      method: 'POST',
      json: {
        paper_id: cardId,
        ...(sessionId ? { session_id: sessionId } : {}),
        ...insert,
      },
    })
    const serverLiked =
      typeof body.liked === 'boolean' ? body.liked : true
    return {
      cardId,
      liked: serverLiked,
      likes: likesFromMutationBody(body),
    }
  }
  const body = await apiFetchJson<Record<string, unknown>>(
    ROUTES.userDislike,
    {
      method: 'DELETE',
      json: { paper_id: cardId },
    },
  )
  const serverLiked =
    typeof body.liked === 'boolean' ? body.liked : false
  return {
    cardId,
    liked: serverLiked,
    likes: likesFromMutationBody(body),
  }
}

export async function addCardComment(
  cardId: string,
  body: string,
  author: string,
): Promise<CardComment> {
  if (isMockApiMode()) {
    await delay(100)
    return mockStore.addCardComment(cardId, body, author)
  }
  await delay(50)
  return {
    id: `${cardId}-local-${Date.now()}`,
    author,
    body,
  }
}

export async function getProfile(): Promise<UserProfile> {
  if (isMockApiMode()) {
    await delay(60)
    return loadProfileFromStorage()
  }
  try {
    const me = await apiFetchJson<Record<string, unknown>>(ROUTES.authMe, {
      method: 'GET',
    })
    const next = backendUserToProfile(me)
    saveProfileToStorage(next)
    return next
  } catch {
    return loadProfileFromStorage()
  }
}

export async function updateProfile(
  partial: Partial<UserProfile>,
): Promise<UserProfile> {
  if (isMockApiMode()) {
    await delay(100)
    const next = { ...loadProfileFromStorage(), ...partial }
    saveProfileToStorage(next)
    return next
  }
  const next = { ...loadProfileFromStorage(), ...partial }
  saveProfileToStorage(next)
  return next
}

export async function getSponsoredResearches(): Promise<SponsorResearch[]> {
  if (isMockApiMode()) {
    await delay(60)
    return mockStore.getSponsoredResearches()
  }
  return demoSponsoredResearches.map((r) => ({ ...r }))
}

export async function searchPapers(query: string): Promise<PaperSearchHit[]> {
  if (isMockApiMode()) {
    await delay(120)
    return mockStore.searchPapers(query)
  }
  const q = encodeURIComponent(query.trim())
  const papers = await apiFetchJson<BackendPaper[]>(
    `${ROUTES.paperSearch}?q=${q}&limit=24&offset=0`,
    { method: 'GET' },
  )
  if (!Array.isArray(papers)) return []
  cachePapers(papers)
  const hits = papers.map((p) => ({
    id: p.id,
    title: p.title,
    authorLine:
      p.authors?.length ? p.authors.join(', ') : 'Unknown authors',
    meta: formatPaperMeta(p.published, p.categories ?? null),
    summary: p.summary ?? undefined,
    categories: p.categories ?? undefined,
    links: p.links ?? undefined,
    likes: 0,
  }))
  try {
    const likesMap = await fetchPaperLikeCounts(hits.map((h) => h.id))
    return hits.map((h) => ({ ...h, likes: likesMap.get(h.id) ?? 0 }))
  } catch {
    return hits
  }
}

export async function searchAuthors(query: string): Promise<AuthorSearchHit[]> {
  if (isMockApiMode()) {
    await delay(120)
    return mockStore.searchAuthors(query)
  }
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
}

export type ArxivPaper = {
  id: string
  title: string
  summary: string
  authors: string[]
  published: string
  categories: string[]
  links: Record<string, string>
}

export type ArxivSearchResult = {
  total_results: number
  start_index: number
  items_per_page: number
  papers: ArxivPaper[]
}

export async function searchArxiv(
  query: string,
  start = 0,
  maxResults = 6,
): Promise<ArxivSearchResult> {
  if (isMockApiMode()) {
    await delay(120)
    return { total_results: 0, start_index: 0, items_per_page: 0, papers: [] }
  }
  const q = encodeURIComponent(query.trim())
  return apiFetchJson<ArxivSearchResult>(
    `${ROUTES.arxivSearch}?q=${q}&start=${start}&max_results=${maxResults}`,
    { method: 'GET' },
  )
}

export type ArxivMoreResult = {
  source: 'db' | 'arxiv'
  papers: ArxivPaper[]
  total_results?: number
  arxiv_start: number
  db_offset: number
}

export async function loadMoreArxivResults(opts: {
  q: string
  arxivStart: number
  dbOffset: number
  pageSize?: number
  seedPapers?: { title: string; summary: string }[]
}): Promise<ArxivMoreResult> {
  if (isMockApiMode()) {
    await delay(200)
    return { source: 'arxiv', papers: [], arxiv_start: opts.arxivStart, db_offset: opts.dbOffset }
  }
  return apiFetchJson<ArxivMoreResult>(ROUTES.arxivMore, {
    method: 'POST',
    json: {
      q: opts.q,
      arxiv_start: opts.arxivStart,
      db_offset: opts.dbOffset,
      page_size: opts.pageSize ?? 6,
      seed_papers: opts.seedPapers ?? [],
    },
  })
}

export async function uploadPdf(file: File): Promise<PdfUploadResult> {
  if (isMockApiMode()) {
    await delay(200)
    return mockStore.uploadPdf(file)
  }
  const body = await apiUploadPdf(file)
  return body as PdfUploadResult
}
