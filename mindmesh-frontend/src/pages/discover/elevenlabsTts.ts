/** Default voice "George" from ElevenLabs docs; override with VITE_ELEVENLABS_VOICE_ID */
export const DEFAULT_ELEVENLABS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'

const DEFAULT_MODEL_ID = 'eleven_v3'
const MAX_CHARS = 4_000

let activeObjectUrl: string | null = null
let activeAudio: HTMLAudioElement | null = null

function revokeActive() {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio.removeAttribute('src')
    activeAudio.load()
    activeAudio = null
  }
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl)
    activeObjectUrl = null
  }
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
    let detail = res.statusText
    try {
      const errBody = (await res.json()) as { detail?: { message?: string } }
      if (errBody?.detail?.message) detail = errBody.detail.message
    } catch {
      try {
        detail = await res.text()
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail || `ElevenLabs request failed (${res.status})`)
  }

  return res.blob()
}

export async function playElevenLabsSpeech(
  text: string,
  apiKey: string,
  opts?: { voiceId?: string; modelId?: string },
): Promise<void> {
  revokeActive()
  const blob = await fetchElevenLabsSpeech(text, apiKey, opts)
  activeObjectUrl = URL.createObjectURL(blob)
  const audio = new Audio(activeObjectUrl)
  activeAudio = audio
  audio.addEventListener('ended', revokeActive)
  audio.addEventListener('error', revokeActive)
  await audio.play()
}
