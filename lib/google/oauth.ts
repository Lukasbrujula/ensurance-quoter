/* ------------------------------------------------------------------ */
/*  Google OAuth Client Factory                                        */
/*  Creates OAuth2 clients, generates auth URLs, exchanges codes.      */
/* ------------------------------------------------------------------ */

import { createHmac, timingSafeEqual } from "crypto"
import { google } from "googleapis"

/* ------------------------------------------------------------------ */
/*  HMAC signing for OAuth state parameter                             */
/* ------------------------------------------------------------------ */

function getSigningSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) throw new Error("INTERNAL_API_SECRET required for OAuth state signing")
  return secret
}

/** Sign a payload string with HMAC-SHA256 and return `payload.signature`. */
function signState(payload: string): string {
  const sig = createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex")
  return `${payload}.${sig}`
}

/** Verify an HMAC-signed state string. Returns the payload if valid, null otherwise. */
function verifyState(signed: string): string | null {
  const lastDot = signed.lastIndexOf(".")
  if (lastDot === -1) return null

  const payload = signed.slice(0, lastDot)
  const signature = signed.slice(lastDot + 1)

  const expected = createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex")

  // Timing-safe comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(signature, "hex")
    const expBuf = Buffer.from(expected, "hex")
    if (sigBuf.length !== expBuf.length) return null
    if (!timingSafeEqual(sigBuf, expBuf)) return null
  } catch {
    return null
  }

  return payload
}

/**
 * Create a bare OAuth2 client from environment variables.
 * Returns null if Google Calendar is not configured.
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return null
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/** Check if Google Calendar integration is configured via env vars. */
export function isGoogleConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI
  )
}

/** Standard scope sets by service. */
const SCOPES: Record<string, string[]> = {
  calendar: ["https://www.googleapis.com/auth/calendar.events"],
  gmail: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
  ],
}

export type GoogleService = "calendar" | "gmail"

/**
 * Generate the Google OAuth consent URL.
 * `state` carries the user ID, service, and optional returnTo path so the
 * callback can associate tokens and redirect back.
 *
 * `service` controls which scopes are requested. Uses incremental
 * authorization (`include_granted_scopes`) so existing grants are preserved.
 */
export function generateAuthUrl(
  userId: string,
  returnTo?: string,
  service: GoogleService = "calendar",
): string | null {
  const client = getOAuth2Client()
  if (!client) return null

  const scopes = SCOPES[service] ?? SCOPES.calendar

  // Encode userId + optional returnTo + service as JSON, then HMAC-sign the state
  const rawPayload = JSON.stringify({
    userId,
    ...(returnTo ? { returnTo } : {}),
    service,
  })

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    include_granted_scopes: true,
    state: signState(rawPayload),
  })
}

/**
 * Parse and verify the HMAC-signed OAuth state parameter.
 * Returns null if the signature is invalid (tampered or missing).
 */
export function parseOAuthState(state: string): {
  userId: string
  returnTo?: string
  service?: GoogleService
} | null {
  const payload = verifyState(state)
  if (!payload) return null

  try {
    const parsed = JSON.parse(payload)
    if (typeof parsed === "object" && parsed !== null && typeof parsed.userId === "string") {
      const rt = parsed.returnTo
      const returnTo =
        typeof rt === "string" && rt.startsWith("/") && !rt.startsWith("//") && !/^\/[\\@]/.test(rt) && !rt.includes("\\")
          ? rt
          : undefined
      const service = parsed.service === "gmail" ? "gmail" as const : "calendar" as const
      return { userId: parsed.userId, returnTo, service }
    }
  } catch {
    // Not JSON — plain userId format
  }
  return { userId: payload }
}

/** Exchange an authorization code for tokens. */
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuth2Client()
  if (!client) throw new Error("Google OAuth not configured")

  const { tokens } = await client.getToken(code)
  return tokens
}

/** Create an authenticated client from stored tokens. */
export function createAuthenticatedClient(tokens: {
  access_token: string
  refresh_token: string
  expiry_date: number
}) {
  const client = getOAuth2Client()
  if (!client) return null

  client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  })

  return client
}
