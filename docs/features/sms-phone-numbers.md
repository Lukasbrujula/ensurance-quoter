# SMS & Phone Number Management

## Overview

Agents can purchase Telnyx phone numbers, use them to send/receive SMS from the inbox, and manage numbers in settings. The system supports per-agent numbers with a primary number for outbound SMS, inbound SMS via webhook, and automatic lead matching/creation.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Settings > Phone Numbers                                │
│  ├── Search available numbers (Telnyx API)              │
│  ├── Purchase number → creates messaging profile (lazy) │
│  ├── Set primary number                                  │
│  └── Release number (Telnyx + DB)                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Outbound SMS (Inbox compose / API / Cron)               │
│  From-number resolution order:                           │
│  1. Explicit `fromNumber` param                          │
│  2. Agent's primary number (DB lookup)                   │
│  3. TELNYX_CALLER_NUMBER env var (legacy fallback)       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Inbound SMS Webhook (POST /api/webhooks/sms)            │
│  ├── Telnyx sends `message.received` event              │
│  ├── Look up `to` number → get agent_id                 │
│  ├── Look up `from` number → match lead by phone digits │
│  ├── Auto-create lead if no match (source: "sms")       │
│  ├── Save to sms_logs (encrypted, direction: "inbound") │
│  └── Log sms_received activity                          │
└─────────────────────────────────────────────────────────┘
```

## Database

### `agent_phone_numbers` table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | gen_random_uuid() |
| agent_id | UUID (FK → auth.users) | ON DELETE CASCADE |
| phone_number | TEXT UNIQUE | E.164 format |
| telnyx_phone_number_id | TEXT | Telnyx's ID for the number |
| ai_agent_id | UUID (FK → ai_agents) | Optional link to AI agent, SET NULL on delete |
| is_primary | BOOLEAN | Only one per agent (enforced in app logic) |
| label | TEXT | User-defined label |
| sms_enabled | BOOLEAN | Default true |
| voice_enabled | BOOLEAN | Default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS**: SELECT/INSERT/UPDATE/DELETE for `agent_id = auth.uid()`.
**Indexes**: `phone_number`, `agent_id`.

### `agent_settings` addition

| Column | Type | Notes |
|--------|------|-------|
| telnyx_messaging_profile_id | TEXT | Lazily created on first number purchase |

## Telnyx Integration

### Messaging Profile (one per agent)

Created lazily on first phone number purchase. The webhook URL points to `{NEXT_PUBLIC_APP_URL}/api/webhooks/sms`. All numbers purchased by the agent are assigned to this profile, so inbound SMS for any of their numbers routes to the same webhook.

**Files**: `lib/telnyx/messaging-profiles.ts`, `lib/supabase/settings.ts` (getMessagingProfileId/setMessagingProfileId)

### Phone Number Lifecycle

1. **Search**: `GET /v2/available_phone_numbers` with state/area code/city filters
2. **Purchase**: `POST /v2/number_orders` with messaging profile attached
3. **Release**: `DELETE /v2/phone_numbers/{id}`

**File**: `lib/telnyx/phone-numbers.ts`

## API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/phone-numbers` | GET | Session | List agent's numbers |
| `/api/phone-numbers/search` | POST | Session | Search available Telnyx numbers |
| `/api/phone-numbers/purchase` | POST | Session | Buy a number (creates messaging profile if needed) |
| `/api/phone-numbers/[id]` | PUT | Session | Update label, primary, linked AI agent |
| `/api/phone-numbers/[id]` | DELETE | Session | Release on Telnyx + delete from DB |
| `/api/webhooks/sms` | POST | None* | Telnyx inbound SMS webhook |

*Webhook has no auth guard but validates `to` number exists in DB.

## SMS Sending

### From-Number Resolution (`lib/sms/send.ts`)

```
resolveFromNumber(agentId, explicitFrom?):
  1. If explicitFrom provided → use it
  2. Look up agent's primary number in agent_phone_numbers → use it
  3. Fall back to TELNYX_CALLER_NUMBER env var
  4. If none → return error "No from number configured"
```

Both `lib/sms/send.ts` (shared function for cron) and `app/api/sms/route.ts` (user-triggered) use this resolution.

### Phone Normalization (`lib/utils/phone.ts`)

Shared utilities extracted from the duplicate `normalizeToE164()` functions:

- `normalizeToE164(phone)` — converts to `+1XXXXXXXXXX` format
- `formatPhoneDisplay(phone)` — formats as `(XXX) XXX-XXXX`
- `phoneLast10(phone)` — extracts last 10 digits for comparison

## Inbound SMS Webhook

**Route**: `POST /api/webhooks/sms`

**Flow**:
1. Parse Telnyx `message.received` payload (from, to, text, id)
2. Normalize both phone numbers to E.164
3. Look up `to` number in `agent_phone_numbers` → get `agent_id`
4. If number not found → ignore (200 response)
5. Look up `from` number against agent's leads (last-10-digit match)
6. If no lead found → auto-create with `source: "sms"`, `status: "new"`, `first_name: "Unknown"`
7. Save to `sms_logs` with `direction: "inbound"` (encrypted, service role client)
8. Insert `sms_received` activity log
9. Always return 200 (prevent Telnyx retries)

## Settings UI

**Page**: `/settings/phone-numbers`
**Component**: `components/settings/phone-numbers-settings-client.tsx`

### Your Numbers section
- Table: Number (formatted), Label, SMS enabled badge, Primary (star badge or "Set Primary" button), Release button
- Release requires AlertDialog confirmation
- Empty state with guidance to purchase

### Get a Number section
- State dropdown (50 US states) + area code input
- Search results table: Number, Location, Monthly rate, Purchase button
- Purchase immediately adds to "Your Numbers"
- First purchased number auto-set as primary

## Inbox Integration

### Polling
- **Conversations**: 30s interval (`inbox-page-client.tsx`)
- **Messages**: 15s interval when conversation selected (`conversation-thread.tsx`)

### Compose Footer
- Shows "Sending from (XXX) XXX-XXXX" when agent has a primary number
- Shows amber warning with link to settings when no number configured
- Inbound messages render as left-aligned gray bubbles (existing styling)

## Activity Types

Added `sms_received` to `ActivityType` union. Configured in:
- `components/dashboard/dashboard-client.tsx` — emerald color
- `components/leads/activity-timeline.tsx` — emerald color + dot

## Data Access Layer

### `lib/supabase/phone-numbers.ts`

| Function | Auth | Purpose |
|----------|------|---------|
| `listPhoneNumbers(agentId)` | Auth client | List all agent's numbers |
| `getPhoneNumberByNumber(phone, client?)` | Either | Webhook lookup by E.164 number |
| `createPhoneNumber(input)` | Auth client | Insert after purchase |
| `updatePhoneNumber(agentId, id, input)` | Auth client | Update label/primary/link |
| `deletePhoneNumber(agentId, id)` | Auth client | Remove after Telnyx release |
| `getPrimaryPhoneNumber(agentId, client?)` | Either | Get primary for SMS sending |

### `lib/supabase/leads.ts` addition

| Function | Auth | Purpose |
|----------|------|---------|
| `findLeadByPhone(agentId, phone, client?)` | Either | Match lead by last-10-digit phone comparison |

## Backward Compatibility

- If no purchased number exists, SMS still works via `TELNYX_CALLER_NUMBER` env var
- Existing SMS logs and inbox display are unaffected
- No migration needed for existing sms_logs data
