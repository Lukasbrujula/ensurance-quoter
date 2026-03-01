/**
 * Redis-backed rate limiter using Upstash.
 *
 * Tiered limiters for different endpoint categories.
 * Fails open if Redis is unavailable or env vars are missing —
 * never blocks users because of infrastructure issues.
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

// ---------------------------------------------------------------
// Redis client (null if env vars not set)
// ---------------------------------------------------------------

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const redis = createRedisClient()

// ---------------------------------------------------------------
// Tiered rate limiters
// ---------------------------------------------------------------

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1]

function createLimiter(
  maxRequests: number,
  window: Duration,
  prefix: string,
): Ratelimit | null {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, window),
    prefix,
  })
}

export const rateLimiters = {
  /** General API: 60 requests per minute */
  api: createLimiter(60, "1 m", "rl:api"),
  /** Auth/credential endpoints: 10 per minute (brute force protection) */
  auth: createLimiter(10, "1 m", "rl:auth"),
  /** AI/LLM endpoints: 20 per minute (cost control) */
  ai: createLimiter(20, "1 m", "rl:ai"),
  /** Webhooks: 100 per minute (external callers) */
  webhook: createLimiter(100, "1 m", "rl:webhook"),
  /** High-frequency streaming: 300 per minute (audio chunks during live transcription) */
  streaming: createLimiter(300, "1 m", "rl:streaming"),
}

// ---------------------------------------------------------------
// Rate limit check — fails open on any error
// ---------------------------------------------------------------

interface RateLimitCheckResult {
  success: boolean
  remaining: number
  reset: number
}

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<RateLimitCheckResult> {
  if (!limiter) {
    return { success: true, remaining: 0, reset: 0 }
  }
  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error("[Rate Limit] Redis error, failing open:", error instanceof Error ? error.message : String(error))
    return { success: true, remaining: 0, reset: 0 }
  }
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/** Extract client IP from proxy headers.
 *  SECURITY: Relies on Vercel's CDN to set x-forwarded-for reliably.
 *  If self-hosting, configure the reverse proxy to strip/overwrite
 *  x-forwarded-for to prevent spoofing-based rate limit bypass. */
export function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  )
}

export function rateLimitResponse(remaining?: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": "60",
        "X-RateLimit-Remaining": String(remaining ?? 0),
      },
    },
  )
}
