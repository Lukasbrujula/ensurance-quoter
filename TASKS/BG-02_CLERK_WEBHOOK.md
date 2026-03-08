# BG-02: Clerk Webhook — Create Billing Group on Signup

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

---

## 1. Model
Sonnet — webhook endpoint with signature verification + API call

## 2. Tools
- Antigravity (Claude Code)
- Clerk Dashboard (webhook config — Lukas does this)
- Terminal (`bunx tsc --noEmit`)
- ngrok or Vercel preview URL (for testing webhook delivery)

## 3. Guardrails
- ❌ Do NOT use Clerk's `auth()` or `currentUser()` in this endpoint — webhooks have no session
- ❌ Do NOT use the Clerk Supabase client (`createClerkSupabaseClient`) — use `createServiceRoleClient()` instead (no JWT in webhook context)
- ❌ Do NOT modify `middleware.ts` route matching — `/api/webhooks/(.*)` is already public (verified in current middleware)
- ❌ Do NOT block the webhook response on non-critical failures — always return 200 to Clerk after signature verification passes, even if billing group creation fails (log the error, retry later via BG-03 fallback)
- ✅ DO verify webhook signature using `svix` — never trust unverified payloads
- ✅ DO follow the exact pattern in `app/api/webhooks/sms/route.ts` for webhook structure

## 4. Knowledge

### Clerk Webhook Payload for `user.created`
```json
{
  "type": "user.created",
  "data": {
    "id": "user_2abc123",
    "first_name": "John",
    "last_name": "Smith",
    "email_addresses": [
      {
        "email_address": "john@example.com",
        "id": "idn_xxx",
        "verification": { "status": "verified" }
      }
    ],
    "created_at": 1234567890
  }
}
```

### Svix Webhook Verification
```typescript
import { Webhook } from "svix"

const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
const payload = await req.text()
const headers = {
  "svix-id": req.headers.get("svix-id")!,
  "svix-timestamp": req.headers.get("svix-timestamp")!,
  "svix-signature": req.headers.get("svix-signature")!,
}
const evt = wh.verify(payload, headers) // throws on invalid signature
```

### Middleware Confirmation
Current `middleware.ts` has `/api/webhooks/(.*)` in `isPublicRoute` — so `/api/webhooks/clerk` will not require Clerk auth. Verified.

## 5. Memory
- The SMS webhook at `app/api/webhooks/sms/route.ts` uses Telnyx ED25519 signature verification and `createServiceRoleClient()` — same service role pattern applies here
- `lib/telnyx/billing.ts` (created in BG-01) provides `createBillingGroup(name)` 
- `lib/supabase/settings.ts` provides `upsertAgentSettings(userId, data)` for storing the billing group ID
- `agent_settings.telnyx_billing_group_id` column exists (added in BG-01 migration)
- Clerk user IDs look like `user_2abc123` — this is the `user_id` in `agent_settings`

## 6. Success Criteria
- [ ] `app/api/webhooks/clerk/route.ts` exists
- [ ] Svix signature verification — returns 400 on invalid/missing signature
- [ ] Handles `user.created` event type — ignores all others with 200
- [ ] Extracts user ID, name, email from Clerk payload
- [ ] Calls `createBillingGroup("Ensurance - {name}")` from `lib/telnyx/billing.ts`
- [ ] Stores returned billing group ID via `upsertAgentSettings(userId, { telnyx_billing_group_id: id })`
- [ ] Returns 200 even if billing group creation fails (logs error, does not block Clerk)
- [ ] `CLERK_WEBHOOK_SECRET` env var is documented
- [ ] `bunx tsc --noEmit` passes clean
- [ ] Test: Send a test webhook from Clerk Dashboard → verify billing group appears in Telnyx portal and ID is stored in Supabase

## 7. Dependencies

**Pre-requisites (Lukas manual steps BEFORE this task):**
1. `bun add svix` — install Svix for webhook verification
2. Clerk Dashboard → Webhooks → Add Endpoint:
   - URL: your Vercel URL + `/api/webhooks/clerk` (or ngrok URL for local dev)
   - Events: subscribe to `user.created`
   - Copy Signing Secret
3. Add `CLERK_WEBHOOK_SECRET=whsec_xxx` to `.env.local` and Vercel env vars
4. BG-01 must be complete (billing.ts exists, DB column exists)

**Files to read first:**
```bash
cat app/api/webhooks/sms/route.ts     # Webhook pattern reference
cat lib/telnyx/billing.ts             # Created in BG-01
cat lib/supabase/settings.ts          # upsertAgentSettings function
cat lib/supabase/server.ts            # createServiceRoleClient
cat middleware.ts                      # Verify /api/webhooks is public
```

**Files to create:**
- `app/api/webhooks/clerk/route.ts`

**Files to modify:**
- None

## 8. Failure Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Svix `verify()` throws | Invalid signature, replay attack, or wrong secret | Check `CLERK_WEBHOOK_SECRET` matches Clerk Dashboard. Ensure raw body is passed (not parsed JSON). |
| `svix-id` header is null | Request isn't from Clerk, or headers stripped by proxy | Check Vercel isn't stripping custom headers. Test with Clerk's "Send Test" button. |
| Telnyx `createBillingGroup` fails | API key issue or Telnyx outage | Log the error. Return 200 to Clerk anyway. BG-03 fallback will catch this on next login. |
| `upsertAgentSettings` fails | User doesn't have an `agent_settings` row yet | Upsert should create the row. If it fails, the error means the user_id column constraint is wrong — check RLS allows service role inserts. |
| Webhook never fires | Clerk endpoint not configured, wrong URL, or event not subscribed | Check Clerk Dashboard → Webhooks → check delivery logs for failures |
| Works locally but not on Vercel | `CLERK_WEBHOOK_SECRET` not in Vercel env vars | Add to Vercel project settings → Environment Variables |

## 9. Learning
- Clerk webhooks use Svix (Standard Webhooks spec) — different from Telnyx's ED25519 verification
- Webhook bodies must be verified as raw text, not parsed JSON — Svix verifies the raw string
- Always return 200 to webhook providers after signature verification passes, even on downstream errors. Otherwise they'll retry and you get duplicate billing groups.
- If `svix` package causes issues, the alternative is manual HMAC verification, but Svix is Clerk's recommended approach
- Clerk webhook payloads include a lot more fields than listed above — only extract what's needed

---

## On Completion
- Commit: `feat: Clerk webhook creates Telnyx billing group on agent signup`
- Test by creating a new user in Clerk (or using Clerk Dashboard "Send Test Webhook")
- Verify in Telnyx portal: Billing → Billing Groups → new group should appear
- Verify in Supabase: `agent_settings` row for new user has `telnyx_billing_group_id` populated
- Proceed to BG-03
