import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database.generated"

/**
 * Server-side Supabase client authenticated via Clerk JWT.
 * Respects RLS — requesting_user_id() resolves from the Clerk token.
 * Use in Server Components, API routes, and server actions.
 */
export async function createClerkSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  const { getToken } = await auth()
  const token = await getToken()

  return createClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

/**
 * Get the current Clerk user ID or throw.
 * Drop-in replacement for the old requireUser() — returns { id, ... }
 * so callers using `user.id` continue to work.
 */
export async function requireClerkUser(): Promise<{ id: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  return { id: userId }
}
