const ROUTES = {
  authToken: '/v1/auth/token',
  interests: '/v1/users/me/interests',
  discoveryFeed: '/v1/discovery/feed',
  sessions: '/v1/sessions',
  sessionFeed: (id: string) => `/v1/sessions/${encodeURIComponent(id)}/feed`,
  joinSession: (id: string) => `/v1/sessions/${encodeURIComponent(id)}/join`,
  cardLike: (id: string) => `/v1/cards/${encodeURIComponent(id)}/like`,
  cardComments: (id: string) => `/v1/cards/${encodeURIComponent(id)}/comments`,
  profile: '/v1/users/me/profile',
  sponsors: '/v1/sponsors/researches',
  searchPapers: '/v1/search/papers',
  searchAuthors: '/v1/search/authors',
  uploadPdf: '/v1/uploads/pdf',
} as const

export { ROUTES }

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  return typeof raw === 'string' ? raw.replace(/\/$/, '') : ''
}

/** Not a React hook — mock transport when there is no API base URL. */
export function isMockApiMode(): boolean {
  if (import.meta.env.VITE_USE_MOCK_API === 'true') return true
  return getApiBaseUrl() === ''
}

let bearerToken: string | null = null

export function setApiBearerToken(token: string | null) {
  bearerToken = token
}

export class ApiHttpError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
    this.body = body
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

export async function apiFetchJson<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) throw new Error('apiFetchJson called without VITE_API_BASE_URL')

  const { json, headers: hdrs, ...rest } = init
  const headers = new Headers(hdrs)
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  if (bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`)
  }

  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })

  const body = await parseJson(res)
  if (!res.ok) {
    throw new ApiHttpError(
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message)
        : res.statusText,
      res.status,
      body,
    )
  }
  return body as T
}

export async function apiUploadPdf(file: File): Promise<unknown> {
  const base = getApiBaseUrl()
  if (!base) throw new Error('apiUploadPdf called without VITE_API_BASE_URL')

  const fd = new FormData()
  fd.append('file', file, file.name)

  const headers = new Headers()
  if (bearerToken) {
    headers.set('Authorization', `Bearer ${bearerToken}`)
  }

  const res = await fetch(`${base}${ROUTES.uploadPdf}`, {
    method: 'POST',
    headers,
    body: fd,
  })

  const body = await parseJson(res)
  if (!res.ok) {
    throw new ApiHttpError(
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message)
        : res.statusText,
      res.status,
      body,
    )
  }
  return body
}
