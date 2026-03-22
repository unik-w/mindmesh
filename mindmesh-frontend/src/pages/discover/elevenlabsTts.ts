/** Default voice "George" from ElevenLabs docs; override with VITE_ELEVENLABS_VOICE_ID */
export const DEFAULT_ELEVENLABS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'

/** Stable default; override with VITE_ELEVENLABS_MODEL_ID (e.g. eleven_v3). */
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2'
const MAX_CHARS = 4_000

let activeObjectUrl: string | null = null
let activeAudio: HTMLAudioElement | null = null

function revokeActive() {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.removeAttribute('src')
    activeAudio.querySelectorAll('source').forEach((s) => {
      s.removeAttribute('src')
    })
    activeAudio.load()
    activeAudio.remove()
    activeAudio = null
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl)
    activeObjectUrl = null
  }
}

async function readElevenLabsErrorMessage(res: Response): Promise<string> {
  const raw = await res.text()
  try {
    const j = JSON.parse(raw) as unknown
    if (typeof j === 'object' && j !== null && 'detail' in j) {
      const d = (j as { detail: unknown }).detail
      if (typeof d === 'string') return d
      if (Array.isArray(d) && d[0] && typeof d[0] === 'object') {
        const msg = (d[0] as { msg?: string }).msg
        if (typeof msg === 'string') return msg
      }
      if (typeof d === 'object' && d !== null && 'message' in d) {
        const m = (d as { message?: string }).message
        if (typeof m === 'string') return m
      }
    }
  } catch {
    /* use raw */
  }
  return raw.trim() || res.statusText || `HTTP ${res.status}`
}

export function stopElevenLabsPlayback() {
  revokeActive()
}

function prepareSpeechText(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= MAX_CHARS) return collapsed
  return `${collapsed.slice(0, MAX_CHARS - 1)}…`
}

export async function fetchElevenLabsSpeech(
  text: string,
  apiKey: string,
  opts?: { voiceId?: string; modelId?: string },
): Promise<Blob> {
  const voiceId = opts?.voiceId ?? DEFAULT_ELEVENLABS_VOICE_ID
  const modelId = opts?.modelId ?? DEFAULT_MODEL_ID
  const prepared = prepareSpeechText(text)
  if (!prepared) {
    throw new Error('Nothing to speak')
  }

  const url = new URL(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
  )
  url.searchParams.set('output_format', 'mp3_44100_128')

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: prepared,
      model_id: modelId,
    }),
  })

  if (!res.ok) {
    const detail = await readElevenLabsErrorMessage(res)
    throw new Error(detail || `ElevenLabs request failed (${res.status})`)
  }

  const blob = await res.blob()
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('mpeg') && !ct.includes('octet-stream') && blob.size > 0) {
    const head = await blob.slice(0, 4).text()
    if (head.trimStart().startsWith('{')) {
      throw new Error(
        (await readElevenLabsErrorMessage(
          new Response(blob, { status: res.status, headers: res.headers }),
        )) || 'Unexpected JSON from ElevenLabs (expected audio)',
      )
    }
  }
  if (blob.size === 0) {
    throw new Error('ElevenLabs returned empty audio')
  }
  return blob.type.startsWith('audio/')
    ? blob
    : new Blob([blob], { type: 'audio/mpeg' })
}

export async function playElevenLabsSpeech(
  text: string,
  apiKey: string,
  opts?: { voiceId?: string; modelId?: string },
): Promise<void> {
  revokeActive()
  const blob = await fetchElevenLabsSpeech(text, apiKey, opts)
  activeObjectUrl = URL.createObjectURL(blob)

  const audio = document.createElement('audio')
  audio.setAttribute('playsinline', '')
  audio.preload = 'auto'
  audio.style.display = 'none'
  const source = document.createElement('source')
  source.src = activeObjectUrl
  source.type = 'audio/mpeg'
  audio.appendChild(source)
  document.body.appendChild(audio)
  activeAudio = audio

  const onPlaybackError = () => {
    const code = audio.error?.code
    const map: Record<number, string> = {
      1: 'MEDIA_ERR_ABORTED',
      2: 'MEDIA_ERR_NETWORK',
      3: 'MEDIA_ERR_DECODE',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
    }
    const label = code != null ? map[code] ?? String(code) : 'unknown'
    console.error('ElevenLabs audio element error:', label, audio.error)
  }

  audio.addEventListener('ended', revokeActive)
  audio.addEventListener('error', () => {
    onPlaybackError()
    revokeActive()
  })
  audio.load()
  try {
    await audio.play()
  } catch (err) {
    onPlaybackError()
    revokeActive()
    throw err instanceof Error ? err : new Error(String(err))
  }
}
