/* ------------------------------------------------------------------ */
/*  Google OAuth Client Factory                                        */
/*  Creates OAuth2 clients, generates auth URLs, exchanges codes.      */
/* ------------------------------------------------------------------ */

import { google } from "googleapis"

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

/**
 * Generate the Google OAuth consent URL.
 * `state` carries the user ID so the callback can associate tokens.
 */
export function generateAuthUrl(userId: string): string | null {
  const client = getOAuth2Client()
  if (!client) return null

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state: userId,
  })
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
