# Task: 06-upstash-redis-ratelimit

## Status
- [x] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

## Pillars

### 1. Model
sonnet

### 2. Tools Required
- [x] Read, Edit, Write (file operations)
- [x] Bash: `bun add @upstash/ratelimit @upstash/redis`, `bunx tsc --noEmit`, `bun run build`
- [x] Grep, Glob (find all rate limiter usages across API routes)
- [ ] WebFetch (external docs)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`, `styles/globals.css`
- [ ] Do NOT remove: in-memory fallback — if Upstash env vars are missing, fall back to current in-memory limiter with console warning
- [ ] Do NOT modify: API route business logic — only the rate limiting layer

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/middleware/rate-limit.ts` (or wherever rate limiting is defined — grep for `rateLimit` or `rateLimiter`)
- [ ] Specific files: Find all API routes that import/use the rate limiter
- [ ] External docs: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `@upstash/ratelimit` and `@upstash/redis` installed
- [ ] Rate limiter updated: uses Upstash Redis when env vars present, in-memory when absent
- [ ] Console warning on startup if Upstash env vars missing: `[Rate Limit] Upstash not configured — using in-memory fallback (not suitable for production)`
- [ ] All existing rate-limited API routes continue to work with no changes to their import/usage
- [ ] New env vars documented: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] Verification: `bunx tsc --noEmit` exits 0
- [ ] Verification: `bun run build` succeeds

### 7. Dependencies
- [ ] None — rate limiter already exists, just needs Redis backend

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] If @upstash/ratelimit API has changed, check npm for latest version and update import
- [ ] If types don't match existing rate limiter interface, create adapter function

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/06-upstash-redis-ratelimit.md` and STOP

**Rollback command:** `git checkout -- lib/middleware/rate-limit.ts && bun remove @upstash/ratelimit @upstash/redis`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Upstash SDK version differences
- [ ] Rate limit algorithm choice (sliding window vs fixed window vs token bucket)
- [ ] Serverless cold start impact on rate limiting

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Replace the in-memory rate limiter with Upstash Redis-backed rate limiting. The current in-memory Map doesn't work across serverless instances (each Vercel function gets its own Map, so limits are per-instance, not per-user). Upstash Redis provides a shared store that works across all instances.

## Acceptance Criteria
- [ ] `@upstash/ratelimit` using sliding window algorithm
- [ ] Rate limits match current values (grep existing rate limiter for window/max settings per route)
- [ ] Redis client created with `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- [ ] Graceful fallback: missing env vars → in-memory Map with warning log
- [ ] Rate limiter export signature unchanged — API routes don't need to change their imports
- [ ] 429 response format unchanged (same JSON shape as current)

## Steps
1. Install: `bun add @upstash/ratelimit @upstash/redis`
2. Find the current rate limiter file and read its implementation and export interface
3. Find all API routes that use it (grep for imports)
4. Update the rate limiter:
   - If `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exist → create Redis-backed Ratelimit
   - If not → keep current in-memory implementation with console.warn
5. Ensure the export signature (function name, params, return type) stays the same so API routes don't need changes
6. Add env vars to documentation
7. Run `bunx tsc --noEmit` and `bun run build`

## On Completion
- **Commit:** `feat: add Upstash Redis rate limiting (with in-memory fallback)`
- **Update:** [x] CLAUDE.md (add Upstash to external integrations, add env vars)
- **Handoff notes:** Rate limiting is production-ready once Lukas creates an Upstash account and adds env vars to Vercel. Free tier handles ~10K requests/day.

## Notes
- Upstash Ratelimit sliding window is the best algorithm for API rate limiting — it's smooth and doesn't have the burst problem of fixed windows.
- The free tier of Upstash Redis is sufficient for MVP (10K commands/day). Rate limiting is lightweight.
- If the current rate limiter uses different windows for different routes (e.g., 60/min for quotes, 10/min for AI), preserve those individual limits.
- Import pattern: `import { Ratelimit } from "@upstash/ratelimit"` and `import { Redis } from "@upstash/redis"`
