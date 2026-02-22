import { NextResponse } from "next/server"
import { z } from "zod"
import { telnyxLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"

/* ------------------------------------------------------------------ */
/*  POST /api/telnyx/token                                             */
/*  Generate a JWT token for TelnyxRTC client authentication.          */
/*  Two-step: create a telephony credential, then generate a token.    */
/*  Credentials stay server-side — only the token reaches the client.  */
/* ------------------------------------------------------------------ */

const RequestSchema = z.object({
  leadId: z.string().uuid().optional(),
})

// TODO(P5): Add auth check — this endpoint grants telephony access (real cost per call)
export async function POST(request: Request) {
  const rl = telnyxLimiter.check(getRateLimitKey(request))
  if (!rl.allowed) return rateLimitResponse(rl)

  const apiKey = process.env.TELNYX_API_KEY
  const connectionId = process.env.TELNYX_CONNECTION_ID
  const callerNumber = process.env.TELNYX_CALLER_NUMBER

  if (!apiKey || !connectionId || !callerNumber) {
    return NextResponse.json(
      { error: "Telnyx credentials not configured" },
      { status: 500 },
    )
  }

  // Validate request body (leadId optional — omitted for persistent inbound connection)
  let body: z.infer<typeof RequestSchema>
  try {
    const raw = await request.json()
    body = RequestSchema.parse(raw)
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    )
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  }

  try {
    // Step 1: Create a short-lived telephony credential for this connection
    const credResponse = await fetch(
      "https://api.telnyx.com/v2/telephony_credentials",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ connection_id: connectionId }),
      },
    )

    if (!credResponse.ok) {
      const errBody = await credResponse.text().catch(() => "")
      return NextResponse.json(
        { error: `Failed to create telephony credential: ${errBody}` },
        { status: 502 },
      )
    }

    const credData = await credResponse.json()
    const credentialId: unknown = credData?.data?.id
    if (typeof credentialId !== "string" || credentialId.length === 0) {
      return NextResponse.json(
        { error: "Invalid credential response from Telnyx" },
        { status: 502 },
      )
    }

    // Step 2: Generate a JWT token from the credential
    // Note: this endpoint returns the raw JWT string, not JSON
    const tokenResponse = await fetch(
      `https://api.telnyx.com/v2/telephony_credentials/${encodeURIComponent(credentialId)}/token`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      },
    )

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text().catch(() => "")
      return NextResponse.json(
        { error: `Failed to generate call token: ${errBody}` },
        { status: 502 },
      )
    }

    const token = await tokenResponse.text()
    if (!token || token.length === 0) {
      return NextResponse.json(
        { error: "Invalid token response from Telnyx" },
        { status: 502 },
      )
    }

    return NextResponse.json({
      token,
      callerNumber,
      leadId: body.leadId,
    })
  } catch {
    return NextResponse.json(
      { error: "Failed to generate call token. Please try again." },
      { status: 500 },
    )
  }
}
