import type { FeedItem } from './types'
import { arxivAbsUrl, arxivIdForPost, paperVideoContextText } from './arxiv'

const MAX_SYSTEM_PROMPT = 10_000

export function beyApiOrigin(): string {
  const custom = import.meta.env.VITE_BEY_API_BASE_URL?.trim()
  if (custom) return custom.replace(/\/$/, '')
  return `${window.location.origin}/bey-api`
}

async function beyFetch(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<Response> {
  const origin = beyApiOrigin()
  const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`
  const { json, headers: hdrs, ...rest } = init
  const headers = new Headers(hdrs)
  if (json !== undefined) headers.set('Content-Type', 'application/json')
  const key = import.meta.env.VITE_BEY_API_KEY?.trim()
  if (key) headers.set('x-api-key', key)

  return fetch(url, {
    ...rest,
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
}

async function parseError(res: Response): Promise<string> {
  const t = await res.text()
  try {
    const j = JSON.parse(t) as {
      detail?: unknown
      message?: string
    }
    if (typeof j.message === 'string') return j.message
    if (Array.isArray(j.detail)) {
      const first = j.detail[0] as { msg?: string }
      if (typeof first?.msg === 'string') return first.msg
    }
    if (typeof j.detail === 'string') return j.detail
  } catch {
    if (t) return t.slice(0, 240)
  }
  return res.statusText || `Request failed (${res.status})`
}

export type BeyAvatarRow = {
  id: string
  name?: string
  status?: string
}

export async function listBeyAvatars(): Promise<BeyAvatarRow[]> {
  const res = await beyFetch('/v1/avatars?limit=30', { method: 'GET' })
  if (!res.ok) throw new Error(await parseError(res))
  const data = (await res.json()) as
    | BeyAvatarRow[]
    | { data?: BeyAvatarRow[] }
  if (Array.isArray(data)) return data
  return data.data ?? []
}

export function pickAvatarId(
  rows: BeyAvatarRow[],
  preferred?: string | null,
): string {
  const p = preferred?.trim()
  if (p && rows.some((r) => r.id === p)) return p
  const ready = rows.filter((r) => r.status === 'available')
  const pool = ready.length > 0 ? ready : rows
  const id = pool[0]?.id
  if (!id) throw new Error('No Beyond Presence avatars available for this API key.')
  return id
}

function buildSystemPrompt(post: FeedItem): string {
  const abs = arxivAbsUrl(post)
  const bodyText = paperVideoContextText(post)
  const ctx = [
    `Paper title: ${post.title}`,
    `Authors: ${post.authorLine}`,
    `arXiv abstract page: ${abs}`,
    `arXiv id: ${arxivIdForPost(post)}`,
    '',
    'Paper summary (your only factual source—describe THIS work only):',
    bodyText || '(No summary text was provided; rely on title and authors only, and say to open the arXiv page for full detail.)',
  ].join('\n')

  const head = `You are explaining one research paper on a live video call. Everything you say must be about THIS paper’s research: the problem or question, the proposed approach or method, and the results, claims, or contributions described in CONTEXT—nothing else.

Speak in short, natural segments for a technical audience. Use only CONTEXT for facts; do not invent details. Do not discuss the video product, avatars, LiveKit, or how this call works. Do not pivot to generic research advice unless CONTEXT explicitly ties it to this paper. If asked about something not in CONTEXT, say the materials here do not cover it and point to the arXiv link.

CONTEXT
---
`
  const tail = '\n---'
  const budget = MAX_SYSTEM_PROMPT - head.length - tail.length
  const body = ctx.length <= budget ? ctx : `${ctx.slice(0, budget - 20)}\n[…truncated]`
  return `${head}${body}${tail}`
}

export async function createPaperVideoAgent(
  post: FeedItem,
  avatarId: string,
): Promise<string> {
  const system_prompt = buildSystemPrompt(post)
  const res = await beyFetch('/v1/agents', {
    method: 'POST',
    json: {
      name: `Paper · ${post.title.slice(0, 72)}${post.title.length > 72 ? '…' : ''}`,
      avatar_id: avatarId,
      system_prompt,
      greeting:
        'Hi—I will walk you through what this paper is about: the research question, their approach, and the main findings.',
      language: 'en',
      max_session_length_minutes: 15,
    },
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as { id?: string }
  if (!body.id) throw new Error('Create agent response missing id')
  return body.id
}

export type BeyCallCredentials = {
  livekit_url: string
  livekit_token: string
}

export async function createBeyCall(agentId: string): Promise<BeyCallCredentials> {
  const res = await beyFetch('/v1/calls', {
    method: 'POST',
    json: {
      agent_id: agentId,
      livekit_username: 'Researcher',
    },
  })
  if (!res.ok) throw new Error(await parseError(res))
  const body = (await res.json()) as Partial<BeyCallCredentials>
  if (!body.livekit_url || !body.livekit_token) {
    throw new Error('Create call response missing LiveKit credentials')
  }
  return {
    livekit_url: body.livekit_url,
    livekit_token: body.livekit_token,
  }
}

export async function deleteBeyAgent(agentId: string): Promise<void> {
  const res = await beyFetch(`/v1/agents/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
  })
  if (!res.ok && res.status !== 404) {
    console.warn('Beyond Presence delete agent failed:', await parseError(res))
  }
}

export async function startPaperVideoSession(post: FeedItem): Promise<{
  agentId: string
  livekitUrl: string
  livekitToken: string
}> {
  const rows = await listBeyAvatars()
  const avatarId = pickAvatarId(
    rows,
    import.meta.env.VITE_BEY_AVATAR_ID?.trim() ?? null,
  )
  const agentId = await createPaperVideoAgent(post, avatarId)
  const { livekit_url, livekit_token } = await createBeyCall(agentId)
  return {
    agentId,
    livekitUrl: livekit_url,
    livekitToken: livekit_token,
  }
}
