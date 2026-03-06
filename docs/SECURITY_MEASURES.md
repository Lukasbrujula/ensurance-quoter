# Security Measures — Compulife API Integration

Applied 2026-03-06. Covers 2 High, 3 Medium, 3 Low findings from security review.

---

## HIGH

### 1. Proxy Secret Validation

**File:** `lib/engine/compulife-provider.ts`

**Problem:** When `COMPULIFE_PROXY_URL` was set without `COMPULIFE_PROXY_SECRET`, the code sent an empty string as the proxy auth header — silently bypassing authentication.

**Fix:** Module-scope startup validation throws immediately if the proxy URL is configured without its secret. The `|| ""` fallback on the header was replaced with a non-null assertion (guaranteed by the guard).

### 2. Dedicated Quote Rate Limiter

**Files:** `lib/middleware/rate-limiter.ts`, `app/api/quote/route.ts`

**Problem:** The quote endpoint used the general `api` tier (60 req/min). A single quote with all toggles fires ~17 parallel Compulife calls, meaning one user could generate 1,020 outbound API calls per minute.

**Fix:** Added a `quote` tier at 15 requests per minute (15 × 17 = 255 max outbound calls/min per user). The `/api/quote` route now uses `rateLimiters.quote` instead of `rateLimiters.api`.

---

## MEDIUM

### 3. URL Encoding in Direct Mode

**File:** `lib/engine/compulife-provider.ts`

**Problem:** Proxy mode used `encodeURIComponent` for the JSON payload in the URL, but direct mode passed raw JSON — inconsistent and violates defense-in-depth.

**Fix:** Direct mode now wraps the JSON payload with `encodeURIComponent()`, matching proxy mode behavior.

### 4. Proxy URL Redaction

**File:** `lib/engine/compulife-provider.ts`

**Problem:** The full proxy URL (including port and path) was logged at startup, exposing infrastructure details.

**Fix:** Log message changed from interpolating the URL to a generic `"[Compulife] Using proxy mode"`.

### 5. Coverage Amount Validation Alignment

**File:** `app/api/quote/route.ts`

**Problem:** Server-side Zod schema accepted `$25,000` minimum coverage, but the client slider starts at `$100,000`. A crafted request could hit Compulife with very small amounts that return no results, wasting API calls.

**Fix:** Server minimum raised from `25000` to `100000`, matching the client. If sub-$100K quotes are needed in the future, both client and server should be updated together.

---

## LOW

### 6. Unmapped Carrier Name Redaction

**File:** `lib/engine/compulife-provider.ts`

**Problem:** Unmapped carrier names from Compulife responses were logged verbatim via `console.warn`, leaking third-party data into logs.

**Fix:** Log now only reports the count of unmapped carriers (`"[Compulife] 3 unmapped carrier(s) skipped"`). Developers can inspect full response data locally if needed.

### 7. Error Detail Redaction in Pricing Config

**File:** `lib/engine/pricing-config.ts`

**Problem:** Compulife API error messages (which could include internal details) were logged in the fallback handler.

**Fix:** Log message simplified to `"[Compulife] API failed, falling back to mock pricing"` without appending the error object.

### 8. ipify Dependency (No Code Change)

**Problem:** `https://api.ipify.org` is used to determine the server's public IP for direct-mode auth.

**Assessment:** Only runs in local dev (direct mode), not production (proxy mode). The mock fallback handles ipify failures gracefully. No code change needed — documented here for awareness.

---

## Files Modified

| File | Fixes |
|------|-------|
| `lib/engine/compulife-provider.ts` | 1, 3, 4, 6 |
| `lib/middleware/rate-limiter.ts` | 2 |
| `app/api/quote/route.ts` | 2, 5 |
| `lib/engine/pricing-config.ts` | 7 |
