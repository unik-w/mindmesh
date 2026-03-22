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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
