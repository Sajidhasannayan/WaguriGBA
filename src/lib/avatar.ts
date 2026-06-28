/** Resolve an avatar URL — just returns it directly (no Supabase storage). */
export function resolveAvatarUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return value;
}
