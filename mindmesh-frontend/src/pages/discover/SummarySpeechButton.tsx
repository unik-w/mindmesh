import {
  useCallback,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { MicIcon } from './icons'
import { playElevenLabsSpeech, stopElevenLabsPlayback } from './elevenlabsTts'

type SummarySpeechButtonProps = {
  text: string
  /** Shown when API key is missing */
  missingKeyHint?: string
  className?: string
}

export function SummarySpeechButton({
  text,
  missingKeyHint = 'Add VITE_ELEVENLABS_API_KEY to your .env file.',
  className = '',
}: SummarySpeechButtonProps) {
  const [busy, setBusy] = useState(false)
  const [errHint, setErrHint] = useState<string | null>(null)
  const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY?.trim()
  const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID?.trim()
  const modelId = import.meta.env.VITE_ELEVENLABS_MODEL_ID?.trim()

  const plain = text.replace(/\s+/g, ' ').trim()
  const disabled = !plain || busy || !apiKey

  const onClick = useCallback(
    async (e: ReactMouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      e.preventDefault()
      if (!apiKey || !plain) return
      setBusy(true)
      setErrHint(null)
      try {
        await playElevenLabsSpeech(plain, apiKey, {
          voiceId: voiceId || undefined,
          modelId: modelId || undefined,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setErrHint(msg)
        console.error('ElevenLabs TTS failed:', err)
        stopElevenLabsPlayback()
      } finally {
        setBusy(false)
      }
    },
    [apiKey, plain, voiceId, modelId],
  )

  const title = !apiKey
    ? missingKeyHint
    : errHint
      ? `TTS failed: ${errHint}`
      : busy
        ? 'Generating audio…'
        : 'Play summary with ElevenLabs'

  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-label={title}
      onClick={(e) => void onClick(e)}
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 ${className}`}
    >
      {busy ? (
        <span
          className="size-4.5 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600"
          aria-hidden
        />
      ) : (
        <MicIcon className="size-4.5" />
      )}
    </button>
  )
}
