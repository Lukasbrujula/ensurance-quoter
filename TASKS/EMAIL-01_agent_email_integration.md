# EMAIL-01: Agent Email Integration via Unified API (Gmail, Outlook, IMAP)

## 1. Model

Use **Opus** for planning/architecture decisions, **Sonnet** for execution. This is a new integration with multiple providers and a new data model — needs careful design before code.

## 2. Tools Required

- **Codebase files** (read first):
  - `lib/google/oauth.ts` — existing Google OAuth flow (HMAC-signed state, token exchange)
  - `lib/google/calendar-service.ts` — existing Calendar event CRUD + token refresh
  - `lib/supabase/google-integrations.ts` — encrypted OAuth token storage
  - `app/api/auth/google/route.ts` — OAuth initiation
  - `app/api/auth/google/callback/route.ts` — OAuth callback + token exchange
  - `components/inbox/inbox-page-client.tsx` — existing 3-column inbox (currently SMS-only)
  - `components/inbox/conversation-thread.tsx` — thread view
  - `components/inbox/conversation-list.tsx` — conversation previews
  - `components/settings/integrations-settings-client.tsx` — integrations page
  - `lib/supabase/inbox.ts` — conversation previews query

- **External API docs** (fetch before coding):
  - Nylas Email API: https://developer.nylas.com/docs/v3/email/
  - Nylas Node.js SDK: https://developer.nylas.com/docs/v3/sdks/node/
  - Nylas Authentication: https://developer.nylas.com/docs/v3/auth/
  - OR Gmail API: https://developers.google.com/workspace/gmail/api
  - OR Microsoft Graph API for Outlook: https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview

- **Supabase MCP** for schema migrations
- **New dependency**: `nylas` npm package (if using Nylas) OR `googleapis` (if building per-provider)

## 3. Guardrails

- **DO NOT** modify the existing Google Calendar OAuth flow — it works. Email integration either extends it (adds scopes) or runs parallel.
- **DO NOT** break the existing SMS inbox — email is an additional channel, not a replacement. The inbox must show both SMS and email conversations.
- **DO NOT** store raw email bodies unencrypted — use the same AES-256-GCM encryption pattern as `sms_logs` and `call_logs`
- **DO NOT** modify Telnyx calling, AI agents, or quote engine code
- **DO NOT** sync the agent's entire mailbox — only sync emails related to leads (by matching email addresses in the leads table) or emails sent/received through the platform
- **DO NOT** guess at the provider architecture — read this entire document and make a build-vs-buy decision first
- **DO NOT** store email passwords or app-specific passwords — OAuth only for Gmail and Outlook; IMAP with OAuth2 token for other providers

## 4. Knowledge

### The Architecture Decision: Build vs. Buy

There are two viable approaches:

#### Option A: Nylas (Unified Email API) — Recommended for Multi-Provider

Nylas provides a single API that works with Gmail, Outlook/Exchange, Yahoo, iCloud, and any IMAP provider. You integrate once and it handles OAuth flows, token refresh, provider quirks, and data normalization.

**Pros:**
- One integration covers ALL email providers
- Handles OAuth for Gmail and Microsoft natively
- Handles IMAP providers (Yahoo, iCloud, custom domains) automatically
- Token refresh, sync, and deliverability are managed
- Node.js SDK available
- Free sandbox with 5 connected accounts for development

**Cons:**
- Additional service dependency (~$5/month base + per-account pricing)
- Email data passes through Nylas servers (encrypted, SOC 2 compliant)
- Another vendor relationship to manage

**Pricing:** $5/month base includes 5 connected accounts. Additional accounts vary by plan. For early-stage with <50 agents, cost is minimal.

#### Option B: Direct Provider Integration (Gmail API + Microsoft Graph + IMAP)

Build separate integrations for each provider.

**Pros:**
- No third-party dependency
- No per-account recurring cost
- Full control over data flow

**Cons:**
- Three separate integrations to build and maintain (Gmail API, Microsoft Graph, IMAP+OAuth2)
- Gmail requires Google's restricted scope OAuth verification (takes weeks, requires security assessment)
- Microsoft requires Azure AD app registration + admin consent flows
- IMAP with OAuth2 is different per provider
- You maintain token refresh, error handling, provider quirks for each
- Months of additional engineering time

**Recommendation:** Start with **Nylas** for the MVP. It solves the multi-provider problem immediately and the cost is negligible at early scale. If Nylas becomes too expensive at 500+ agents, you can migrate to direct integrations later — the data model and UI won't change, only the backend provider.

If Lukas strongly prefers not adding another vendor, **Option B fallback** is: Gmail API first (you already have Google OAuth), then add Outlook later. But this means non-Gmail users can't connect their email initially.

### How It Fits the Existing Inbox

The current inbox (`components/inbox/`) is a 3-column SMS layout:
- Left: conversation list (by lead phone number)
- Center: message thread
- Right: contact/lead sidebar

For email, this becomes a unified communications inbox:
- Left: conversation list — now shows BOTH SMS and email threads, with an icon indicating channel type. Filter tabs: All | SMS | Email
- Center: message thread — renders SMS bubbles AND email messages (email shows subject, rich HTML body, attachments)
- Right: contact/lead sidebar — unchanged

Each conversation is tied to a lead. An agent sees all communications with a lead (calls, SMS, emails) in one timeline.

### What Needs to Be Built

1. **Email provider connection flow** — Agent goes to Settings → Integrations → "Connect Email" → Nylas hosted auth (or Google OAuth with Gmail scopes) → tokens stored in DB
2. **Email sync** — Background job or webhook that pulls new emails matching lead email addresses into the platform
3. **Email send** — Agent composes email in the inbox, sent via the connected email account (appears in their actual Sent folder)
4. **Email storage** — `email_logs` table (encrypted, similar to `sms_logs`) storing subject, body snippet, from, to, timestamps, thread ID
5. **Inbox unification** — Conversation list shows both SMS and email, thread view renders both types
6. **Email in lead detail** — Lead detail page shows email history alongside SMS and call history

## 5. Memory

- Google OAuth is already implemented for Calendar (`lib/google/oauth.ts`). The pattern for token exchange, encrypted storage in `google_integrations`, and refresh logic exists. If going direct Gmail route, extend this — add `gmail.readonly` and `gmail.send` scopes to the existing OAuth flow.
- Clerk supports Google as a social connection and can provide OAuth access tokens with additional scopes via `getUserOauthAccessToken()`. However, the existing Calendar integration uses a separate OAuth flow (not through Clerk). Decide whether to unify or keep them separate.
- All sensitive data in the platform uses AES-256-GCM encryption (`lib/encryption/crypto.ts`). Email bodies must follow the same pattern.
- The inbox currently polls every 30 seconds for new SMS conversations. Email sync should use the same polling pattern or webhooks from Nylas/Gmail push notifications.
- Resend is currently used for transactional emails (quote sharing, follow-up reminders). Agent email integration is DIFFERENT — it's the agent's own email account, not the platform sending on behalf.

## 6. Success Criteria

1. **Connect Gmail**: Agent can connect their Gmail account via Settings → Integrations. OAuth flow completes, tokens stored encrypted.
2. **Connect Outlook**: Agent can connect their Outlook/Microsoft 365 account. OAuth flow completes, tokens stored encrypted.
3. **Connect IMAP**: Agent can connect any IMAP-compatible email (Yahoo, iCloud, custom domain). Credentials stored encrypted.
4. **Send email from inbox**: Agent can compose and send an email to a lead from the inbox. Email appears in agent's actual Sent folder on their email provider.
5. **Receive email in inbox**: When a lead replies to the agent's email, the reply appears in the Ensurance inbox thread.
6. **Unified conversation view**: Inbox conversation list shows both SMS and email threads with clear channel indicators. Filter tabs work.
7. **Email in lead detail**: Lead detail page shows email history in the communications timeline.
8. **Disconnect**: Agent can disconnect their email account from Settings. Tokens are revoked and deleted.
9. **Multi-provider**: At least Gmail and Outlook work. IMAP is a bonus for MVP.
10. **No SMS regression**: All existing SMS inbox functionality unchanged.
11. **No Calendar regression**: Existing Google Calendar connection unchanged.
12. **Build passes**: `bunx tsc --noEmit` and `bun run build` both succeed.

## 7. Dependencies

- **If Nylas**: Nylas account (free sandbox), `nylas` npm package, Nylas API key
- **If direct Gmail**: Existing Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), additional Gmail scopes added to OAuth consent screen, Google's restricted scope verification (takes weeks for production)
- **If direct Outlook**: Azure AD app registration, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` env vars
- Existing `google_integrations` table (for token storage pattern)
- Existing inbox components (for UI extension)
- `sms_logs` table (pattern reference for `email_logs`)
- Encryption utilities (`lib/encryption/crypto.ts`)

## 8. Failure Handling

| Error | Cause | Fix |
|-------|-------|-----|
| Gmail OAuth rejected | App not verified for restricted scopes | Use Nylas (handles verification), or submit Google verification |
| Outlook OAuth fails | Azure AD app not configured | Register app in Azure portal, add redirect URIs |
| Token refresh fails | User revoked access | Show "Reconnect Email" prompt in settings, clear stale tokens |
| Email send fails | Rate limit or provider block | Queue and retry; surface error to agent with specific provider error |
| Nylas webhook not firing | Webhook URL not configured | Verify Nylas dashboard webhook points to production domain |
| HTML email renders badly | Complex email HTML | Use `DOMPurify` or iframe sandboxing for rendering; strip scripts |
| Email sync too slow | Polling interval too long | For Nylas, use webhooks (real-time); for direct, use Gmail push notifications or reduce poll interval |
| IMAP connection times out | Firewall or wrong port | Validate IMAP settings on save; show connection test result |

## 9. Learning

- Document which approach was chosen (Nylas vs direct) and why, so future decisions about adding providers are informed
- If Nylas: document the grant/account model and how it maps to agents
- If direct Gmail: document the verification process, timeline, and any scope limitations encountered
- Track email deliverability metrics — are agent emails landing in spam when sent through the API vs. directly from Gmail?
- Note whether Clerk's OAuth token approach works better than the separate OAuth flow for Calendar — could consolidate both if so
- Document any IMAP provider quirks (Yahoo requires app-specific passwords despite OAuth, iCloud has unique auth flow, etc.)

---

## Execution Plan

### Phase A: Architecture Decision + Provider Setup

1. **Lukas decides**: Nylas or direct? (Recommendation: Nylas for multi-provider, direct Gmail if cost-sensitive)
2. If Nylas: Create account, get API key, add `NYLAS_API_KEY` and `NYLAS_CALLBACK_URL` to env vars
3. If direct: Add Gmail scopes to existing Google OAuth consent screen, register Azure AD app for Outlook
4. Create `email_logs` table (Supabase migration):
   ```sql
   create table email_logs (
     id uuid primary key default gen_random_uuid(),
     agent_id text not null,
     lead_id uuid references leads(id),
     provider text not null, -- 'gmail', 'outlook', 'imap'
     message_id text, -- provider's message ID
     thread_id text, -- provider's thread ID
     direction text not null, -- 'inbound', 'outbound'
     from_address text not null,
     to_address text not null,
     subject text, -- encrypted
     body_snippet text, -- encrypted, first 200 chars
     body_html text, -- encrypted, full HTML
     has_attachments boolean default false,
     read boolean default false,
     created_at timestamptz default now(),
     synced_at timestamptz default now()
   );
   -- RLS
   alter table email_logs enable row level security;
   create policy "Agents see own emails" on email_logs
     for all using (agent_id = requesting_user_id());
   ```

### Phase B: Email Connection Flow

1. Build Settings → Integrations → "Connect Email" card (alongside existing Google Calendar and Billing Group cards)
2. If Nylas: Use Nylas hosted auth — redirect agent to Nylas, callback stores grant ID
3. If direct: Extend Google OAuth to include Gmail scopes; build separate Microsoft OAuth flow
4. Store connection metadata in `google_integrations` (extend) or new `email_integrations` table
5. Build disconnect flow — revoke tokens, delete from DB

### Phase C: Email Send

1. Build email compose UI in the inbox thread view — subject line, rich text body, send button
2. API route: `POST /api/email/send` — takes lead_id, subject, body, sends via connected account
3. Save sent email to `email_logs`
4. Show sent email in conversation thread

### Phase D: Email Sync (Inbound)

1. If Nylas: Configure webhook for `message.created` events → `POST /api/webhooks/email`
2. If direct: Set up Gmail push notifications (pub/sub) or polling job
3. Match inbound emails to leads by email address
4. Save to `email_logs`, show in inbox conversation list
5. Create notification for agent when new email arrives

### Phase E: Unified Inbox

1. Modify `components/inbox/conversation-list.tsx` — merge SMS and email conversations, add channel indicator icons (phone icon vs envelope icon)
2. Add filter tabs: All | SMS | Email
3. Modify `components/inbox/conversation-thread.tsx` — render email messages differently from SMS (show subject line, render HTML body safely, show attachment indicators)
4. Modify `lib/supabase/inbox.ts` — query both `sms_logs` and `email_logs` for conversation previews

### Phase F: Lead Detail Integration

1. Add email section to lead detail timeline (alongside calls, SMS, notes)
2. Show email count on lead list (similar to existing call count badge)
