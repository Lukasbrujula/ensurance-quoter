# Task: 02-compulife-proxy-provider

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
- [x] Bash: `bunx tsc --noEmit`
- [x] Grep, Glob (search for all Compulife references)
- [ ] WebFetch (external docs)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `compulife-proxy/` directory (that's Task 01's output)
- [ ] Do NOT modify: `lib/engine/mock-pricing.ts`, `lib/engine/mock-provider.ts`
- [ ] Do NOT break: local dev flow — direct Compulife calls must still work when proxy env vars are absent
- [ ] Do NOT break: mock fallback — `CompulifeWithMockFallback` must still catch errors and fall back

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/engine/compulife-provider.ts` (main file to modify), `lib/engine/pricing-config.ts` (provider config), `lib/engine/pricing.ts` (PricingProvider interface)
- [ ] Context: Currently the provider calls `https://www.compulifeapi.com/api/` directly with `AuthorizationID` in query params. Need to add a proxy path.

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `compulife-provider.ts` updated: if `COMPULIFE_PROXY_URL` env var exists, route through proxy; otherwise call Compulife directly
- [ ] When using proxy: query params same as before EXCEPT `AuthorizationID` is removed (proxy injects it). Add `x-proxy-secret` header.
- [ ] When NOT using proxy: existing behavior unchanged (direct call with `AuthorizationID` in params)
- [ ] Mock fallback still works in both modes (proxy error → mock, direct error → mock)
- [ ] New env vars documented in `.env.example` or equivalent
- [ ] Verification: `bunx tsc --noEmit` exits 0
- [ ] Verification: `bun run build` succeeds

### 7. Dependencies
- [x] Task 01 must be complete (to understand the proxy's API contract)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry: check if import paths changed, check if PricingProvider interface changed

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/02-compulife-proxy-provider.md` and STOP

**Rollback command:** `git checkout -- lib/engine/compulife-provider.ts`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Fetch API header handling differences between direct and proxied requests
- [ ] Environment variable patterns for dual-mode (dev vs prod) API routing

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Update the Compulife pricing provider to support routing requests through a fixed-IP proxy when deployed on Vercel. In local dev, requests go directly to Compulife. In production (Vercel), requests go through a Railway proxy that has a static outbound IP.

## Acceptance Criteria
- [ ] Provider detects proxy mode via `process.env.COMPULIFE_PROXY_URL`
- [ ] Proxy mode: `GET ${COMPULIFE_PROXY_URL}/api/quote?${params}` with header `x-proxy-secret: ${COMPULIFE_PROXY_SECRET}`
- [ ] Proxy mode: `AuthorizationID` param NOT included in query string (proxy adds it)
- [ ] Direct mode: existing behavior — `GET https://www.compulifeapi.com/api/?${params}` with `AuthorizationID` in params
- [ ] Both modes: same response parsing, same error handling, same mock fallback
- [ ] Console log indicates which mode is active on first call: `[Compulife] Using proxy: ${url}` or `[Compulife] Direct mode`
- [ ] TypeScript compiles clean

## Steps
1. Read `lib/engine/compulife-provider.ts` to understand current fetch logic
2. Find the function that builds the Compulife URL and makes the fetch call
3. Add proxy routing logic:
   ```typescript
   const proxyUrl = process.env.COMPULIFE_PROXY_URL;
   const proxySecret = process.env.COMPULIFE_PROXY_SECRET;
   
   if (proxyUrl) {
     // Remove AuthorizationID from params (proxy injects it)
     params.delete('AuthorizationID');
     const url = `${proxyUrl}/api/quote?${params.toString()}`;
     const response = await fetch(url, {
       headers: { 'x-proxy-secret': proxySecret || '' }
     });
   } else {
     // Direct mode (existing logic)
     params.set('AuthorizationID', process.env.COMPULIFE_AUTH_ID || '');
     const url = `https://www.compulifeapi.com/api/?${params.toString()}`;
     const response = await fetch(url);
   }
   ```
4. Add one-time log on first call indicating mode
5. Ensure error handling wraps both paths — proxy errors (401, 502, 504) should trigger mock fallback same as direct errors
6. Add `COMPULIFE_PROXY_URL` and `COMPULIFE_PROXY_SECRET` to `.env.example` or env documentation
7. Run `bunx tsc --noEmit`
8. Run `bun run build`

## On Completion
- **Commit:** `feat: add proxy routing for Compulife API (production deployment)`
- **Update:** [x] CLAUDE.md (add new env vars to Environment Variables section)
- **Handoff notes:** Provider now supports proxy mode. Lukas needs to: set `COMPULIFE_PROXY_URL` and `COMPULIFE_PROXY_SECRET` in Vercel env vars after Railway deployment.

## Notes
- The proxy URL should NOT have a trailing slash. Strip it if present: `proxyUrl.replace(/\/+$/, '')`
- The proxy returns the same content-type and body as Compulife — no transformation needed on the response parsing side.
- Error codes from proxy: 401 (bad secret), 429 (rate limited), 502 (Compulife down), 504 (Compulife timeout). All should trigger mock fallback.
- This is the ONLY code change needed in the main app for proxy support. Everything else is infrastructure (Railway deploy, env vars).
