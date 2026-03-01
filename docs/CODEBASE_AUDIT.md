# Ensurance Codebase Audit

**Date:** 2026-03-01
**Branch:** `feature/lukas`
**Last Commit:** `57f2204` — fix: read coverage amount and term length from Zustand store on re-quote

---

## Table of Contents

1. [All Routes](#1-all-routes)
2. [All Components](#2-all-components)
3. [All Stores](#3-all-stores)
4. [All Types](#4-all-types)
5. [All Engine Files](#5-all-engine-files)
6. [All Integrations](#6-all-integrations)
7. [Environment Variables](#7-environment-variables)
8. [Database Schema](#8-database-schema)
9. [Middleware & Security](#9-middleware--security)
10. [New Features Since Last Audit](#10-new-features-since-last-audit)
11. [Known Gaps & Tech Debt](#11-known-gaps--tech-debt)
12. [Security Review Summary](#12-security-review-summary)
13. [Build Status](#13-build-status)

---

## 1. All Routes

### Pages (23 routes)

| Route | File | Status | Description |
|-------|------|--------|-------------|
| `/` | `app/page.tsx` | Functional | Marketing landing page (HeroSection, TrustSection, ProductTabSwitcher, FeaturesGrid, CTASection) |
| `/auth/login` | `app/auth/login/page.tsx` | Functional | LoginForm: signInWithPassword, error mapping, redirect param |
| `/auth/register` | `app/auth/register/page.tsx` | Functional | RegisterForm: signUp with name/license metadata, emailRedirectTo |
| `/auth/confirm` | `app/auth/confirm/page.tsx` | Functional | CheckEmailCard: reads email/type from URL params, resend with correct type |
| `/auth/password` | `app/auth/password/page.tsx` | Functional | PasswordResetForm: resetPasswordForEmail, redirect to confirm |
| `/auth/password/reset` | `app/auth/password/reset/page.tsx` | Functional | SetPasswordForm: updateUser for new password, redirect to /leads |
| `/auth/callback` | `app/auth/callback/route.ts` | Functional | Exchange auth code for session, validated redirect (relative paths only) |
| `/dashboard` | `app/dashboard/page.tsx` | Functional | Agent dashboard: stat cards, follow-ups, activity feed, calendar |
| `/leads` | `app/leads/page.tsx` | Functional | Lead CRM: table + Kanban toggle, search, filter, sort, CSV upload, manual add |
| `/leads/[id]` | `app/leads/[id]/page.tsx` | Functional | Lead detail: QuoteWorkspace + CallLogViewer + ActivityTimeline + save/dirty tracking |
| `/pipeline` | `app/pipeline/page.tsx` | Functional | Kanban board pipeline view (6 status columns, drag-and-drop) |
| `/calendar` | `app/calendar/page.tsx` | Functional | Google Calendar integration view |
| `/inbox` | `app/inbox/page.tsx` | Functional | SMS conversation inbox |
| `/quote` | `app/quote/page.tsx` | Functional | Anonymous quick-quote (ephemeral, no lead context) |
| `/agents` | `app/agents/page.tsx` | Functional | AI agent management: "My Agents" card grid + "Usage" dashboard |
| `/agents/[id]` | `app/agents/[id]/page.tsx` | Functional | Agent detail: config form, call history, transcript viewer, delete |
| `/settings` | `app/settings/page.tsx` | Functional | Redirects to `/settings/profile` |
| `/settings/profile` | `app/settings/profile/page.tsx` | Functional | Profile: name, email, license (Supabase user_metadata) |
| `/settings/commissions` | `app/settings/commissions/page.tsx` | Functional | Commission rates: default + per-carrier table (Supabase-synced) |
| `/settings/integrations` | `app/settings/integrations/page.tsx` | Functional | AI Voice Agents link + Coming Soon integrations |
| `/settings/licenses` | `app/settings/licenses/page.tsx` | Functional | Agent license management (state, number, dates, status) |
| `/settings/phone-numbers` | `app/settings/phone-numbers/page.tsx` | Functional | Phone number provisioning + SMS settings |
| `/settings/usage` | `app/settings/usage/page.tsx` | Functional | Usage dashboard (API calls, phone minutes, cost estimation) |
| `/settings/[section]` | `app/settings/[section]/page.tsx` | Placeholder | Dynamic route for remaining sections: "Coming Soon" cards |

### Layouts (7)

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/layout.tsx` | Root: Inter + Geist Mono fonts, Sonner toasts, CallNotificationHandler, IncomingCallBanner, theme init script |
| `/auth/*` | `app/auth/layout.tsx` | Auth wrapper: logo header, centered content (max-w-lg), gradient bg |
| `/leads/*` | `app/leads/layout.tsx` | TopNav + full-height flex |
| `/quote/*` | `app/quote/layout.tsx` | TopNav + full-height flex |
| `/settings/*` | `app/settings/layout.tsx` | TopNav + sidebar (9 nav items) + centered content (max-w-3xl) |
| `/agents/*` | `app/agents/layout.tsx` | TopNav + full-height flex |
| `/dashboard` | `app/dashboard/layout.tsx` | TopNav + dashboard layout |

### API Routes (44 endpoints)

| Endpoint | Method | Auth | Rate Limit | Description |
|----------|--------|------|-----------|-------------|
| `/api/quote` | POST | Session | 10/min | Eligibility + Compulife/mock pricing + match scoring |
| `/api/chat` | POST | Session | 20/min | Streaming AI chat (Vercel AI SDK + GPT-4o-mini) |
| `/api/chat/proactive` | POST | Session | 20/min | Proactive insight cards (2-4 per request) |
| `/api/enrichment` | POST | Session | 5/min | PDL person enrichment (80+ fields) |
| `/api/coaching` | POST | Session | 20/min | Real-time coaching hints (DISC, medications, life events) |
| `/api/call-summary` | POST | Session | 20/min | Post-call 3-sentence AI summary |
| `/api/call-log` | POST | Session | 20/min | Save call log to Supabase + activity log |
| `/api/call-log/[leadId]` | GET | Session | 20/min | Call history for a lead |
| `/api/call-log/counts` | GET | Session | 20/min | Bulk call counts by lead IDs |
| `/api/activity-log` | POST | Session | 20/min | Insert activity log entry |
| `/api/activity-log/[leadId]` | GET | Session | 20/min | Paginated activity feed for a lead |
| `/api/settings` | GET/PUT | Session | 20/min | Agent commission + profile settings |
| `/api/settings/licenses` | GET | Session | 20/min | License information |
| `/api/settings/business` | GET | Session | 20/min | Business settings |
| `/api/settings/usage` | GET | Session | 20/min | Usage metrics (phone, API, costs) |
| `/api/agents` | GET/POST | Session | 20/min | List / create AI agents |
| `/api/agents/[id]` | GET/PUT/DELETE | Session | 20/min | Single agent CRUD + Telnyx sync |
| `/api/agents/[id]/transcripts` | POST | Secret | 20/min | Bulk store transcript messages (internal) |
| `/api/agents/[id]/transcripts/[callId]` | GET | Session | 20/min | Transcript messages for a call |
| `/api/agents/usage` | GET | Session | 20/min | Aggregated usage stats |
| `/api/ai-agent` | GET/POST/DELETE | Session | 20/min | Legacy AI assistant CRUD |
| `/api/ai-agent/toggle` | PUT | Session | 20/min | Enable/disable AI agent |
| `/api/ai-agent/webhook` | POST | Telnyx sig | None | Telnyx AI webhook (ED25519 verified) |
| `/api/telnyx/token` | POST | Session | 20/min | WebRTC JWT token generation |
| `/api/telnyx/credentials` | GET | Session | 20/min | SIP login/password for inbound |
| `/api/auth/google` | GET | Session | — | Google OAuth2 authorization URL |
| `/api/auth/google/callback` | GET | Session | — | OAuth2 code exchange + token storage |
| `/api/auth/google/status` | GET | Session | — | Google Calendar connection status |
| `/api/auth/google/disconnect` | POST | Session | — | Revoke Google OAuth tokens |
| `/api/phone-numbers` | GET/POST | Session | 20/min | List / provision phone numbers |
| `/api/phone-numbers/search` | POST | Session | 20/min | Search available numbers by state/area |
| `/api/phone-numbers/purchase` | POST | Session | 20/min | Purchase phone number from Telnyx |
| `/api/phone-numbers/[id]` | GET/PUT/DELETE | Session | 20/min | Single phone number management |
| `/api/sms` | GET/POST | Session | 20/min | Send SMS / fetch SMS logs |
| `/api/webhooks/sms` | POST | Telnyx sig | None | Inbound SMS webhook |
| `/api/proposal` | POST | Session | 20/min | PDF proposal generation (jsPDF) |
| `/api/inbox/conversations` | GET | Session | 20/min | SMS conversation list |
| `/api/notifications` | GET/POST | Session | 20/min | Derived notifications + mark read |
| `/api/dashboard/stats` | GET | Session | 20/min | Dashboard stat cards |
| `/api/dashboard/calendar` | GET | Session | 20/min | Calendar events |
| `/api/transcribe/stream` | GET | Session | — | SSE for live Deepgram transcription |
| `/api/transcribe/audio` | POST | Session | — | Forward base64 PCM to Deepgram |
| `/api/jobs/retention` | POST | Cron secret | — | Data retention cleanup (daily cron) |
| `/api/jobs/follow-up-reminders` | POST | Cron secret | — | Follow-up digest emails (weekday cron) |

---

## 2. All Components (176 files)

### By Directory

| Directory | Count | Key Components |
|-----------|-------|----------------|
| `components/ui/` | 56 | shadcn/ui library (DO NOT MODIFY) |
| `components/leads/` | 18 | lead-list, lead-detail-client, kanban-board, follow-up-picker, lead-notes, activity-timeline, quote-history, csv-upload, import-preview, column-mapper, add-lead-dialog, date-picker-input |
| `components/landing/` | 15 | Landing page atoms/molecules/organisms (hero, trust, features, CTA, footer) |
| `components/quote/` | 14 | intake-form, carrier-results, carrier-detail-modal, carrier-comparison, ai-assistant-panel, lead-enrichment-popover, email-quote-dialog, medical-history-section |
| `components/calling/` | 14 | call-log-viewer, transcript-modal, transcript-view, transcript-entry, coaching-hint-card, call-mode-header, incoming-call-banner, ring-sound, call-button, active-call-bar, call-notification-handler |
| `components/agents/` | 14 | agents-page-client, agents-list-client, create-agent-dialog, agent-detail-client, transcript-viewer, usage-dashboard |
| `components/settings/` | 13 | profile-settings-client, commission-settings-client, commission-table-row, licenses-settings-client, phone-numbers-settings-client, usage-client, integrations-settings-client, settings-sidebar, settings-page-header, settings-placeholder |
| `components/dashboard/` | 8 | dashboard-client, calendar-view, calendar-week-grid, calendar-day-grid, calendar-event-block, calendar-event-item, calendar-event-popover, add-calendar-event-dialog |
| `components/auth/` | 6 | login-form, register-form, password-reset-form, set-password-form, check-email-card, auth-provider |
| `components/coaching/` | 5 | coaching-card-stack, style-card, medication-card, life-event-card, coaching-tip-card |
| `components/navigation/` | 4 | top-nav, notification-bell, unsaved-changes-guard, back-to-quoter |
| `components/inbox/` | 4 | conversation-list, conversation-thread, contact components |
| `components/calendar/` | 3 | calendar-page-client, event management |
| `components/shared/` | 1 | empty-state (icon, title, description, actions, compact mode) |

---

## 3. All Stores (4 Zustand stores)

| Store | File | Purpose |
|-------|------|---------|
| `useLeadStore` | `lib/store/lead-store.ts` | Current lead + list, CRUD actions |
| `useUIStore` | `lib/store/ui-store.ts` | Panel visibility, view modes, layout state |
| `useCallStore` | `lib/store/call-store.ts` | Active call state, transcript, coaching cards |
| `useCommissionStore` | `lib/store/commission-store.ts` | Default + per-carrier commission rates |

---

## 4. All Types (11 type files)

| File | Key Types |
|------|-----------|
| `lib/types/carrier.ts` | Carrier, Product, TobaccoRules, DUIRule, MedicalCondition, PrescriptionExclusion, NicotineType |
| `lib/types/quote.ts` | QuoteRequest, CarrierQuote, QuoteResponse, PricingRequest, HealthClass |
| `lib/types/lead.ts` | Lead, LeadStatus, MaritalStatus, IncomeRange, LeadQuoteSnapshot |
| `lib/types/ai.ts` | EnrichmentResult, ProactiveInsight, EnrichmentAutoFillData |
| `lib/types/activity.ts` | ActivityLog, ActivityType, detail payload interfaces |
| `lib/types/commission.ts` | CarrierCommission, CommissionSettings, CommissionEstimate |
| `lib/types/coaching.ts` | CoachingCard (discriminated union), CoachingResponseSchema |
| `lib/types/database.ts` | Stricter DB row aliases (LeadRow, ActivityLogRow, etc.) |
| `lib/types/database.generated.ts` | Auto-generated Supabase types (DO NOT EDIT) |
| `lib/types/call.ts` | Call-related types |
| `lib/types/index.ts` | Barrel exports |

---

## 5. All Engine Files (14 files)

| File | Lines | Purpose |
|------|-------|---------|
| `lib/engine/compulife-provider.ts` | ~400 | Compulife API integration + health class mapping + response parsing |
| `lib/engine/eligibility.ts` | ~350 | State/medical/DUI/build chart/Rx eligibility checks |
| `lib/engine/pre-screen.ts` | ~280 | Pre-screening eligibility gates |
| `lib/engine/medication-screening.ts` | ~250 | Rx screening: DECLINE/REVIEW/ACCEPT/GRADED_ELIGIBLE per carrier |
| `lib/engine/match-scoring.ts` | ~80 | Proprietary 0-99 scoring: AM Best, e-sign, nicotine advantage, price rank |
| `lib/engine/tobacco-classification.ts` | ~80 | NicotineType -> smoker/non-smoker per carrier rules |
| `lib/engine/build-chart.ts` | ~60 | BMI calculation + height/weight -> rate class |
| `lib/engine/pricing.ts` | ~30 | PricingProvider interface + PricingRequest/PricingResult types |
| `lib/engine/pricing-config.ts` | ~50 | Provider composition: CompulifeWithMockFallback |
| `lib/engine/mock-pricing.ts` | ~50 | Formula-based mock pricing (fallback) |
| `lib/engine/mock-provider.ts` | ~35 | MockPricingProvider wrapper |
| `lib/engine/commission-calc.ts` | ~20 | Annual premium x rate -> CommissionEstimate |

---

## 6. All Integrations (10 external services)

| Service | Purpose | Files | Status |
|---------|---------|-------|--------|
| **Supabase** | Database + Auth + RLS | `lib/supabase/` (19 modules) | Production |
| **OpenAI** | GPT-4o-mini (chat, proactive, coaching, summaries) | `lib/ai/`, `app/api/chat/`, `app/api/coaching/` | Production |
| **Compulife** | Real carrier pricing (75+ carriers) | `lib/engine/compulife-provider.ts` | Production (IP-locked) |
| **Telnyx** | WebRTC calling + AI Assistants + SMS | `lib/telnyx/` (10 files) | Production |
| **Deepgram** | Live speech-to-text (Nova-3) | `lib/deepgram/` (2 files) | Production |
| **People Data Labs** | Person enrichment (80+ fields) | `app/api/enrichment/route.ts` | Production |
| **Resend** | Transactional email | `lib/email/` (3 files) | Production |
| **Google Calendar** | OAuth2 + event sync | `lib/google/` (2 files) | Production |
| **Upstash Redis** | Distributed rate limiting | `lib/middleware/rate-limiter.ts` | Optional (fails open) |
| **jsPDF** | PDF proposal generation | `lib/pdf/proposal-generator.ts` | Built-in |

---

## 7. Environment Variables (21 total)

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin (server only) | Yes |
| `OPENAI_API_KEY` | GPT-4o-mini for AI features | Yes |
| `INTERNAL_API_SECRET` | Server-to-server auth | Yes |
| `TELNYX_API_KEY` | WebRTC + AI Assistants + SMS | Yes |
| `TELNYX_CALLER_NUMBER` | Default outbound caller ID | Yes |
| `TELNYX_WEBHOOK_PUBLIC_KEY` | ED25519 webhook verification | Production |
| `DEEPGRAM_API_KEY` | Live transcription | Yes |
| `PEOPLEDATALABS_API_KEY` | Person enrichment | Yes |
| `COMPULIFE_AUTH_ID` | Compulife API (IP-locked) | Optional (mock fallback) |
| `RESEND_API_KEY` | Transactional email | Optional |
| `RESEND_FROM` | Sender address override | Optional |
| `GOOGLE_CLIENT_ID` | Google OAuth2 | Optional |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 | Optional |
| `GOOGLE_REDIRECT_URI` | Google callback URL | Optional |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Optional (fails open) |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting | Optional (fails open) |
| `ENCRYPTION_SECRET` | AES-256-GCM for SMS/transcripts | Yes |
| `CRON_SECRET` | Cron job auth | Production |
| `NEXT_PUBLIC_APP_URL` | CSRF origin + webhook URLs | Yes |

---

## 8. Database Schema

### Tables (11+ tables via Supabase)

| Table | Key Fields | RLS | Purpose |
|-------|-----------|-----|---------|
| `leads` | id, user_id, first_name, last_name, age, state, nicotine_type | Yes | CRM lead records |
| `quotes` | id, lead_id, user_id, request, response | Yes | Quote snapshots |
| `enrichments` | id, lead_id, user_id, data | Yes | PDL enrichment results |
| `call_logs` | id, lead_id, agent_id, duration, transcript, summary | Yes | Call recordings + transcripts |
| `activity_logs` | id, lead_id, agent_id, activity_type, title, details | Yes | Activity feed |
| `agent_settings` | id, agent_id, default_commission_rate, custom_rates | Yes | Commission settings |
| `ai_agents` | id, agent_id, name, phone_number, voice, telnyx_ai_id | Yes | AI agent config |
| `ai_agent_calls` | id, agent_id, call_id, transcript, summary | Yes | AI call history |
| `ai_transcripts` | id, call_id, agent_id, messages | Yes | Transcript messages |
| `google_integrations` | id, agent_id, access_token, refresh_token, expires_at | Yes | Google OAuth tokens |
| `lead_notes` | id, lead_id, agent_id, note_text | Yes | Agent notes on leads |
| `agent_licenses` | id, agent_id, license_number, state, dates, status | Yes | License tracking |
| `agent_phone_numbers` | id, agent_id, phone_number, ai_agent_id, is_primary | Yes | Phone provisioning |
| `sms_logs` | id, agent_id, lead_id, direction, body | Yes | SMS message history |

### Data Access Layer (19 modules in `lib/supabase/`)

- **Auth clients**: `auth-server.ts` (session, RLS), `auth-client.ts` (browser), `client.ts` (browser singleton), `server.ts` (service role, webhooks only)
- **Domain modules**: leads, calls, activities, notes, notifications, ai-agents, settings, google-integrations, phone-numbers, sms, inbox, licenses, usage, dashboard, avatar

---

## 9. Middleware & Security

### Root Middleware (`middleware.ts`)
- Supabase session refresh on every request
- Route protection (unauthenticated -> `/auth/login`)
- CSRF validation for all API mutation methods

### Security Middleware (`lib/middleware/`)

| File | Purpose |
|------|---------|
| `auth-guard.ts` | API auth: session cookies OR `INTERNAL_API_SECRET` header |
| `rate-limiter.ts` | Upstash Redis (5 tiers), fail-open when Redis unavailable |
| `csrf.ts` | Origin/Referer validation + custom header fallback |
| `telnyx-webhook-verify.ts` | ED25519 signature verification + replay protection |

### Security Headers (`next.config.ts`)
- Content-Security-Policy (script-src, style-src, connect-src, img-src)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security: max-age=63072000
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(self), geolocation=()

---

## 10. New Features Since Last Audit (2026-02-26)

### Track 1: Quote Engine Intelligence

#### A. Compulife API Integration
- **File**: `lib/engine/compulife-provider.ts` (~400 lines)
- Real carrier pricing via `compulifeapi.com` (75+ carriers per quote)
- IP-locked auth, falls back to mock pricing when unavailable
- `CompulifeWithMockFallback` composite provider in `pricing-config.ts`
- Replaces mock-only pricing for production use

#### B. Health Class Mapping
- **Function**: `mapHealthClass()` in `compulife-provider.ts`
- Maps BMI + tobacco + medical conditions + DUI -> Compulife health class
- Classes: PP (Preferred Plus), P (Preferred), RP (Rated Preferred), R (Standard)
- Conservative default: higher risk = realistic Standard rates (was hardcoded PP)

#### C. Nicotine Type Classification
- **Type**: `NicotineType = "none" | "cigarettes" | "vaping" | "cigars" | "smokeless" | "pouches" | "marijuana" | "nrt"`
- **File**: `lib/engine/tobacco-classification.ts`
- `classifyTobaccoForCarrier()` reads carrier TobaccoRules per nicotine type
- Parallel Compulife calls (smoker + non-smoker) for non-cigarette types
- Key differentiators: Foresters (vaping = non-smoker), JH (cigars), MOO (marijuana = non-tobacco)
- `hasNicotineAdvantage()` awards +12 match score bonus
- `nicotine_type` persisted to leads table (migration applied)

#### D. Prescription/Rx Screening
- **File**: `lib/engine/medication-screening.ts` (~250 lines)
- **Actions**: DECLINE, REVIEW, ACCEPT, GRADED_ELIGIBLE per carrier
- DECLINE sets `isEligible=false` ("Medication exclusion")
- GRADED_ELIGIBLE maps to `rx_graded` warning (amber badge)
- Screens against 7,208 Rx entries across 64 carriers

#### E. Carrier Expansion (38 -> 64)
- **Generation**: `scripts/build-carriers.ts` reads extraction JSONs -> `carriers-generated.ts` (72,751 lines)
- 26 new carriers: aetna, aflac, bankers_fidelity, catholic_financial, christian_fidelity, cica_life, cigna, cvs_accendo, elco, first_guaranty, gpm, kskj, lafayette, liberty_bankers, lincoln_heritage, newbridge, occidental, pioneer_american, royal_arcanum, royal_neighbors, senior_life, sentinel, snl, sons_of_norway, standard_life, trinity
- 15 updated carriers: aig (40->169 conditions), amam, americanhomelife, americo, baltimore, betterlife, foresters, gerber, gtl, illinoismutual, moo, pekin, sbli, transamerica, uhl
- Data volume: 2,326 medical conditions, 7,208 Rx entries, 136 products

#### F. Pricing Disclaimers
- Non-dismissible estimate disclaimer banner above carrier results
- One-liner in carrier detail modal "Pricing" tab

#### G. Pre-screening Engine
- **File**: `lib/engine/pre-screen.ts` (~280 lines)
- Eligibility gates before full quote pipeline

### Track 2: Platform Features (added since last audit)

#### H. Phone Number Provisioning
- Settings page + API routes for Telnyx number search/purchase/management
- `app/api/phone-numbers/` (4 routes), `components/settings/phone-numbers-settings-client.tsx`

#### I. SMS / Inbox
- Send/receive SMS via Telnyx, inbound webhook
- `app/api/sms/`, `app/api/webhooks/sms/`, `app/inbox/`
- Encryption: AES-256-GCM for message storage (`ENCRYPTION_SECRET`)

#### J. License Management
- Agent license CRUD (state, number, dates, status)
- `app/settings/licenses/`, `lib/supabase/licenses.ts`

#### K. Usage Dashboard
- API calls, phone minutes, cost estimation
- `app/settings/usage/`, `lib/supabase/usage.ts`

#### L. PDF Proposals
- jsPDF-based proposal generation
- `app/api/proposal/`, `lib/pdf/proposal-generator.ts`

#### M. Calendar Page
- Dedicated calendar view (separate from dashboard widget)
- `app/calendar/`, `components/calendar/`

---

## 11. Known Gaps & Tech Debt

| # | Item | Severity | Location |
|---|------|----------|----------|
| 1 | Recording consent gate not implemented | P3 | `lib/telnyx/notification-handler.ts:175` |
| 2 | Rate limiting disabled (Upstash Redis not configured) | HIGH | `lib/middleware/rate-limiter.ts` |
| 3 | Compulife IP-locked auth needs fixed-IP proxy for Vercel | MEDIUM | `lib/engine/compulife-provider.ts` |
| 4 | Legacy dashboard routes still present (`/dashboard/profile`, `/dashboard/payment/*`) | LOW | `app/dashboard/` |
| 5 | `carriers-generated.ts` at 72,751 lines increases bundle if not tree-shaken | LOW | `lib/data/carriers-generated.ts` |
| 6 | CSRF exempt paths missing `/api/jobs/*` (cron endpoints) | MEDIUM | `lib/middleware/csrf.ts` |

---

## 12. Security Review Summary (2026-03-01)

### Findings by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 5 |
| MEDIUM | 7 |
| LOW | 5 |

### CRITICAL

1. **Secrets in `.env.local` readable by filesystem tools** — All 10+ production API keys in a single file. While gitignored, any tool/agent with filesystem access can read them. Recommendation: rotate keys, use secrets manager.

2. **Google OAuth state parameter unsigned** — `state` carries userId as plaintext (not HMAC-signed). Attacker knowing victim's UUID could perform token-swap attack. Mitigated by session validation but should be cryptographically signed.

### HIGH

3. **SIP credentials sent to browser** — `/api/telnyx/credentials` returns persistent SIP login/password to client. Required for WebRTC but extractable via DevTools.

4. **Telnyx error body leaked to client** — `/api/sms` forwards raw Telnyx error response to user (may contain internal API details).

5. **Multiple routes leak internal error messages** — 10+ routes use `error.message` in client responses. Affects: phone-numbers, sms, inbox, settings/licenses routes.

6. **GET `/api/sms` lacks UUID validation on leadId** — Query param accepted without format validation (POST handler validates, GET does not).

7. **Rate limiting fails open** — Redis not configured in dev. In production, Redis downtime silently disables all rate limiting. No secondary fallback.

### MEDIUM

8. **CSRF exempt paths incomplete** — `/api/jobs/*` cron endpoints not in exempt list (will get 403 in production).

9. **console.error may log PII** — 30+ routes log full error objects that may contain medical data, phone numbers.

10. **13 transitive dependency vulnerabilities** — minimatch ReDoS (9 high), ajv ReDoS (2 moderate), qs/hono (2 low). All in dev tools/CLI.

11. **Telnyx webhook verification disabled in dev** — `TELNYX_WEBHOOK_PUBLIC_KEY` not set, all webhooks accepted without signature check.

12. **dangerouslySetInnerHTML in layout.tsx** — Static theme init script (low risk, content is hardcoded constant).

13. **CSP allows 'unsafe-inline'** — Required by Next.js/Tailwind but weakens XSS protection.

14. **`.gitignore` incomplete** — Missing `.env.development.local`, `.env.test`, `.env.staging` patterns.

### LOW

15. **Compulife auth ID is shared secret** — Mitigated by IP-locking.

16. **Usage endpoint accepts arbitrary date ranges** — No bounds validation on `since`/`until` params.

17. **Auth callback redirect partially validated** — Blocks absolute URLs but edge cases like `/@attacker` possible.

18. **Google OAuth returnTo minimal validation** — Combined with unsigned state (finding #2).

19. **X-Forwarded-For spoofable** — Reliable on Vercel CDN but not in self-hosted deployments.

### Recommendations (Priority Order)

1. Configure Upstash Redis to enable rate limiting
2. Sign Google OAuth state with HMAC
3. Sanitize all error responses (log server-side, generic message to client)
4. Add `/api/jobs/` to CSRF exempt paths
5. Add UUID validation to GET `/api/sms`
6. Expand `.gitignore` patterns
7. Set up Dependabot for dependency scanning

---

## 13. Build Status

**Date:** 2026-03-01

| Check | Result |
|-------|--------|
| `bunx tsc --noEmit` | PASS (0 errors) |
| `bun run build` | PASS (66 pages, 24.6s compile, 456.7ms static generation) |
| Next.js version | 16.1.6 (Turbopack) |
| Static pages | 66/66 generated |
| Warnings | `middleware` convention deprecated (use `proxy`), multiple lockfiles detected |

### Build Output Routes (66 total)
- 23 page routes
- 44 API routes (including auth callback)
- All routes dynamic (server-rendered on demand)

---

## Size Metrics

| Metric | Value |
|--------|-------|
| Component files | 176 |
| API route files | 44 |
| Page routes | 23 |
| Zustand stores | 4 |
| Supabase modules | 19 |
| Engine modules | 12 |
| Type definition files | 11 |
| Server actions | 4 |
| Middleware files | 4 + 1 root |
| External integrations | 10 |
| Database tables | 14 |
| Carriers | 64 (38 base + 26 generated) |
| Medical conditions | 2,326 |
| Rx entries | 7,208 |
| Products | 136 |
| Largest generated file | `carriers-generated.ts` (72,751 lines) |
| Environment variables | 21 |
