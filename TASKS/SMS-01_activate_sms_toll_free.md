# SMS-01: Activate SMS Messaging via Toll-Free Numbers

## 1. Model

Use **Sonnet** for execution. The code changes are mostly wiring existing infrastructure — no complex architectural decisions. Planning was done here.

## 2. Tools Required

- **Codebase files** (read first):
  - `lib/sms/send.ts` — current SMS sending logic (resolve from-number, Telnyx API, save to sms_logs)
  - `lib/telnyx/messaging-profiles.ts` — messaging profile CRUD
  - `lib/telnyx/phone-numbers.ts` — phone number search, order, release
  - `app/api/sms/route.ts` — send/list SMS endpoint
  - `app/api/webhooks/sms/route.ts` — inbound SMS webhook handler
  - `components/inbox/inbox-page-client.tsx` — 3-column inbox UI
  - `components/inbox/conversation-thread.tsx` — SMS thread + send box
  - `components/leads/sms-panel.tsx` — SMS panel in lead detail
  - `lib/data/sms-templates.ts` — 4 SMS templates with variable substitution
  - `app/api/phone-numbers/purchase/route.ts` — number purchasing flow

- **Telnyx Dashboard** (manual steps by Lukas):
  - Mission Control Portal → Messaging → Toll-Free Verification
  - Or: Telnyx Toll-Free Verification API

- **Supabase MCP** for any schema changes (if needed)

## 3. Guardrails

- **DO NOT** modify any Telnyx voice/calling files (`lib/telnyx/client.ts`, `connect.ts`, `active-call.ts`, `notification-handler.ts`, `inbound-handler.ts`, `audio-capture.ts`)
- **DO NOT** modify the AI agent system (`lib/telnyx/ai-config.ts`, `ai-service.ts`, `prompt-compiler.ts`, `agent-templates.ts`)
- **DO NOT** modify the WebRTC calling components (`components/calling/*`)
- **DO NOT** change the existing phone number purchase flow — agents already buy local numbers for voice; toll-free is an additional number type
- **DO NOT** attempt to send SMS without 10DLC/toll-free registration in place — the code should be ready but needs Lukas to complete Telnyx registration manually before live messages will deliver
- **DO NOT** touch the quote engine, carrier data, or pricing logic
- Preserve all existing SMS code — it's partially functional, just needs the compliance pieces and from-number resolution wired correctly

## 4. Knowledge

### Why Toll-Free Instead of 10DLC

Ensurance is an ISV (Independent Software Vendor) — agents are separate businesses using our platform. Under 10DLC rules, each agent would need their own brand registration and campaign with TCR (The Campaign Registry). That's $25-50 setup + $3-11/month per agent, plus 3-7 business day approval each. At scale, this is operationally brutal.

Toll-free is simpler: one-step verification per number via Telnyx's portal or API, no per-brand registration, no campaign IDs. The tradeoff is toll-free numbers don't have local presence (they're 800/888/877/866/855/844/833 numbers), but for insurance agent follow-ups and appointment reminders, that's fine.

### What Already Exists

The SMS infrastructure is ~80% built:
- `sms_logs` table with encryption at rest (AES-256-GCM)
- Full 3-column inbox UI with conversation list, thread view, contact sidebar
- SMS send/receive API endpoints
- Inbound SMS webhook with Telnyx ED25519 signature verification
- Messaging profile CRUD
- SMS templates with variable substitution (`{first_name}`, `{agent_name}`, etc.)
- Lead-level SMS panel

### What's Missing

1. **Toll-free number purchasing** — the current purchase flow only handles local numbers. Need to add toll-free search + purchase capability.
2. **From-number resolution for SMS** — `lib/sms/send.ts` resolves which number to send from. It needs to prefer the agent's toll-free number for SMS (if they have one), falling back to their local number.
3. **Messaging profile assignment** — purchased toll-free numbers need to be assigned to a messaging profile with the correct webhook URL for inbound SMS.
4. **Opt-in/opt-out mechanism** — toll-free verification requires demonstrable opt-in and STOP/HELP keyword handling. Inbound webhook needs to recognize STOP → opt-out the lead, HELP → send help response.
5. **Toll-free verification status tracking** — agents need to see whether their toll-free number is verified and ready to send.

### Compliance Requirements for Toll-Free Verification

When Lukas submits the toll-free verification through Telnyx (manual step), he needs:
- Business name and website
- Business registration number (EIN) — required since Feb 2026
- Use case description: "Insurance agent follow-ups, appointment reminders, and quote notifications"
- Sample messages: "Hi {first_name}, this is {agent_name}. Following up on the term life quote we discussed. When's a good time to review your options?"
- Opt-in workflow description: "Leads provide phone number during intake. Agent confirms SMS consent before sending."
- Privacy policy URL: https://ensurance-quoter.vercel.app/privacy

## 5. Memory

- Telnyx billing groups are per-agent (stored in `agent_settings.telnyx_billing_group_id`). Toll-free numbers should respect this — purchased toll-free numbers bill to the agent's billing group.
- The SMS webhook CSRF fix from Feb 26 uses `/api/webhooks/` prefix matching, not exact match on `/api/webhooks/sms`. This means the existing webhook route works for any path under `/api/webhooks/`.
- Messaging profiles in `lib/telnyx/messaging-profiles.ts` handle whitelisted destinations and webhook URL fallback chains — this was fixed in the March 12 session.
- The `TELNYX_WEBHOOK_PUBLIC_KEY` is now enforced in production (SEC-01 from this session).

## 6. Success Criteria

1. **Toll-free number search**: Agent can search for available toll-free numbers in `/settings/phone-numbers` (filtered to toll-free prefix like 888, 877, etc.)
2. **Toll-free number purchase**: Agent can purchase a toll-free number, which gets assigned to their billing group and a messaging profile with correct webhook URL
3. **SMS send via toll-free**: When an agent sends an SMS from the inbox or lead detail, the system uses their toll-free number as the from-number (if they have one)
4. **Inbound SMS routing**: When someone texts the agent's toll-free number, the webhook creates/updates a lead and the message appears in the inbox
5. **STOP/HELP handling**: Inbound "STOP" opts out the lead (sets a flag), inbound "HELP" sends a canned response. Agent cannot send SMS to opted-out leads.
6. **Verification status visible**: Agent can see whether their toll-free number is verified or pending in settings
7. **Build passes**: `bunx tsc --noEmit` and `bun run build` both succeed
8. **No voice regression**: All calling/WebRTC functionality unchanged — verify by reading, not by modifying

## 7. Dependencies

- Existing `sms_logs` table — already exists with correct schema
- Existing inbox components — already built
- Existing SMS API routes — already exist
- Telnyx account with toll-free number inventory access
- **Manual step by Lukas**: Submit toll-free verification through Telnyx Mission Control after the code is deployed. Without verification, messages will be blocked by carriers.

## 8. Failure Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Toll-free search returns empty | Telnyx inventory depleted for that prefix | Try different prefix (888 vs 877 vs 866) |
| SMS send fails with 40300 | Number not verified for messaging | Lukas needs to complete toll-free verification in Telnyx portal |
| Inbound webhook not firing | Messaging profile webhook URL incorrect | Check messaging profile webhook URL matches production domain |
| SMS send fails with "no from number" | Agent has no toll-free number purchased | Fall back to local number; show UI prompt to purchase toll-free |
| Rate limit on Telnyx SMS API | Too many messages too fast | Telnyx toll-free allows ~10 MPS; queue messages if hitting limits |

## 9. Learning

- Document the toll-free verification process (what fields, what sample messages) so it can be repeated for each agent or automated later
- If Telnyx rejects verification, log the rejection reason — common causes are vague use cases or missing opt-in descriptions
- Track whether toll-free or 10DLC is the right long-term path as agent count grows — 10DLC might be cheaper at high volume but operationally heavier
- Note any differences in deliverability between toll-free and local numbers for future reference

---

## Execution Plan

### Phase A: Toll-Free Number Support (code changes)

1. **Read first**: `lib/telnyx/phone-numbers.ts`, `app/api/phone-numbers/search/route.ts`, `app/api/phone-numbers/purchase/route.ts`
2. Extend phone number search to include toll-free number types (pass `number_type: "toll_free"` to Telnyx search API)
3. Extend purchase flow to handle toll-free numbers — same billing group assignment, but also auto-create/assign messaging profile
4. Add a `number_type` indicator (`local` | `toll_free`) to `agent_phone_numbers` table if not already present
5. In settings UI (`components/settings/phone-numbers-settings-client.tsx`), add a toggle or filter to search for toll-free numbers

### Phase B: SMS From-Number Resolution

1. **Read first**: `lib/sms/send.ts`
2. Modify from-number resolution to prefer toll-free number for SMS, falling back to local number
3. If agent has no purchased numbers at all, return clear error

### Phase C: Opt-In/Opt-Out Compliance

1. **Read first**: `app/api/webhooks/sms/route.ts`
2. Add STOP keyword recognition in inbound webhook — set `sms_opt_out: true` on the lead record
3. Add HELP keyword recognition — respond with canned message: "Reply STOP to opt out. For assistance, contact your agent directly."
4. In SMS send logic, check `sms_opt_out` flag before sending — block send if opted out, show message in UI
5. Add `sms_opt_out` boolean column to `leads` table if not present (via Supabase migration)

### Phase D: Verification Status

1. Add Telnyx toll-free verification status check (GET toll-free verification endpoint)
2. Surface status in phone numbers settings: Pending / Verified / Rejected
3. Show warning banner if agent tries to send SMS with unverified toll-free number
