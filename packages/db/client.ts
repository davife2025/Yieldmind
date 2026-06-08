import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types/supabase"

// Lazy getters — evaluated at call time, not module load time
// This prevents the client from crashing Next.js builds when env vars
// aren't present during static analysis / type-checking
const getSupabaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set. Check your .env.local file.")
  return url
}

const getAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Check your .env.local file.")
  return key
}

const getServiceKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Required for server-side operations.")
  return key
}

// ── Browser client (anon key — safe for client components) ─────────────────
export const createBrowserClient = () =>
  createClient<Database>(getSupabaseUrl(), getAnonKey(), {
    auth: { persistSession: true },
  })

// ── Server client (service role — NEVER expose to browser) ─────────────────
export const createServerClient = () =>
  createClient<Database>(getSupabaseUrl(), getServiceKey(), {
    auth: { persistSession: false },
  })

// ── Singleton browser client (one instance per browser session) ────────────
let _browserClient: ReturnType<typeof createBrowserClient> | null = null

export const getBrowserClient = () => {
  if (!_browserClient) _browserClient = createBrowserClient()
  return _browserClient
}
