/**
 * In-memory sliding window rate limiter.
 *
 * Uses a Map<string, { count, resetAt }> per limiter instance.
 * Expired entries are cleaned up every 60 seconds.
 *
 * NOTE: This works for single-server deployment. In Vercel serverless,
 * each function instance gets its own Map — for production serverless,
 * swap to Upstash Redis (@upstash/ratelimit).
 */

import { NextResponse } from "next/server"

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

interface RateLimiter {
  check(key: string): RateLimitResult
}

export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const entries = new Map<string, RateLimitEntry>()

  // Auto-cleanup expired entries every 60s
  if (typeof globalThis !== "undefined") {
    const interval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of entries) {
        if (entry.resetAt <= now) {
          entries.delete(key)
        }
      }
    }, 60_000)

    // Allow process to exit without waiting for interval
    if (typeof interval === "object" && "unref" in interval) {
      interval.unref()
    }
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now()
      const existing = entries.get(key)

      if (!existing || existing.resetAt <= now) {
        const resetAt = now + config.windowMs
        entries.set(key, { count: 1, resetAt })
        return { allowed: true, remaining: config.maxRequests - 1, resetAt }
      }

      if (existing.count < config.maxRequests) {
        const updated = { count: existing.count + 1, resetAt: existing.resetAt }
        entries.set(key, updated)
        return {
          allowed: true,
          remaining: config.maxRequests - updated.count,
          resetAt: existing.resetAt,
        }
      }

      return {
        allowed: false,
        remaining: 0,
        resetAt: existing.resetAt,
      }
    },
  }
}

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  return "anonymous"
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)

  return NextResponse.json(
    { error: "Too many requests", retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, retryAfter)),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(result.resetAt),
      },
    },
  )
}

// ---------------------------------------------------------------
// Pre-configured limiter instances
// ---------------------------------------------------------------
export const telnyxLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 })
export const transcribeLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 })
export const audioLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 200 })
export const coachingLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 })
export const chatLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 })
export const enrichmentLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })
export const quoteLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 })
export const callSummaryLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })
export const callLogLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 })
export const settingsLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 })
