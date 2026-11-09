/**
 * Public (browser-safe) configuration. Server-only secrets (ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY)
 * are never read here and must never be prefixed NEXT_PUBLIC_.
 */
export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.');
  }
  return { url, key };
}
