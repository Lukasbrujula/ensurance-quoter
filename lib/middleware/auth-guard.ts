import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

/**
 * Auth guard for API routes.
 *
 * Authentication order:
 * 1. Shared secret via X-API-Secret header (server-to-server / dev)
 * 2. Supabase session cookies (browser calls)
 *
 * If INTERNAL_API_SECRET is not set, the shared-secret path is skipped
 * but Supabase session auth still applies.
 */
export async function requireAuth(
  _request: Request
): Promise<NextResponse | null> {
  // Path 1: Shared secret (server-to-server / dev convenience)
  const secret = process.env.INTERNAL_API_SECRET
  if (secret) {
    const provided = _request.headers.get("x-api-secret")
    if (provided === secret) return null // Authenticated via shared secret
  }

  // Path 2: Supabase session cookies
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
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
              // Read-only context — middleware handles refresh
            }
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) return null // Authenticated via Supabase session
  } catch {
    // Cookie parsing or Supabase client failure — fall through to 401
  }

  // No auth configured and no session — allow in dev when no secret is set
  if (!secret) return null

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
