/* ------------------------------------------------------------------ */
/*  Telnyx Webhook Signature Verification                               */
/*  ED25519 signature + timestamp freshness check.                      */
/* ------------------------------------------------------------------ */

import { verify } from "crypto"

/**
 * Telnyx's webhook signing public key (base64-encoded DER/SPKI ED25519).
 * Get from Telnyx Dashboard > Account > API Keys > Public Key.
 * Safe to commit — it's a public key, not a secret.
 */
const TELNYX_PUBLIC_KEY = process.env.TELNYX_WEBHOOK_PUBLIC_KEY ?? null

/** Maximum age of a webhook timestamp — 5 minutes (replay protection). */
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000

interface VerificationResult {
  valid: boolean
  reason?: string
}

/**
 * Verify a Telnyx webhook request.
 *
 * Telnyx sends:
 * - `telnyx-signature-ed25519`: base64 ED25519 signature
 * - `telnyx-timestamp`: unix timestamp (seconds)
 *
 * Signed payload = `${timestamp}|${rawBody}`
 *
 * In production: rejects unverified requests.
 * In development without public key: allows all (for local testing).
 */
export function verifyTelnyxWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): VerificationResult {
  // No public key configured
  if (!TELNYX_PUBLIC_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[Webhook] TELNYX_WEBHOOK_PUBLIC_KEY not set in production — rejecting",
      )
      return { valid: false, reason: "Webhook verification not configured" }
    }
    // SECURITY: Webhook signature verification disabled in development.
    // Set TELNYX_WEBHOOK_PUBLIC_KEY to enable verification locally.
    console.warn("[Webhook] TELNYX_WEBHOOK_PUBLIC_KEY not set — skipping signature verification (dev only)")
    return { valid: true }
  }

  if (!signature || !timestamp) {
    return { valid: false, reason: "Missing signature or timestamp headers" }
  }

  // Timestamp freshness check — reject stale webhooks
  const webhookTimeMs = parseInt(timestamp, 10) * 1000
  if (isNaN(webhookTimeMs)) {
    return { valid: false, reason: "Invalid timestamp format" }
  }

  if (Math.abs(Date.now() - webhookTimeMs) > MAX_TIMESTAMP_AGE_MS) {
    return {
      valid: false,
      reason: "Webhook timestamp too old (possible replay attack)",
    }
  }

  // ED25519 signature verification
  try {
    const signedPayload = `${timestamp}|${rawBody}`
    const signatureBuffer = Buffer.from(signature, "base64")
    const publicKeyDer = Buffer.from(TELNYX_PUBLIC_KEY, "base64")

    const isValid = verify(
      null, // ED25519 doesn't use a separate hash algorithm
      Buffer.from(signedPayload),
      { key: publicKeyDer, format: "der", type: "spki" },
      signatureBuffer,
    )

    if (!isValid) {
      return { valid: false, reason: "Invalid signature" }
    }

    return { valid: true }
  } catch (error) {
    console.error("[Webhook] Signature verification error:", error instanceof Error ? error.message : String(error))
    return { valid: false, reason: "Signature verification failed" }
  }
}
