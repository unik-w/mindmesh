import type { User } from '@supabase/supabase-js'

function metadataString(
  meta: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const v = meta?.[key]
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

export function supabaseDisplayName(user: User | null): string | undefined {
  if (!user) return undefined
  const meta = user.user_metadata as Record<string, unknown> | undefined
  return (
    metadataString(meta, 'full_name') ||
    metadataString(meta, 'name') ||
    user.email?.split('@')[0]
  )
}

export function supabaseAvatarUrl(user: User | null): string | undefined {
  if (!user) return undefined
  const meta = user.user_metadata as Record<string, unknown> | undefined
  return (
    metadataString(meta, 'avatar_url') || metadataString(meta, 'picture')
  )
}

export function supabaseAccountInitials(user: User | null): string {
  const name = supabaseDisplayName(user)?.trim()
  if (name && !name.includes('@')) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  const local = user?.email?.split('@')[0] ?? '?'
  return local.slice(0, 2).toUpperCase()
}
