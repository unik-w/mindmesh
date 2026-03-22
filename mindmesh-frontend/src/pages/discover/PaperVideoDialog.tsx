import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
} from 'livekit-client'
import { btnPrimary } from '../../uiClasses'
import { gradientText } from '../../uiClasses'
import type { FeedItem } from './types'
import { paperVideoContextText } from './arxiv'
import {
  deleteBeyAgent,
  startPaperVideoSession,
} from './beyondPresenceClient'
function attachRemoteTrack(
  track: RemoteTrack,
  videoEl: HTMLVideoElement | null,
  audioEl: HTMLAudioElement | null,
  bucket: RemoteTrack[],
) {
  if (track.kind === Track.Kind.Video && videoEl) {
    track.attach(videoEl)
    bucket.push(track)
  } else if (track.kind === Track.Kind.Audio && audioEl) {
    track.attach(audioEl)
    bucket.push(track)
  }
}

type PaperVideoDialogProps = {
  post: FeedItem
  onClose: () => void
}

export function PaperVideoDialog({ post, onClose }: PaperVideoDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const roomRef = useRef<Room | null>(null)
  const agentIdRef = useRef<string | null>(null)
  const attachedTracksRef = useRef<RemoteTrack[]>([])

  const [phase, setPhase] = useState<
    'prep' | 'connecting' | 'live' | 'error' | 'mock'
  >('prep')
  const [error, setError] = useState<string | null>(null)
  const [audioHint, setAudioHint] = useState(false)

  const isMock = import.meta.env.VITE_BEY_VIDEO_MOCK === 'true'
  const hasClientKey = Boolean(import.meta.env.VITE_BEY_API_KEY?.trim())
  const hasCustomApi = Boolean(import.meta.env.VITE_BEY_API_BASE_URL?.trim())
  const setupNote =
    isMock || hasClientKey || hasCustomApi
      ? null
      : 'Dev: set BEY_API_KEY in .env (Vite proxies /bey-api). Production: set VITE_BEY_API_BASE_URL to https://api.bey.dev and VITE_BEY_API_KEY, or keep using the proxy.'

  const cleanupRoom = useCallback(() => {
    for (const t of attachedTracksRef.current) {
      try {
        t.detach()
      } catch {
        /* ignore */
      }
    }
    attachedTracksRef.current = []
    const room = roomRef.current
    roomRef.current = null
    void room?.disconnect()
    const v = videoRef.current
    const a = audioRef.current
    if (v) v.srcObject = null
    if (a) a.srcObject = null
  }, [])

  const teardown = useCallback(() => {
    cleanupRoom()
    const aid = agentIdRef.current
    agentIdRef.current = null
    if (aid) void deleteBeyAgent(aid)
  }, [cleanupRoom])

  const handleClose = useCallback(() => {
    teardown()
    onClose()
  }, [onClose, teardown])

  useEffect(() => {
    // if (isMock) {
    //   // setPhase('mock')
    //   return
    // }

    let cancelled = false
    void (async () => {
      try {
        if (!cancelled) {
          setPhase('prep')
          setError(null)
        }
        const { agentId, livekitUrl, livekitToken } =
          await startPaperVideoSession(post)
        if (cancelled) {
          void deleteBeyAgent(agentId)
          return
        }
        agentIdRef.current = agentId
        if (!cancelled) setPhase('connecting')

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        })
        roomRef.current = room

        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
          attachRemoteTrack(
            track,
            videoRef.current,
            audioRef.current,
            attachedTracksRef.current,
          )
        })

        await room.connect(livekitUrl, livekitToken)
        if (cancelled) {
          cleanupRoom()
          void deleteBeyAgent(agentId)
          return
        }

        for (const p of room.remoteParticipants.values()) {
          for (const pub of p.trackPublications.values()) {
            if (pub.track)
              attachRemoteTrack(
                pub.track,
                videoRef.current,
                audioRef.current,
                attachedTracksRef.current,
              )
          }
        }

        if (!cancelled) {
          setPhase('live')
          try {
            await room.startAudio()
          } catch {
            setAudioHint(true)
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not start video')
          setPhase('error')
        }
      }
    })()

    return () => {
      cancelled = true
      cleanupRoom()
      const aid = agentIdRef.current
      agentIdRef.current = null
      if (aid) void deleteBeyAgent(aid)
    }
  }, [post.id, isMock, cleanupRoom])

  const enableAudioClick = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    try {
      await room.startAudio()
      setAudioHint(false)
    } catch {
      /* keep hint */
    }
  }, [])

  const summaryPreview = paperVideoContextText(post).slice(0, 420)

  return createPortal(
    <div className="fixed inset-0 z-10003 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close video"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="paper-video-title"
        className="relative flex max-h-[min(92dvh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200/90 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <p
              className={`m-0 text-[0.68rem] font-semibold tracking-[0.12em] uppercase ${gradientText}`}
            >
              Beyond Presence
            </p>
            <h2
              id="paper-video-title"
              className="mt-1 font-display text-[1rem] leading-snug font-bold tracking-tight text-slate-900 sm:text-[1.1rem]"
            >
              Video explainer
            </h2>
            <p className="mt-0.5 mb-0 line-clamp-2 text-[0.8125rem] text-slate-500">
              {post.title}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50 text-lg leading-none text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 sm:px-5 [scrollbar-width:thin]">
          {/* <p className="m-0 text-[0.8125rem] leading-relaxed text-slate-600">
            A disposable agent is created with this paper’s summary as context,
            then connects over LiveKit for real-time avatar video (speech-to-video,
            not a pre-rendered file). See{' '}
            <a
              href="https://docs.bey.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-violet-700 underline decoration-violet-300 underline-offset-2"
            >
              docs.bey.dev
            </a>
            .
          </p> */}
          {setupNote ? (
            <p className="m-0 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-[0.78rem] text-amber-950">
              {setupNote}
            </p>
          ) : null}

          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-900 shadow-inner">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              muted={false}
            />
            {phase === 'prep' || phase === 'connecting' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/85 px-4 text-center text-white">
                <span className="size-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="m-0 text-sm font-medium">
                  {phase === 'prep'
                    ? 'Creating avatar session…'
                    : 'Connecting to LiveKit…'}
                </p>
              </div>
            ) : null}
            {phase === 'error' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 px-4">
                <p className="m-0 text-center text-sm text-rose-100">
                  {error ?? 'Something went wrong'}
                </p>
              </div>
            ) : null}
            {phase === 'mock' ? (
              <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-br from-violet-900/90 via-slate-900 to-cyan-900/80 p-4 text-white">
                <p className="m-0 text-[0.7rem] font-semibold tracking-wide uppercase opacity-90">
                  Mock mode
                </p>
                <p className="mt-2 mb-0 text-[0.8125rem] leading-relaxed opacity-95">
                  {summaryPreview}
                  {paperVideoContextText(post).length > 420 ? '…' : ''}
                </p>
              </div>
            ) : null}
          </div>

          <audio ref={audioRef} autoPlay className="sr-only" />

          {audioHint && phase === 'live' ? (
            <button
              type="button"
              onClick={() => void enableAudioClick()}
              className={`${btnPrimary} w-full justify-center px-4 py-2 text-[0.875rem]`}
            >
              Tap to enable sound
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
