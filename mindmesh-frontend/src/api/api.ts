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

function paperSearchHitToFeedItem(h: PaperSearchHit): FeedItem {
  return {
    id: h.id,
    interestIds: [],
    authorLine: h.authorLine,
    title: h.title,
    meta: h.meta,
    aiSummary: '',
    stats: { saves: 0, thread: 0 },
    tags: ['Paper', 'Search'] as const,
    citations: 0,
    likes: 0,
    comments: 0,
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
    const id = interestIdByLabel.get(l.trim().toLowerCase())
    if (id) out.push(id)
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

type FeedSummaryItem = {
  paper_id: string
  title: string
  summary: string
  error?: string | null
}

async function fetchFeedSummaries(
  papers: BackendPaper[],
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

function applyLlmSummaries(
  papers: BackendPaper[],
  summaries: FeedSummaryItem[],
): FeedItem[] {
  const summaryMap = new Map(
    summaries
      .filter((s) => s.summary && !s.error)
      .map((s) => [s.paper_id, s.summary]),
  )
  return papers.map((p) => {
    const item = backendPaperToFeedItem(p)
    const llm = summaryMap.get(p.id)
    if (llm) item.aiSummary = llm
    return item
  })
}

export async function getDiscoveryFeed(
  _interestIds: string[],
): Promise<FeedItem[]> {
  if (isMockApiMode()) {
    await delay()
    return mockStore.getDiscoveryFeed(_interestIds)
  }
  const papers = await apiFetchJson<BackendPaper[]>(
    `${ROUTES.userFeed}?limit=${FEED_PAGE_SIZE}&offset=0`,
    { method: 'GET' },
  )
  if (!Array.isArray(papers) || papers.length === 0) return []
  const summaries = await fetchFeedSummaries(papers)
  return applyLlmSummaries(papers, summaries)
}

export async function loadMoreFeedPapers(
  offset: number,
): Promise<FeedItem[]> {
  if (isMockApiMode()) {
    await delay()
    return []
  }
  const papers = await apiFetchJson<BackendPaper[]>(
    `${ROUTES.userFeed}?limit=${FEED_PAGE_SIZE}&offset=${offset}`,
    { method: 'GET' },
  )
  if (!Array.isArray(papers) || papers.length === 0) return []
  const summaries = await fetchFeedSummaries(papers)
  return applyLlmSummaries(papers, summaries)
}

export async function listSessions(): Promise<SessionSummary[]> {
  if (isMockApiMode()) {
    await delay()
    return mockStore.listSessions()
  }
  return []
}

export async function createSession(
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  if (isMockApiMode()) {
    await delay(220)
    return mockStore.createSession(input)
  }
  await delay(120)
  const id = `session-${Date.now()}`
  let papers: FeedItem[] = []
  if (input.source === 'paper') {
    const q = input.paperQuery?.trim() ?? ''
    if (q) {
      const hits = await searchPapers(q)
      papers = hits.slice(0, 6).map(paperSearchHitToFeedItem)
    }
  }
  const title =
    input.title?.trim() ||
    (input.source === 'paper' && input.paperQuery?.trim()
      ? `Session · ${input.paperQuery.trim().slice(0, 36)}${input.paperQuery.trim().length > 36 ? '…' : ''}`
      : input.source === 'pdf'
        ? `PDF · ${(input.fileMeta?.name ?? 'upload').replace(/\.pdf$/i, '').slice(0, 36)}`
        : 'New session')
  const meta = 'You · just now'
  return { session: { id, title, meta, papers } }
}

export async function getSessionFeed(_sessionId: string): Promise<FeedItem[]> {
  if (isMockApiMode()) {
    await delay()
    const feed = mockStore.getSessionFeed(_sessionId)
    if (!feed) throw new Error('Session not found')
    return feed
  }
  return []
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

export async function setCardLike(
  cardId: string,
  liked: boolean,
): Promise<LikeResult> {
  if (isMockApiMode()) {
    await delay(90)
    return mockStore.setCardLike(cardId, liked)
  }
  if (liked) {
    await apiFetchJson(ROUTES.userLike, {
      method: 'POST',
      json: { paper_id: cardId },
    })
  } else {
    await apiFetchJson(ROUTES.userDislike, {
      method: 'DELETE',
      json: { paper_id: cardId },
    })
  }
  return { cardId, liked }
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
  return papers.map((p) => ({
    id: p.id,
    title: p.title,
    authorLine:
      p.authors?.length ? p.authors.join(', ') : 'Unknown authors',
    meta: formatPaperMeta(p.published, p.categories ?? null),
  }))
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

export async function uploadPdf(file: File): Promise<PdfUploadResult> {
  if (isMockApiMode()) {
    await delay(200)
    return mockStore.uploadPdf(file)
  }
  const body = await apiUploadPdf(file)
  return body as PdfUploadResult
}
