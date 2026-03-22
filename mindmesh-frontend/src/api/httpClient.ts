/** Paths for the MindMesh FastAPI backend (see /docs on the API server). */
export const ROUTES = {
  authLogin: '/auth/login',
  authMe: '/auth/me',
  userUpdateInterests: '/user/update_interests',
  userLikes: '/user/likes',
  userFeed: '/user/feed',
  userLike: '/user/like',
  userDislike: '/user/dislike',
  paperSearch: '/paper/search',
  paperList: '/paper/list',
  paperInsert: '/paper/insert',
  arxivSearch: '/arxiv/search',
  llmFeedSummary: '/llm/feed-summary',
} as const

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

function messageFromErrorBody(body: unknown, statusText: string): string {
  if (typeof body === 'object' && body && body !== null) {
    const o = body as Record<string, unknown>
    if (typeof o.message === 'string' && o.message.trim()) return o.message
    const detail = o.detail
    if (typeof detail === 'string' && detail.trim()) return detail
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown }
      if (typeof first?.msg === 'string') return first.msg
    }
  }
  return statusText
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

/** Unauthenticated JSON request (e.g. POST /auth/login). */
export async function apiFetchJsonPublic<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) throw new Error('apiFetchJsonPublic called without VITE_API_BASE_URL')

  const { json, headers: hdrs, ...rest } = init
  const headers = new Headers(hdrs)
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })

  const body = await parseJson(res)
  if (!res.ok) {
    throw new ApiHttpError(messageFromErrorBody(body, res.statusText), res.status, body)
  }
  return body as T
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
    throw new ApiHttpError(messageFromErrorBody(body, res.statusText), res.status, body)
  }
  return body as T
}

export async function apiUploadPdf(_file: File): Promise<unknown> {
  void _file
  throw new Error('PDF upload is not supported by the current API')
}
