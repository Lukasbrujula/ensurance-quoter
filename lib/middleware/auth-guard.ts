import { auth } from "@clerk/nextjs/server"
import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"

/**
 * Auth guard for API routes.
 *
 * Authentication order:
 * 1. Shared secret via X-API-Secret header (server-to-server)
 * 2. Clerk session (browser calls)
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

  // Path 2: Clerk session
  const { userId } = await auth()
  if (userId) return null

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

/** Constant-time string comparison to prevent timing attacks. */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
