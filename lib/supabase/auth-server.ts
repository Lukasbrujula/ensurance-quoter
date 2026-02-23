import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/types/database.generated"

/**
 * Server-side Supabase client that reads/writes session cookies.
 * Respects RLS — queries only return data the user is allowed to see.
 * Use in Server Components, API routes, and server actions.
 */
export async function createAuthClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can fail in Server Components (read-only cookies).
            // This is fine — the middleware handles cookie refreshing.
          }
        },
      },
    }
  )
}

/** Get current authenticated user or null (for optional auth checks). */
export async function getCurrentUser() {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/** Get current authenticated user or throw (for required auth in API routes/actions). */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  return user
}
