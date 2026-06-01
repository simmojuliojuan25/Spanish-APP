import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    // Prefer non-NEXT_PUBLIC_ names so the value is read at runtime rather than
    // inlined at build time. NEXT_PUBLIC_ vars are baked into the server bundle
    // by Next.js, so a value that was wrong at build time can't be fixed by
    // updating the Vercel environment variable without a full rebuild.
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase environment variables are not set (set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel)')
    _client = createClient(url, key)
  }
  return _client
}
