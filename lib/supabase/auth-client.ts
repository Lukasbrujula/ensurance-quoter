import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database.generated"

/** Browser-side Supabase client for auth operations (sign in, sign up, sign out). */
export function createAuthBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
