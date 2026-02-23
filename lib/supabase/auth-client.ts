import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database.generated"

/** Browser-side Supabase client for auth operations (sign in, sign up, sign out). */
export function createAuthBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }
  return createBrowserClient<Database>(url, anonKey)
}
