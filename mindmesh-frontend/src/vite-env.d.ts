/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string | undefined
  readonly VITE_USE_MOCK_API: string | undefined
  readonly VITE_SUPABASE_URL: string | undefined
  readonly VITE_SUPABASE_ANON_KEY: string | undefined
  /** ElevenLabs TTS (browser calls API directly—use only with keys you accept exposing in the client bundle) */
  readonly VITE_ELEVENLABS_API_KEY: string | undefined
  readonly VITE_ELEVENLABS_VOICE_ID: string | undefined
  readonly VITE_ELEVENLABS_MODEL_ID: string | undefined
  /** Beyond Presence REST API (default in dev: same-origin /bey-api via Vite proxy) */
  readonly VITE_BEY_API_BASE_URL: string | undefined
  /** Optional; dev proxy uses BEY_API_KEY from .env instead */
  readonly VITE_BEY_API_KEY: string | undefined
  readonly VITE_BEY_AVATAR_ID: string | undefined
  /** UI-only preview without calling Beyond Presence or LiveKit */
  readonly VITE_BEY_VIDEO_MOCK: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
