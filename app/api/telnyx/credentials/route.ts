import { NextResponse } from "next/server"

/* ------------------------------------------------------------------ */
/*  GET /api/telnyx/credentials                                        */
/*  Returns SIP login/password for persistent WebRTC registration.     */
/*  This enables inbound call routing to the browser client.           */
/* ------------------------------------------------------------------ */

// TODO(P5): Add auth check — credentials grant telephony access
export async function GET() {
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
      return NextResponse.json(
        { error: `Failed to fetch connection: ${errBody}` },
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

    return NextResponse.json({ login, password, callerNumber })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch SIP credentials" },
      { status: 500 },
    )
  }
}
