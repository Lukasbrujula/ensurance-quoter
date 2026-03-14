# Multi-Tenant Audit — Ensurance Quoter

Snapshot of current patterns a multi-tenancy migration must understand and preserve.
Generated: 2026-03-13. Read-only — no code was modified.

---

## 1. Auth & Supabase Client Pattern

### `lib/supabase/clerk-client.ts` (server-side)

```typescript
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database.generated"

/**
 * Server-side Supabase client authenticated via Clerk JWT.
 * Respects RLS — requesting_user_id() resolves from the Clerk token.
 * Use in Server Components, API routes, and server actions.
 */
export async function createClerkSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  const { getToken } = await auth()
  const token = await getToken()

  return createClient<Database>(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

/**
 * Get the current Clerk user ID or throw.
 * Drop-in replacement for the old requireUser() — returns { id, ... }
 * so callers using `user.id` continue to work.
 */
export async function requireClerkUser(): Promise<{ id: string }> {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  return { id: userId }
}
```

### `lib/supabase/clerk-client-browser.ts` (browser hook)

```typescript
"use client"

import { useMemo } from "react"
import { useAuth } from "@clerk/nextjs"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/types/database.generated"

/**
 * Browser-side Supabase client authenticated via Clerk JWT.
 * Uses a custom fetch wrapper to attach a fresh Clerk token on every request.
 * Must be called inside a React component (it's a hook).
 *
 * Replaces createAuthBrowserClient() from auth-client.ts.
 */
export function useClerkSupabase() {
  const { getToken } = useAuth()

  return useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }

    return createClient<Database>(url, anonKey, {
      global: {
        fetch: async (input, init = {}) => {
          const clerkToken = await getToken()
          const headers = new Headers(init?.headers)
          headers.set("Authorization", `Bearer ${clerkToken}`)
          return fetch(input, { ...init, headers })
        },
      },
    })
  }, [getToken])
}
```

### `lib/middleware/auth-guard.ts`

```typescript
import { auth } from "@clerk/nextjs/server"
import { timingSafeEqual } from "crypto"
import { NextResponse } from "next/server"

/**
 * Auth guard for API routes.
 *
 * Authentication order:
 * 1. Shared secret via X-API-Secret header (server-to-server)
 * 2. Clerk session (browser calls)
 *
 * Always returns 401 if no auth method succeeds.
 */
export async function requireAuth(
  _request: Request
): Promise<NextResponse | null> {
  // Path 1: Shared secret (server-to-server)
  const secret = process.env.INTERNAL_API_SECRET
  if (secret) {
    const provided = _request.headers.get("x-api-secret")
    if (provided && safeCompare(provided, secret)) return null
  }

  // Path 2: Clerk session
  const { userId } = await auth()
  if (userId) return null

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}

/** Constant-time string comparison to prevent timing attacks. */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}
```

### `middleware.ts` (relevant auth section)

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/middleware/csrf"

const isPublicRoute = createRouteMatcher([
  "/",                        // Landing page
  "/pricing",                 // Pricing page
  "/privacy",                 // Privacy policy
  "/terms",                   // Terms of service
  "/support",                 // Support page
  "/auth/(.*)",               // Auth pages
  "/api/ai-agent/(.*)",       // Telnyx AI webhook (signature-verified)
  "/api/webhooks/(.*)",       // SMS webhooks (signature-verified)
  "/api/jobs/(.*)",           // Cron jobs (CRON_SECRET auth)
  "/api/agents/call-complete",    // Telnyx post-call webhook (signature-verified)
  "/api/agents/intake-webhook",   // Telnyx intake webhook (signature-verified)
])

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname

  // CSRF validation for API mutation requests
  if (path.startsWith("/api")) {
    const csrf = validateCSRF(req.method, path, req.headers)
    if (!csrf.valid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

---

## 2. RLS Policies (live from Supabase)

### `requesting_user_id()` function (the RLS backbone)

```sql
CREATE OR REPLACE FUNCTION public.requesting_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  SELECT NULLIF(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$function$
```

> **Note:** This function reads the `sub` claim from the Clerk JWT. All RLS policies
> that use `requesting_user_id()` resolve to the Clerk user ID (a `text` like `user_2xyz...`).
> Two policies on `custom_field_definitions` and `custom_field_values` use `auth.uid()` instead —
> a legacy inconsistency to fix during migration.
> One policy on `email_logs` uses `auth.jwt() ->> 'sub'` directly.

### Policy table

| table | policy | cmd | qual / with_check |
|---|---|---|---|
| activity_logs | Users can insert activities for their leads | INSERT | `agent_id = requesting_user_id()` |
| activity_logs | Users can view activities for their leads | SELECT | `agent_id = requesting_user_id()` |
| agent_business_profile | Users can delete own business profile | DELETE | `agent_id = requesting_user_id()` |
| agent_business_profile | Users can insert own business profile | INSERT | `agent_id = requesting_user_id()` |
| agent_business_profile | Users can read own business profile | SELECT | `agent_id = requesting_user_id()` |
| agent_business_profile | Users can update own business profile | UPDATE | `agent_id = requesting_user_id()` |
| agent_licenses | Agents delete own licenses | DELETE | `agent_id = requesting_user_id()` |
| agent_licenses | Agents manage own licenses | INSERT | `agent_id = requesting_user_id()` |
| agent_licenses | Agents see own licenses | SELECT | `agent_id = requesting_user_id()` |
| agent_licenses | Agents update own licenses | UPDATE | `agent_id = requesting_user_id()` |
| agent_phone_numbers | Users can delete own phone numbers | DELETE | `agent_id = requesting_user_id()` |
| agent_phone_numbers | Users can insert own phone numbers | INSERT | `agent_id = requesting_user_id()` |
| agent_phone_numbers | Users can update own phone numbers | UPDATE | `agent_id = requesting_user_id()` |
| agent_phone_numbers | Users can view own phone numbers | SELECT | `agent_id = requesting_user_id()` |
| agent_settings | Users can insert own settings | INSERT | `user_id = requesting_user_id()` |
| agent_settings | Users can update own settings | UPDATE | `user_id = requesting_user_id()` |
| agent_settings | Users can view own settings | SELECT | `user_id = requesting_user_id()` |
| ai_agent_calls | Agents can insert their AI calls | INSERT | `agent_id = requesting_user_id()` |
| ai_agent_calls | Agents can update their AI calls | UPDATE | `agent_id = requesting_user_id()` |
| ai_agent_calls | Users can view their AI calls | SELECT | `agent_id = requesting_user_id()` |
| ai_agents | Users can manage their own agents | ALL | `agent_id = requesting_user_id()` |
| ai_transcripts | Service role can insert transcripts | INSERT | `true` (open insert — service role only in practice) |
| ai_transcripts | Users can view their own transcripts | SELECT | `agent_id = requesting_user_id()` |
| call_logs | Agents can create own call_logs | INSERT | `lead_id IN (SELECT leads.id FROM leads WHERE leads.agent_id = requesting_user_id())` |
| call_logs | Agents can view own call_logs | SELECT | `lead_id IN (SELECT leads.id FROM leads WHERE leads.agent_id = requesting_user_id())` |
| custom_field_definitions | Agents manage own field definitions | ALL | `agent_id = (auth.uid())::text` ⚠️ uses `auth.uid()` not `requesting_user_id()` |
| custom_field_values | Agents manage own lead field values | ALL | `lead_id IN (SELECT leads.id FROM leads WHERE leads.agent_id = (auth.uid())::text)` ⚠️ |
| email_logs | Agents see own emails | ALL | `agent_id = (SELECT (auth.jwt() ->> 'sub'))` ⚠️ uses raw jwt claim |
| enrichments | Agents can create own enrichments | INSERT | `lead_id IN (SELECT leads.id FROM leads WHERE leads.agent_id = requesting_user_id())` |
| enrichments | Agents can view own enrichments | SELECT | `lead_id IN (SELECT leads.id FROM leads WHERE leads.agent_id = requesting_user_id())` |
| google_integrations | Users can manage own google integration | ALL | `agent_id = requesting_user_id()` |
| lead_notes | Agents can delete their own notes | DELETE | `agent_id = requesting_user_id()` |
| lead_notes | Agents can insert notes for their leads | INSERT | `agent_id = requesting_user_id()` |
| lead_notes | Agents can view notes for their leads | SELECT | `agent_id = requesting_user_id()` |
| leads | Agents can create own leads | INSERT | `agent_id = requesting_user_id()` |
| leads | Agents can delete own leads | DELETE | `agent_id = requesting_user_id()` |
| leads | Agents can update own leads | UPDATE | `agent_id = requesting_user_id()` |
| leads | Agents can view own leads | SELECT | `agent_id = requesting_user_id()` |
| quotes | Agents can create own quotes | INSERT | `lead_id IN (SELECT leads.id FROM leads WHERE leads.agent_id = requesting_user_id())` |
| quotes | Agents can view own quotes | SELECT | `lead_id IN (SELECT leads.id FROM leads WHERE leads.agent_id = requesting_user_id())` |
| sms_logs | Agents see own SMS | SELECT | `agent_id = requesting_user_id()` |
| sms_logs | Agents send SMS | INSERT | `agent_id = requesting_user_id()` |

### ⚠️ RLS Inconsistencies to Fix

1. `custom_field_definitions` — uses `auth.uid()` (Supabase Auth UUID) not `requesting_user_id()` (Clerk text ID)
2. `custom_field_values` — same issue, joins via `auth.uid()`
3. `email_logs` — uses raw `auth.jwt() ->> 'sub'` instead of `requesting_user_id()`
4. `agent_business_profile` migration (20260305) used `auth.uid()` (uuid type) — the live table has been patched to use `requesting_user_id()` but the migration file still references `auth.uid()` as uuid FK to `auth.users(id)`

---

## 3. Database Schema

### `leads`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| agent_id | text | NO | requesting_user_id() |
| first_name | text | YES | |
| last_name | text | YES | |
| email | text | YES | |
| phone | text | YES | |
| state | text | YES | |
| age | smallint | YES | |
| gender | text | YES | |
| tobacco_status | text | YES | |
| medical_conditions | ARRAY | YES | '{}' |
| dui_history | boolean | YES | false |
| years_since_last_dui | smallint | YES | |
| coverage_amount | integer | YES | |
| term_length | smallint | YES | |
| source | text | NO | 'manual' |
| raw_csv_data | jsonb | YES | |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| date_of_birth | date | YES | |
| address | text | YES | |
| city | text | YES | |
| zip_code | text | YES | |
| marital_status | text | YES | |
| occupation | text | YES | |
| income_range | text | YES | |
| dependents | integer | YES | |
| existing_coverage | text | YES | |
| status | text | NO | 'new' |
| status_updated_at | timestamptz | YES | |
| follow_up_date | timestamptz | YES | |
| follow_up_note | text | YES | |
| notes | text | YES | |
| google_event_id | text | YES | |
| pre_screen | jsonb | YES | |
| sms_reminder | boolean | YES | false |
| sms_reminder_sent_at | timestamptz | YES | |
| height_feet | smallint | YES | |
| height_inches | smallint | YES | |
| weight | numeric | YES | |
| nicotine_type | text | YES | |
| sms_opt_out | boolean | NO | false |
| starred | boolean | NO | false |
| urgent | boolean | NO | false |

### `quotes`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| lead_id | uuid | NO | |
| request_data | jsonb | NO | |
| response_data | jsonb | NO | |
| created_at | timestamptz | NO | now() |

### `call_logs`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| lead_id | uuid | NO | |
| direction | text | NO | |
| provider | text | NO | |
| provider_call_id | text | YES | |
| duration_seconds | integer | YES | |
| recording_url | text | YES | |
| transcript_text | text | YES | |
| started_at | timestamptz | YES | |
| ended_at | timestamptz | YES | |
| ai_summary | text | YES | |
| coaching_hints | jsonb | YES | |
| extracted_data | jsonb | YES | |
| extraction_status | text | YES | 'pending' |
| extraction_model | text | YES | |
| caller_name | text | YES | |
| caller_phone | text | YES | |
| transcript_data | jsonb | YES | |

### `activity_logs`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| lead_id | uuid | NO | |
| agent_id | text | NO | requesting_user_id() |
| activity_type | text | NO | |
| title | text | NO | |
| details | jsonb | YES | |
| created_at | timestamptz | YES | now() |

### `sms_logs`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| lead_id | uuid | NO | |
| agent_id | text | NO | requesting_user_id() |
| direction | text | NO | 'outbound' |
| to_number | text | NO | |
| from_number | text | NO | |
| message | text | NO | |
| status | text | YES | 'sent' |
| telnyx_message_id | text | YES | |
| created_at | timestamptz | YES | now() |
| is_read | boolean | NO | false |

### `agent_settings`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | text | NO | requesting_user_id() |
| default_first_year_percent | numeric | NO | 75 |
| default_renewal_percent | numeric | NO | 5 |
| carrier_commissions | jsonb | NO | '[]' |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| telnyx_ai_assistant_id | text | YES | |
| telnyx_ai_enabled | boolean | YES | false |
| last_notifications_read_at | timestamptz | YES | now() |
| business_info | jsonb | YES | '{}' |
| telnyx_messaging_profile_id | text | YES | |
| telnyx_billing_group_id | text | YES | |
| selected_carriers | jsonb | YES | null |
| dashboard_layout | jsonb | YES | null |

### `agent_licenses`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| agent_id | text | NO | requesting_user_id() |
| state | text | NO | |
| license_number | text | NO | |
| license_type | text | YES | 'Life & Health' |
| issue_date | date | YES | |
| expiration_date | date | YES | |
| status | text | YES | 'active' |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### `agent_phone_numbers`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| agent_id | text | NO | requesting_user_id() |
| phone_number | text | NO | |
| telnyx_phone_number_id | text | YES | |
| ai_agent_id | uuid | YES | |
| is_primary | boolean | NO | false |
| label | text | YES | |
| sms_enabled | boolean | NO | true |
| voice_enabled | boolean | NO | true |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| number_type | text | NO | 'local' |

### `ai_agents`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| agent_id | text | NO | requesting_user_id() |
| telnyx_assistant_id | text | YES | |
| name | text | NO | 'Insurance Intake Agent' |
| description | text | YES | |
| status | text | NO | 'inactive' |
| phone_number | text | YES | |
| greeting | text | YES | |
| system_prompt | text | YES | |
| voice | text | YES | 'Telnyx.NaturalHD.astra' |
| model | text | YES | 'Qwen/Qwen3-235B-A22B' |
| total_calls | integer | YES | 0 |
| total_minutes | numeric | YES | 0 |
| last_call_at | timestamptz | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| faq_entries | jsonb | YES | '[]' |
| business_hours | jsonb | YES | |
| after_hours_greeting | text | YES | |
| personality | text | YES | |
| collect_fields | jsonb | YES | '["name","phone","reason","callback_time"]' |
| post_call_actions | jsonb | YES | '["save_lead","book_calendar","send_notification"]' |
| knowledge_base | text | YES | |
| spanish_agent_assistant_id | text | YES | |
| custom_collect_fields | jsonb | YES | '[]' |
| spanish_enabled | boolean | YES | false |
| tone_preset | text | YES | 'professional' |
| call_forward_number | text | YES | |

### `ai_agent_calls`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| agent_id | text | NO | requesting_user_id() |
| telnyx_conversation_id | text | YES | |
| caller_phone | text | YES | |
| caller_name | text | YES | |
| callback_number | text | YES | |
| reason | text | YES | |
| callback_time | text | YES | |
| age_range | text | YES | |
| state | text | YES | |
| urgency | text | YES | 'low' |
| notes | text | YES | |
| transcript | text | YES | |
| processed | boolean | YES | false |
| lead_id | uuid | YES | |
| created_at | timestamptz | YES | now() |
| ai_agent_id | uuid | YES | |

### `ai_transcripts`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| call_id | uuid | NO | |
| ai_agent_id | uuid | NO | |
| agent_id | text | NO | requesting_user_id() |
| role | text | NO | |
| content | text | NO | |
| message_index | integer | NO | 0 |
| timestamp | timestamptz | YES | |
| created_at | timestamptz | YES | now() |

### `lead_notes`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| lead_id | uuid | NO | |
| agent_id | text | NO | requesting_user_id() |
| content | text | NO | |
| created_at | timestamptz | YES | now() |

### `enrichments`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| lead_id | uuid | NO | |
| pdl_data | jsonb | NO | |
| enriched_at | timestamptz | NO | now() |

### `google_integrations`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| agent_id | text | NO | requesting_user_id() |
| access_token | text | NO | |
| refresh_token | text | NO | |
| token_expiry | timestamptz | NO | |
| email | text | YES | |
| calendar_id | text | YES | 'primary' |
| connected_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| gmail_connected | boolean | NO | false |

### `agent_business_profile`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| agent_id | text | NO | requesting_user_id() |
| business_name | text | YES | |
| knowledge_base | text | YES | |
| faq | jsonb | YES | '[]' |
| updated_at | timestamptz | NO | now() |
| business_hours | jsonb | YES | |

### `custom_field_definitions`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| agent_id | text | NO | |
| field_name | text | NO | |
| field_key | text | NO | |
| field_type | text | NO | 'text' |
| options | jsonb | YES | |
| display_order | integer | NO | 0 |
| is_required | boolean | NO | false |
| created_at | timestamptz | NO | now() |

### `custom_field_values`

| column | type | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| lead_id | uuid | NO | |
| field_definition_id | uuid | NO | |
| value | text | YES | |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

---

## 4. Representative API Routes

### `app/api/dashboard/stats/route.ts`

```typescript
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { getDashboardStats } from "@/lib/supabase/dashboard"

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const stats = await getDashboardStats(userId)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 },
    )
  }
}
```

### `app/api/inbox/conversations/route.ts`

```typescript
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { auth } from "@clerk/nextjs/server"
import { getConversationPreviews } from "@/lib/supabase/inbox"

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const conversations = await getConversationPreviews(userId)
    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("[inbox] GET conversations error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 })
  }
}
```

### `app/api/sms/route.ts`

```typescript
import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAuth } from "@/lib/middleware/auth-guard"
import {
  rateLimiters,
  checkRateLimit,
  getClientIP,
  rateLimitResponse,
} from "@/lib/middleware/rate-limiter"
import { auth } from "@clerk/nextjs/server"
import { getSmsLogs } from "@/lib/supabase/sms"
import { sendSms } from "@/lib/sms/send"

const requestSchema = z.object({
  to: z.string().min(10, "Phone number required"),
  message: z.string().min(1, "Message required").max(1600, "Message too long"),
  leadId: z.string().uuid("Invalid lead ID"),
})

export async function POST(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const body: unknown = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    )
  }

  const { to, message, leadId } = parsed.data

  try {
    const { userId, has } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    if (has && !has({ feature: "sms_messaging" })) {
      return Response.json(
        { error: "This feature requires a Pro plan. Upgrade at /pricing." },
        { status: 403 },
      )
    }

    const result = await sendSms({
      to,
      message,
      leadId,
      agentId: userId,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Failed to send SMS" },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error) {
    console.error("[sms] POST error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to send SMS" },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  const url = new URL(request.url)
  const leadId = url.searchParams.get("leadId")
  if (!leadId) {
    return NextResponse.json({ error: "leadId required" }, { status: 400 })
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(leadId)) {
    return NextResponse.json({ error: "Invalid lead ID" }, { status: 400 })
  }

  try {
    const { userId } = await auth()

    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })
    const logs = await getSmsLogs(leadId, userId)
    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[sms] GET error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load SMS logs" },
      { status: 500 },
    )
  }
}
```

### `app/api/settings/carriers/route.ts`

```typescript
import { z } from "zod"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/middleware/auth-guard"
import { auth } from "@clerk/nextjs/server"
import { getSelectedCarriers, upsertSelectedCarriers } from "@/lib/supabase/settings"
import { rateLimiters, checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/middleware/rate-limiter"

const carriersSchema = z.object({
  selectedCarriers: z.array(
    z.string().regex(/^[A-Z]{4}$/, "CompCode must be 4 uppercase letters"),
  ).min(1).max(200).nullable(),
})

export async function GET(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const selectedCarriers = await getSelectedCarriers(userId)
    return NextResponse.json({ selectedCarriers })
  } catch (error) {
    console.error("GET /api/settings/carriers error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to load carrier settings" },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  const authError = await requireAuth(request)
  if (authError) return authError

  const rl = await checkRateLimit(rateLimiters.api, getClientIP(request))
  if (!rl.success) return rateLimitResponse(rl.remaining)

  try {
    const body: unknown = await request.json()
    const parsed = carriersSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid carrier selection", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { userId } = await auth()
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

    await upsertSelectedCarriers(userId, parsed.data.selectedCarriers)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("PUT /api/settings/carriers error:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: "Failed to save carrier settings" },
      { status: 500 },
    )
  }
}
```

### `app/api/quote/route.ts` (auth + ownership section)

```typescript
// Auth pattern (lines 1-35):
import { auth } from "@clerk/nextjs/server"
import { getSelectedCarriers } from "@/lib/supabase/settings"
import { requireAuth } from "@/lib/middleware/auth-guard"
// ...

// POST handler calls auth() to get userId, then:
//   const { userId } = await auth()
//   const selectedCarriers = await getSelectedCarriers(userId ?? undefined)
// Quote engine is stateless — no DB write for unauthenticated quotes.
// When a lead is active, the LeadStore persists snapshots via server action.
```

### `lib/actions/leads.ts` (full server action file — the primary data mutation layer)

```typescript
"use server"

import { z } from "zod"
import {
  getLeads as dbGetLeads,
  getLead as dbGetLead,
  insertLead as dbInsertLead,
  insertLeadsBatch as dbInsertLeadsBatch,
  updateLead as dbUpdateLead,
  deleteLead as dbDeleteLead,
  saveEnrichment as dbSaveEnrichment,
  saveQuoteSnapshot as dbSaveQuoteSnapshot,
} from "@/lib/supabase/leads"
import { requireClerkUser as requireUser } from "@/lib/supabase/clerk-client"
import { logActivity } from "@/lib/actions/log-activity"
import { runPreScreen } from "@/lib/engine/pre-screen"
import type { Lead, LeadQuoteSnapshot } from "@/lib/types/lead"
import type { EnrichmentResult } from "@/lib/types/ai"
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/google/calendar-service"

// All actions call requireUser() first — throws "Unauthorized" if no Clerk session
// All DB calls pass user.id as the agent_id filter (ownership enforced at data layer)

export async function fetchLeads(): Promise<ActionResult<Lead[]>> {
  const user = await requireUser()           // throws if unauthenticated
  const leads = await dbGetLeads(user.id)    // agent_id = user.id filter
  return { success: true, data: leads }
}

export async function createLead(input: Partial<Lead>): Promise<ActionResult<Lead>> {
  // ...validation...
  const user = await requireUser()
  const created = await dbInsertLead({ ...parsed.data, agentId: user.id })
  // ...
}

export async function updateLeadFields(id: string, fields: Partial<Lead>): Promise<ActionResult<Lead>> {
  // ...validation...
  const user = await requireUser()
  const updated = await dbUpdateLead(parsedId.data, user.id, dbFields)  // ownership filter
  // ...
}

export async function removeLeadAction(id: string): Promise<ActionResult<void>> {
  const user = await requireUser()
  await dbDeleteLead(parsed.data, user.id)   // ownership filter
}

// persistEnrichment, persistQuoteSnapshot, createLeadsBatch follow the same pattern
```

---

## 5. Zustand Stores

### `lib/store/lead-store.ts`

```typescript
import { create } from "zustand"
// ...

// Key patterns:
// - hydrateLeads() calls fetchLeadsAction() (server action) — no userId in client code
// - All mutations go through server actions (updateLeadFieldsAction, etc.)
// - LeadStore holds ALL leads for the current user in memory (no pagination yet)
// - activeLead is set by setActiveLead / switchToLead — UI-only concept
// - fetchQuotes() calls POST /api/quote directly from the browser
// - Quote snapshots auto-persist via persistQuoteSnapshotAction (fire-and-forget)
// - Zustand store is NOT persisted to localStorage (no persist middleware)
//   exception: CommissionStore reads/writes localStorage for migration only

export const useLeadStore = create<LeadStore>()((set, get) => ({
  leads: [],
  activeLead: null,
  isLoading: false,
  dirtyFields: new Set<string>(),
  // ...quote session state...

  hydrateLeads: async () => {
    const result = await fetchLeadsAction()   // server action, userId resolved server-side
    set({ leads: result.data })
  },

  saveActiveLead: async () => {
    const { activeLead } = get()
    const result = await updateLeadFieldsAction(activeLead.id, { ...activeLead })
    // server action enforces ownership via requireUser()
  },
}))
```

### `lib/store/ui-store.ts`

```typescript
import { create } from "zustand"
// Pure UI state — no user data, no auth dependency
// Controls: activeView (list/detail/quote), panel open/close, panel sizes

export const useUIStore = create<UIStoreType>()((set) => ({
  activeView: "list",
  leftPanelOpen: true,
  centerPanelOpen: true,
  rightPanelOpen: true,
  panelSizes: { left: 30, center: 45, right: 25 },
  // ...toggle actions...
}))
```

### `lib/store/commission-store.ts`

```typescript
import { create } from "zustand"
// Commission rates — persisted to /api/settings (agent_settings.carrier_commissions)
// loadFromServer() fetches GET /api/settings (userId resolved server-side via Clerk)
// Debounced auto-save to PUT /api/settings on any change
// localStorage migration: reads old data from 'ensurance-commission-settings' key

export const useCommissionStore = create<CommissionState & CommissionActions>()(
  (set, get) => ({
    commissions: initialCommissions,
    defaultFirstYearPercent: 75,
    defaultRenewalPercent: 5,
    isLoaded: false,

    loadFromServer: async () => {
      const res = await fetch("/api/settings")   // userId from Clerk session
      // ...
    },
  })
)
```

### `lib/store/call-store.ts`

```typescript
import { create } from "zustand"
// Telnyx WebRTC call state — ephemeral, never persisted
// Tracks: callState (idle/connecting/ringing/active/held/ending/error)
// activeLeadId links the active call to a lead record
// transcript + coachingCards are in-memory only

export const useCallStore = create<CallStore>()((set, get) => ({
  isClientReady: false,
  activeCallId: null,
  activeLeadId: null,
  callState: "idle",
  transcript: [],
  coachingCards: [],
  // ...
}))
```

---

## 6. Key Components with Data Fetching

### `components/leads/lead-list.tsx` (data fetching pattern)

```typescript
"use client"
// Uses useLeadStore — no direct data fetching in this component
// hydrateLeads() is called from the leads page layout or a parent component
// LeadList reads from store: const leads = useLeadStore((s) => s.leads)
// All mutations (status change, follow-up) go through updateLeadFields server action
```

### `components/dashboard/dashboard-client.tsx` (data fetching pattern)

```typescript
"use client"
// loadStats() calls GET /api/dashboard/stats — userId resolved server-side
// useFeatureGate("all_dashboard_widgets") — Clerk has() check for Pro plan
// useUser() for display name only (no data fetching)

const loadStats = useCallback(async () => {
  const res = await fetch("/api/dashboard/stats")
  const data: DashboardStats = await res.json()
  setStats(data)
}, [])

useEffect(() => { void loadStats() }, [loadStats])
```

### `components/inbox/inbox-page-client.tsx` (data fetching pattern)

```typescript
"use client"
// loadConversations() calls GET /api/inbox/conversations — userId from Clerk
// Polls every 30 seconds (POLL_INTERVAL = 30_000)
// Also fetches GET /api/phone-numbers for primary number
// hydrateLeads() from LeadStore if leads array is empty

const loadConversations = useCallback(async () => {
  if (leads.length === 0) await hydrateLeads()
  const res = await fetch("/api/inbox/conversations")
  const data = await res.json()
  setConversations(data.conversations)
}, [hydrateLeads, leads.length, selectedLeadId, loading])
```

### Pipeline data fetching

The pipeline view uses the LeadStore directly — no dedicated pipeline API route.
`hydrateLeads()` is called on mount; leads are filtered/grouped by `status` client-side
using the Kanban board components in `components/leads/`.

---

## 7. Clerk Webhook — `app/api/webhooks/clerk/route.ts`

```typescript
import { NextResponse } from "next/server"
import { Webhook } from "svix"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { createBillingGroup } from "@/lib/telnyx/billing"

// POST /api/webhooks/clerk — handles user.created
// Auth: Svix signature verification (CLERK_WEBHOOK_SECRET)
// Uses SERVICE ROLE client (bypasses RLS — no user session in webhooks)

export async function POST(request: Request) {
  // 1. Verify Svix signature
  const wh = new Webhook(secret)
  event = wh.verify(rawBody, { "svix-id", "svix-timestamp", "svix-signature" })

  // 2. On user.created:
  //    a. Create Telnyx billing group
  //    b. Upsert into agent_settings with service role client (RLS bypassed)
  const supabase = createServiceRoleClient()
  await supabase.from("agent_settings").upsert(
    {
      user_id: userId,          // Clerk user ID (text)
      telnyx_billing_group_id: billingGroup.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
}
```

> **Key:** `createServiceRoleClient()` is the ONLY place where RLS is bypassed.
> It's only used in webhooks where no user session is available.
> All other server code uses `createClerkSupabaseClient()` (RLS enforced).

---

## 8. Feature Gating

### `lib/billing/feature-gate.tsx`

```typescript
"use client"

// Feature key registry
export const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  sms_messaging: "SMS Messaging",
  gmail_integration: "Gmail Integration",
  ai_voice_agents: "AI Voice Agents",
  lead_enrichment: "Lead Enrichment",
  pdf_proposals: "PDF Proposals",
  custom_lead_fields: "Custom Lead Fields",
  all_dashboard_widgets: "Dashboard Customization",
}

// UpgradePrompt — shown when feature is blocked (Pro plan required)
export function UpgradePrompt({ feature, className }: UpgradePromptProps) {
  // Card with Lock icon + link to /pricing
}

// UpgradePromptInline — inline dashed-border variant
export function UpgradePromptInline({ feature, className }: UpgradePromptProps) {
  // ...
}
```

### `lib/billing/use-feature-gate.ts`

```typescript
"use client"

import { useAuth } from "@clerk/nextjs"

/**
 * Client-side feature gate hook.
 *
 * Uses Clerk's `has()` helper with a fail-open pattern:
 * - If `has` is undefined (billing not configured), returns true (allow).
 * - If `has` exists and returns false, returns false (block).
 * - If `has` exists and returns true, returns true (allow).
 */
export function useFeatureGate(feature: string): boolean {
  const { has } = useAuth()
  return has?.({ feature }) ?? true
}
```

> **Server-side gating pattern** (from `app/api/sms/route.ts`):
> ```typescript
> const { userId, has } = await auth()
> if (has && !has({ feature: "sms_messaging" })) {
>   return Response.json({ error: "Pro plan required" }, { status: 403 })
> }
> ```
>
> **Fail-open rule:** When Clerk billing is not configured (`has` is undefined),
> all features are allowed. This prevents lockouts during development/misconfiguration.

---

## 9. Current Migrations

All migration files are in `supabase/migrations/`:

| Filename | Description |
|---|---|
| `20260304_add_knowledge_base_to_ai_agents.sql` | Adds `knowledge_base text` column to `ai_agents` for free-form prompt context |
| `20260304_add_spanish_agent_assistant_id.sql` | Adds `spanish_agent_assistant_id text` to `ai_agents` for Spanish handoff Telnyx assistant |
| `20260305_add_business_hours_column.sql` | Adds `business_hours jsonb` to `agent_business_profile` for weekly availability schedule |
| `20260305_create_agent_business_profile.sql` | Creates `agent_business_profile` table with RLS. ⚠️ Original migration used `auth.uid()` (uuid FK to `auth.users`) — live table has been patched to use `requesting_user_id()` (text). The column type on `agent_id` is `text` in production but the migration defines it as `uuid`. |
| `20260306_add_extraction_and_agent_config_columns.sql` | Adds extraction pipeline columns to `call_logs` (`extracted_data`, `extraction_status`, `extraction_model`, `caller_name`, `caller_phone`, `transcript_data`) and agent config columns to `ai_agents` (`custom_collect_fields`, `spanish_enabled`, `tone_preset`, `call_forward_number`) |
| `20260311_add_selected_carriers.sql` | Adds `selected_carriers jsonb` to `agent_settings` (null = all carriers, array of CompCodes when set) |
| `20260312_add_is_read_to_sms_logs.sql` | Adds `is_read boolean` to `sms_logs` with partial index on `(agent_id, is_read) WHERE is_read = false` |
| `20260313_add_starred_urgent_to_leads.sql` | Adds `starred boolean` and `urgent boolean` flags to `leads` for inbox filtering |

### ⚠️ Migration drift note

The `agent_business_profile` table was created with `agent_id uuid` referencing `auth.users(id)` in the migration,
but the live column is `text` (to match the Clerk user ID format). This means the migration file does not
accurately represent the live schema. Any future migration tooling must account for this drift.

---

## Key Observations for Multi-Tenancy Migration

1. **Ownership key is always a text Clerk user ID** — stored as `agent_id` (most tables) or `user_id` (`agent_settings`). All values look like `user_2xyz...`.

2. **RLS is the primary isolation layer** — `requesting_user_id()` reads `sub` from the JWT. Multi-tenancy would need an additional `org_id` or `team_id` column on every table and corresponding RLS policies.

3. **Indirect ownership (join via leads)** — `quotes`, `call_logs`, `enrichments`, `custom_field_values` don't have a direct `agent_id` column. They're scoped via `lead_id IN (SELECT id FROM leads WHERE agent_id = requesting_user_id())`. Multi-tenancy must extend this join or add direct ownership columns.

4. **Server actions are the mutation choke point** — `lib/actions/leads.ts` handles all lead CRUD. All actions call `requireUser()` which returns `{ id: string }`. Adding org context here would propagate naturally.

5. **Three auth paths to harden for multi-tenancy:**
   - Browser → Clerk JWT → `useClerkSupabase()` or server action
   - Server-to-server → `INTERNAL_API_SECRET` header (bypasses Clerk, no RLS enforcement at API level — relies on being called only by trusted internal services)
   - Webhook → service role client (RLS bypassed entirely — only in `app/api/webhooks/clerk/route.ts`)

6. **Feature gating is Clerk-plan-based** — tied to individual users, not organizations. Multi-tenancy would likely need org-level plan entitlements.

7. **Zustand stores are user-session-scoped** — no org context in any store. They'd need to flush/reinitialize on org switch.

8. **Three RLS inconsistencies** (see Section 2) must be fixed regardless of multi-tenancy.
