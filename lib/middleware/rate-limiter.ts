/**
 * Rate limiter with Upstash Redis backend and in-memory fallback.
 *
 * Tiered limiters for different endpoint categories.
 * When UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set → Redis (production).
 * When missing → in-memory fixed-window fallback (dev only, per-instance).
 * Fails open on Redis errors — never blocks users because of infrastructure issues.
 */

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

// ---------------------------------------------------------------
// Limiter interface — common shape for Redis and in-memory
// ---------------------------------------------------------------

interface LimitResult {
  success: boolean
  remaining: number
  reset: number
}

interface Limiter {
  limit(identifier: string): Promise<LimitResult>
}

// ---------------------------------------------------------------
// In-memory fixed-window rate limiter (dev fallback)
// ---------------------------------------------------------------

class InMemoryLimiter implements Limiter {
  private readonly windows = new Map<string, { count: number; start: number }>()
  private readonly max: number
  private readonly windowMs: number

  constructor(max: number, windowMs: number) {
    this.max = max
    this.windowMs = windowMs
  }

  async limit(identifier: string): Promise<LimitResult> {
    const now = Date.now()
    const entry = this.windows.get(identifier)

    // Evict stale entries when map grows large
    if (this.windows.size > 1000) {
      for (const [key, val] of this.windows) {
        if (now - val.start >= this.windowMs) this.windows.delete(key)
      }
    }

    // New window or expired window
    if (!entry || now - entry.start >= this.windowMs) {
      this.windows.set(identifier, { count: 1, start: now })
      return { success: true, remaining: this.max - 1, reset: now + this.windowMs }
    }

    // Within current window
    const newCount = entry.count + 1
    this.windows.set(identifier, { count: newCount, start: entry.start })
    const resetTime = entry.start + this.windowMs

    if (newCount > this.max) {
      return { success: false, remaining: 0, reset: resetTime }
    }

    return { success: true, remaining: this.max - newCount, reset: resetTime }
  }
}

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

if (!redis) {
  console.warn(
    "[Rate Limit] Upstash not configured — using in-memory fallback (not suitable for production)",
  )
}

// ---------------------------------------------------------------
// Duration parsing
// ---------------------------------------------------------------

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1]

const DURATION_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

function parseDurationMs(window: Duration): number {
  const match = String(window).match(/^(\d+)\s*([a-z]+)$/i)
  if (!match) return 60_000
  const amount = parseInt(match[1], 10)
  const unit = match[2]
  return amount * (DURATION_MS[unit] ?? 60_000)
}

// ---------------------------------------------------------------
// Tiered rate limiters
// ---------------------------------------------------------------

function createLimiter(
  maxRequests: number,
  window: Duration,
  prefix: string,
): Limiter {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, window),
      prefix,
    })
  }
  return new InMemoryLimiter(maxRequests, parseDurationMs(window))
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
  /** Quote endpoint: 15 per minute (each quote fires ~17 parallel Compulife calls) */
  quote: createLimiter(15, "1 m", "rl:quote"),
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
  limiter: Limiter,
  identifier: string,
): Promise<RateLimitCheckResult> {
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
