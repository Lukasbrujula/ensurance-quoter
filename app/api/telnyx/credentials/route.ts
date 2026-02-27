import { NextResponse } from "next/server"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"
import { requireAuth } from "@/lib/middleware/auth-guard"

/* ------------------------------------------------------------------ */
/*  GET /api/telnyx/credentials                                        */
/*  Returns SIP login/password for persistent WebRTC registration.     */
/*  This enables inbound call routing to the browser client.           */
/* ------------------------------------------------------------------ */

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.auth, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const apiKey = process.env.TELNYX_API_KEY
  const connectionId = process.env.TELNYX_CONNECTION_ID
  const callerNumber = process.env.TELNYX_CALLER_NUMBER

  if (!apiKey || !connectionId || !callerNumber) {
    return NextResponse.json(
      { error: "Telnyx credentials not configured" },
      { status: 500 },
    )
  }

  try {
    // Fetch the connection details to get SIP username/password
    const res = await fetch(
      `https://api.telnyx.com/v2/credential_connections/${encodeURIComponent(connectionId)}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!res.ok) {
      const errBody = await res.text().catch(() => "")
      console.error("[telnyx/credentials] Connection fetch failed:", res.status, errBody.slice(0, 200))
      return NextResponse.json(
        { error: "Failed to fetch connection credentials" },
        { status: 502 },
      )
    }

    const data = await res.json()
    const login: unknown = data?.data?.user_name
    const password: unknown = data?.data?.password

    if (typeof login !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "No SIP credentials on this connection" },
        { status: 502 },
      )
    }

    // TelnyxRTC requires SIP login + password client-side for persistent
    // credential-based registration (inbound call routing). The token-based
    // approach (/api/telnyx/token) only supports outbound calls. No way to
    // avoid sending the password to the browser for inbound SIP registration.
    return NextResponse.json(
      { login, password, callerNumber },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Pragma": "no-cache",
        },
      },
    )
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch SIP credentials" },
      { status: 500 },
    )
  }
}
