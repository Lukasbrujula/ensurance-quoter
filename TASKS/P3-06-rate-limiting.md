# Task: P3-06-rate-limiting

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

- **Model**: sonnet
- **Tools**: Antigravity (Claude Code)
- **Human Checkpoint**: None

## Description

Add in-memory rate limiting to critical API endpoints. Currently every endpoint is wide open — especially dangerous for the Telnyx token endpoint which grants live calling access and the OpenAI endpoints which burn money. No Redis needed — a simple Map-based sliding window is fine for MVP (single-server deployment).

## Files to Create

### 1. `lib/middleware/rate-limiter.ts` (~60 lines)
```typescript
interface RateLimitConfig {
  windowMs: number        // Time window in milliseconds
  maxRequests: number     // Max requests per window per key
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number         // Unix timestamp
}

// In-memory sliding window rate limiter
// Uses Map<string, { count: number, resetAt: number }>
// Auto-cleanup of expired entries every 60s

export function createRateLimiter(config: RateLimitConfig): {
  check(key: string): RateLimitResult
}

// Helper to extract key from request (IP-based for now, user-based post-auth)
export function getRateLimitKey(request: Request): string
// Uses x-forwarded-for → x-real-ip → "anonymous" fallback

// Helper to return 429 response
export function rateLimitResponse(result: RateLimitResult): Response
// Returns 429 with Retry-After header and JSON body
```

### 2. Rate limiter instances (in the file or separate config)
```typescript
export const telnyxLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 })
export const transcribeLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 })
export const coachingLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 })
export const chatLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 })
export const enrichmentLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })
export const quoteLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 30 })
```

## Files to Modify

Add rate limit check at the top of each route handler (before any logic):

### 3. `app/api/telnyx/token/route.ts` — 5/min (most critical — grants calling)
### 4. `app/api/telnyx/credentials/route.ts` — 5/min
### 5. `app/api/transcribe/stream/route.ts` — 20/min
### 6. `app/api/transcribe/audio/route.ts` — 200/min (high volume during calls, ~3 chunks/sec)
### 7. `app/api/coaching/route.ts` — 30/min
### 8. `app/api/chat/route.ts` — 20/min
### 9. `app/api/chat/proactive/route.ts` — 20/min
### 10. `app/api/enrichment/route.ts` — 10/min
### 11. `app/api/quote/route.ts` — 30/min
### 12. `app/api/call-summary/route.ts` — 10/min
### 13. `app/api/call-log/route.ts` — 30/min (POST)

### Pattern for each route:
```typescript
import { telnyxLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/middleware/rate-limiter"

export async function POST(req: Request) {
  const rl = telnyxLimiter.check(getRateLimitKey(req))
  if (!rl.allowed) return rateLimitResponse(rl)
  
  // ... existing route logic
}
```

## Design Decisions
- **In-memory, not Redis**: Single Next.js server for MVP. Rate limits reset on restart — acceptable.
- **IP-based keys**: No auth system yet, so IP is the only identifier. Post-auth, switch to user ID.
- **Serverless caveat**: globalThis Map persists in dev but may not in production serverless. Add a comment noting this works for single-server deployment. For Vercel serverless, would need Upstash Redis.
- **No rate limit on GET endpoints**: `/api/call-log/[leadId]` and `/api/call-log/counts` are read-only and less critical.
- **Audio endpoint gets higher limit**: During an active call, audio chunks come in at ~3/second, so 200/min allows normal operation.

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. Rate limiter returns 429 with proper headers when limit exceeded
3. All POST endpoints have rate limiting
4. Normal usage is unaffected (limits are generous enough for single-user dev)
5. Expired entries are cleaned up (no memory leak)

## On Completion
- Update CLAUDE.md with rate limiter location
- Commit: `feat: add in-memory rate limiting to all API endpoints`
