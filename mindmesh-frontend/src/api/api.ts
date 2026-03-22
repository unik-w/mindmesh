import { demoProfile } from '../pages/discover/data'
import {
  apiFetchJson,
  apiUploadPdf,
  ROUTES,
  isMockApiMode,
  setApiBearerToken,
} from './httpClient'
import { mockStore } from './mockStore'
import type {
  AuthorSearchHit,
  CardComment,
  CreateSessionInput,
  CreateSessionResult,
  FeedItem,
  LikeResult,
  PaperSearchHit,
  PdfUploadResult,
  SessionSummary,
  SponsorResearch,
  UserProfile,
} from './types'

const PROFILE_STORAGE_KEY = 'mindmesh_profile_v1'

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

export { setApiBearerToken }

export async function syncAuthToken(idToken: string): Promise<void> {
  if (isMockApiMode()) {
    setApiBearerToken(idToken)
    await delay(120)
    return
  }
  setApiBearerToken(idToken)
  await apiFetchJson(ROUTES.authToken, {
    method: 'POST',
    json: { idToken },
  })
}

export async function getSavedInterests(): Promise<string[]> {
  if (isMockApiMode()) {
    await delay(40)
    return mockStore.getInterests()
  }
  const res = await apiFetchJson<{ interestIds: string[] }>(ROUTES.interests, {
    method: 'GET',
  })
  return res.interestIds ?? []
}

export async function saveInterests(interestIds: string[]): Promise<void> {
  if (isMockApiMode()) {
    await delay()
    mockStore.setInterests(interestIds)
    return
  }
  await apiFetchJson(ROUTES.interests, {
    method: 'PUT',
    json: { interestIds },
  })
}

export async function getUserLikes(): Promise<Record<string, boolean>> {
  if (isMockApiMode()) {
    await delay(20)
    return mockStore.exportUserLikes()
  }
  return apiFetchJson<Record<string, boolean>>('/v1/users/me/likes', {
    method: 'GET',
  })
}

export async function getPersistedComments(): Promise<
  Record<string, CardComment[]>
> {
  if (isMockApiMode()) {
    await delay(20)
    return mockStore.exportCommentsByCard()
  }
  return apiFetchJson<Record<string, CardComment[]>>(
    '/v1/users/me/comments',
    { method: 'GET' },
  )
}

export async function getDiscoveryFeed(
  interestIds: string[],
): Promise<FeedItem[]> {
  if (isMockApiMode()) {
    await delay()
    return mockStore.getDiscoveryFeed(interestIds)
  }
  const q = interestIds.map(encodeURIComponent).join(',')
  return apiFetchJson<FeedItem[]>(
    `${ROUTES.discoveryFeed}?interests=${q}`,
    { method: 'GET' },
  )
}

export async function listSessions(): Promise<SessionSummary[]> {
  if (isMockApiMode()) {
    await delay()
    return mockStore.listSessions()
  }
  return apiFetchJson<SessionSummary[]>(ROUTES.sessions, { method: 'GET' })
}

export async function createSession(
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  if (isMockApiMode()) {
    await delay(220)
    return mockStore.createSession(input)
  }
  return apiFetchJson<CreateSessionResult>(ROUTES.sessions, {
    method: 'POST',
    json: input,
  })
}

export async function getSessionFeed(sessionId: string): Promise<FeedItem[]> {
  if (isMockApiMode()) {
    await delay()
    const feed = mockStore.getSessionFeed(sessionId)
    if (!feed) throw new Error('Session not found')
    return feed
  }
  return apiFetchJson<FeedItem[]>(ROUTES.sessionFeed(sessionId), {
    method: 'GET',
  })
}

export async function joinSession(sessionId: string): Promise<void> {
  if (isMockApiMode()) {
    await delay(80)
    mockStore.joinSession(sessionId)
    return
  }
  await apiFetchJson(ROUTES.joinSession(sessionId), { method: 'POST' })
}

export async function setCardLike(
  cardId: string,
  liked: boolean,
): Promise<LikeResult> {
  if (isMockApiMode()) {
    await delay(90)
    return mockStore.setCardLike(cardId, liked)
  }
  return apiFetchJson<LikeResult>(ROUTES.cardLike(cardId), {
    method: 'POST',
    json: { liked },
  })
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
  return apiFetchJson<CardComment>(ROUTES.cardComments(cardId), {
    method: 'POST',
    json: { body, author },
  })
}

export async function getProfile(): Promise<UserProfile> {
  if (isMockApiMode()) {
    await delay(60)
    return loadProfileFromStorage()
  }
  return apiFetchJson<UserProfile>(ROUTES.profile, { method: 'GET' })
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
  return apiFetchJson<UserProfile>(ROUTES.profile, {
    method: 'PATCH',
    json: partial,
  })
}

export async function getSponsoredResearches(): Promise<SponsorResearch[]> {
  if (isMockApiMode()) {
    await delay(60)
    return mockStore.getSponsoredResearches()
  }
  return apiFetchJson<SponsorResearch[]>(ROUTES.sponsors, { method: 'GET' })
}

export async function searchPapers(query: string): Promise<PaperSearchHit[]> {
  if (isMockApiMode()) {
    await delay(120)
    return mockStore.searchPapers(query)
  }
  const q = encodeURIComponent(query.trim())
  return apiFetchJson<PaperSearchHit[]>(
    `${ROUTES.searchPapers}?q=${q}`,
    { method: 'GET' },
  )
}

export async function searchAuthors(query: string): Promise<AuthorSearchHit[]> {
  if (isMockApiMode()) {
    await delay(120)
    return mockStore.searchAuthors(query)
  }
  const q = encodeURIComponent(query.trim())
  return apiFetchJson<AuthorSearchHit[]>(
    `${ROUTES.searchAuthors}?q=${q}`,
    { method: 'GET' },
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
