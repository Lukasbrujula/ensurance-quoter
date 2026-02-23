import { NextResponse } from "next/server"

/**
 * Interim auth guard — validates a shared secret header.
 * Replace with Supabase Auth JWT validation in Phase 5.
 *
 * If INTERNAL_API_SECRET is not set, the guard is disabled (dev mode).
 * In production, set INTERNAL_API_SECRET to a random 32+ char string.
 */
export function requireAuth(request: Request): NextResponse | null {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) return null // Guard disabled — no secret configured

  const provided = request.headers.get("x-api-secret")
  if (provided === secret) return null // Authenticated

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
