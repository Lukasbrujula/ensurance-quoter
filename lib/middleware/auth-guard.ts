import { timingSafeEqual } from "crypto"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

/**
 * Auth guard for API routes.
 *
 * Authentication order:
 * 1. Shared secret via X-API-Secret header (server-to-server)
 * 2. Supabase session cookies (browser calls)
 *
 * Always returns 401 if no auth method succeeds.
 */
export async function requireAuth(
  _request: Request
): Promise<NextResponse | null> {
  // Path 1: Shared secret (server-to-server)
  const secret = process.env.INTERNAL_API_SECRET
  if (secret) {
    const provided = _request.headers.get("x-api-secret")
    if (provided && safeCompare(provided, secret)) return null
  }

  // Path 2: Supabase session cookies
  try {
    const cookieStore = await cookies()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const supabase = createServerClient(
      url,
      anonKey,
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

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

/** Constant-time string comparison to prevent timing attacks. */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
