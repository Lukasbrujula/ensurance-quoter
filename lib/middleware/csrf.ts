/* ------------------------------------------------------------------ */
/*  CSRF Protection                                                     */
/*  Origin/Referer validation + custom header fallback for mutations.   */
/* ------------------------------------------------------------------ */

/** Paths exempt from CSRF checks (external service callbacks). */
const CSRF_EXEMPT_PATHS = [
  "/api/ai-agent/webhook",
  "/api/auth/callback",
  "/api/webhooks/sms",
]

/**
 * Build the set of allowed origins from environment variables.
 * Evaluated once at module load time.
 */
function buildAllowedOrigins(): string[] {
  const origins: string[] = []

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      origins.push(new URL(appUrl).origin)
    } catch {
      // Invalid URL — skip
    }
  }

  // Always allow localhost in development
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3000", "http://localhost:3001")
  }

  return origins
}

const allowedOrigins = buildAllowedOrigins()

interface CSRFResult {
  valid: boolean
  reason?: string
}

/**
 * Validate a request against CSRF protections.
 *
 * Safe methods (GET, HEAD, OPTIONS) always pass.
 * Exempt paths (webhooks, callbacks) always pass.
 *
 * For mutation requests:
 * 1. Check Origin header (most reliable — cannot be spoofed by JS)
 * 2. Fall back to Referer header
 * 3. Fall back to X-CSRF-Protection custom header
 * 4. In development, allow requests without headers
 */
export function validateCSRF(
  method: string,
  pathname: string,
  headers: { get(name: string): string | null },
): CSRFResult {
  // Safe methods are never CSRF-vulnerable
  if (["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase())) {
    return { valid: true }
  }

  // Exempt paths (webhooks called by external services)
  if (CSRF_EXEMPT_PATHS.some((path) => pathname.startsWith(path))) {
    return { valid: true }
  }

  // 1. Check Origin header
  const origin = headers.get("origin")
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return { valid: true }
    }
    return { valid: false, reason: `Origin not allowed: ${origin}` }
  }

  // 2. Fall back to Referer header
  const referer = headers.get("referer")
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin
      if (allowedOrigins.includes(refererOrigin)) {
        return { valid: true }
      }
      return { valid: false, reason: `Referer origin not allowed: ${refererOrigin}` }
    } catch {
      return { valid: false, reason: "Invalid referer URL" }
    }
  }

  // 3. Custom header fallback (for non-browser clients like mobile apps)
  if (headers.get("x-csrf-protection") === "1") {
    return { valid: true }
  }

  // 4. Allow in development (curl, Postman, etc.)
  if (process.env.NODE_ENV === "development") {
    return { valid: true }
  }

  return {
    valid: false,
    reason: "Missing Origin, Referer, and X-CSRF-Protection headers",
  }
}
