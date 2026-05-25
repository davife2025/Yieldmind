import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types/supabase"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Check your .env.local file.")
}

// ── Browser client (anon key, safe for client components) ──────────────────
export const createBrowserClient = () =>
  createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true },
  })

// ── Server client (service role — NEVER expose to browser) ─────────────────
export const createServerClient = () => {
  if (!supabaseServiceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Required for server-side operations.")
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

// ── Singleton browser client for client components ─────────────────────────
let _browserClient: ReturnType<typeof createBrowserClient> | null = null

export const getBrowserClient = () => {
  if (!_browserClient) _browserClient = createBrowserClient()
  return _browserClient
}
