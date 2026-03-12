# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ensurance** is a term life insurance agent command center — quoting, lead management, enrichment, AI voice agents, and SMS in one platform. Agents upload lead lists, enrich prospects with People Data Labs, get instant carrier quotes with underwriting intelligence, manage a full CRM pipeline, and handle inbound calls via Telnyx AI voice agents.

**Not just a quoting tool** — the competitive moat is the carrier intelligence layer (tobacco rules, medical conditions, DUI policies, state availability) that no other platform surfaces to agents.

## Technology Stack

- **Framework**: Next.js 16.1.6 with App Router
- **Language**: TypeScript 5 (strict mode enabled)
- **Styling**: Tailwind CSS v4 with OKLCH color space
- **UI Components**: shadcn/ui (New York style, 56 components installed)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Charts**: Recharts 2.15
- **Toast**: Sonner 2.0
- **Runtime**: Bun (package manager)

- **Auth**: Clerk (`@clerk/nextjs` v7) — hosted auth UI, JWKS-based JWT for Supabase RLS
- **Database**: Supabase (PostgreSQL with RLS on all 14 tables)
- **State Management**: Zustand (lead store, UI store, commission store, call store)
- **AI**: Vercel AI SDK + OpenAI GPT-4o-mini (streaming chat + proactive insights)
- **Voice**: Telnyx AI Assistants (inbound voice agents) + Telnyx WebRTC (outbound calling)
- **Transcription**: Deepgram Nova-3 (@deepgram/sdk, live streaming via SSE+POST proxy)
- **SMS**: Telnyx SMS API (inbound/outbound, webhook-driven)
- **Enrichment**: People Data Labs API (80+ field person enrichment)
- **Email**: Resend SDK (transactional emails — quote summaries, reminders)
- **PDF**: jsPDF + jspdf-autotable (proposal generation)
- **Calendar**: Google Calendar API (googleapis) — OAuth2 token storage, event sync
- **Rate Limiting**: Upstash Redis (@upstash/redis + @upstash/ratelimit) — distributed, 5 tiers
- **CSV Parsing**: PapaParse
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable (Kanban board)
- **Webhook Verification**: Svix (Clerk webhook signature verification)
- **Date Utilities**: date-fns (calendar display, relative timestamps)

## Development Commands

```bash
# Development server
bun dev                    # Start dev server at http://localhost:3000

# Build and production
bun run build             # Production build
bun start                 # Start production server

# Code quality
bun run lint              # Run ESLint
bunx tsc --noEmit         # Type check (run after every change)

# shadcn/ui component management
npx shadcn@latest add <component>    # Add new component

# Supabase
bunx supabase link                     # Link to Supabase project
bunx supabase db push                  # Apply migrations
bunx supabase migration new <name>     # Create new migration
SUPABASE_ACCESS_TOKEN=<token> bunx supabase gen types typescript --project-id orrppddoiumpwdqbavip  # Regenerate types
```

## Project Architecture

### Directory Structure

```
/
├── app/                          # Next.js App Router
│   ├── auth/                     # Authentication (Clerk catch-all routes)
│   │   ├── layout.tsx            # Auth page layout (branding, decorative blurs)
│   │   ├── login/[[...sign-in]]/page.tsx   # Clerk <SignIn /> component
│   │   └── register/[[...sign-up]]/page.tsx # Clerk <SignUp /> component
│   ├── quote/                    # Quick quote engine
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── leads/                    # Lead CRM (list + detail)
│   ├── pipeline/                 # Kanban pipeline view
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── inbox/                    # SMS conversations
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── dashboard/page.tsx        # Dashboard: stats, follow-ups, activity feed
│   ├── calendar/page.tsx         # Full calendar view
│   ├── history/page.tsx          # Call/activity history
│   ├── tools/page.tsx            # Agent tools
│   ├── assistant/                # Underwriting Assistant
│   │   └── page.tsx              # Full-screen AI chat page
│   ├── agents/                   # AI Agent management
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Tabbed: My Agents (card grid) + Usage dashboard
│   │   ├── [id]/page.tsx         # Agent detail: config, call history, transcripts
│   │   ├── setup/page.tsx        # Agent setup wizard
│   │   ├── personality/page.tsx  # Agent personality config
│   │   └── collect/page.tsx      # Agent data collection fields
│   ├── settings/                 # Agent settings (sidebar + content)
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Redirects to /settings/profile
│   │   ├── profile/page.tsx
│   │   ├── commissions/page.tsx
│   │   ├── carriers/page.tsx     # My Carriers: agent carrier selection + COMPINC filtering
│   │   ├── integrations/page.tsx
│   │   └── [section]/page.tsx    # Dynamic placeholder for "Coming Soon" sections
│   ├── api/
│   │   ├── quote/route.ts        # POST — eligibility + pricing + scoring
│   │   ├── chat/route.ts         # POST — streaming AI chat (GPT-4o-mini)
│   │   ├── chat/proactive/route.ts # POST — proactive insight cards
│   │   ├── enrichment/route.ts   # POST — PDL person enrichment
│   │   ├── proposal/route.ts     # POST — PDF proposal generation
│   │   ├── assistant/chat/route.ts # POST — streaming underwriting assistant (GPT-4o-mini)
│   │   ├── coaching/route.ts     # POST — real-time AI coaching hints
│   │   ├── call-summary/route.ts # POST — AI call summary
│   │   ├── call-log/             # Call log CRUD
│   │   ├── activity-log/         # Activity log CRUD
│   │   ├── sms/route.ts          # POST — send SMS
│   │   ├── agents/               # AI agent CRUD + calls + transcripts
│   │   │   ├── route.ts          # GET/POST — multi-agent CRUD
│   │   │   ├── [id]/route.ts     # GET/PUT/DELETE — single agent + Telnyx sync
│   │   │   ├── [id]/calls/       # Call history + detail
│   │   │   ├── [id]/transcripts/ # Transcript storage + retrieval
│   │   │   ├── usage/route.ts    # GET — aggregated usage stats
│   │   │   ├── call-complete/route.ts   # POST — call completion webhook
│   │   │   ├── intake-webhook/route.ts  # POST — inbound call intake webhook
│   │   │   └── scrape-preview/route.ts  # POST — business website scraping
│   │   ├── ai-agent/             # Legacy Phase 7 AI assistant routes
│   │   │   ├── route.ts          # GET/POST/DELETE
│   │   │   ├── toggle/route.ts   # PUT — enable/disable
│   │   │   └── webhook/route.ts  # POST — Telnyx AI webhook
│   │   ├── settings/             # Agent settings
│   │   │   ├── route.ts          # GET/PUT — commission settings
│   │   │   ├── carriers/route.ts          # GET/PUT — agent carrier selection (COMPINC filtering)
│   │   │   ├── billing-group/route.ts     # GET — Telnyx billing group status + fallback creation
│   │   │   ├── business-profile/route.ts  # Business profile CRUD
│   │   │   ├── business/route.ts          # Business info
│   │   │   ├── licenses/route.ts          # License management
│   │   │   └── usage/route.ts             # Usage metrics
│   │   ├── phone-numbers/        # Phone number management
│   │   │   ├── route.ts          # GET — list numbers
│   │   │   ├── [id]/route.ts     # PUT/DELETE — manage number
│   │   │   ├── purchase/route.ts # POST — buy number
│   │   │   └── search/route.ts   # GET — search available numbers
│   │   ├── inbox/conversations/route.ts   # GET — SMS conversations
│   │   ├── webhooks/clerk/route.ts         # POST — Clerk user.created webhook (Svix verification)
│   │   ├── webhooks/sms/route.ts          # POST — inbound SMS webhook
│   │   ├── telnyx/               # Telnyx credentials + token
│   │   │   ├── credentials/route.ts
│   │   │   └── token/route.ts
│   │   ├── notifications/route.ts  # GET/POST — derived notifications
│   │   ├── dashboard/             # Dashboard data
│   │   ├── auth/google/           # Google OAuth flow (4 routes)
│   │   ├── jobs/                  # Cron endpoints (retention, follow-up reminders)
│   │   └── transcribe/            # Deepgram live transcription (SSE + audio)
│   ├── layout.tsx                # Root layout (Inter + Geist Mono + ClerkProvider)
│   └── page.tsx                  # Marketing landing page
│
├── components/
│   ├── ui/                       # shadcn/ui (56 components — DO NOT MODIFY)
│   ├── quote/                    # Quote engine components
│   │   ├── intake-form.tsx       # Left column: client info intake (BirthDateInput replaces AgeInput)
│   │   ├── carrier-results.tsx   # Center column: Best Matches + All Carriers
│   │   ├── carrier-detail-modal.tsx  # Three-tab dialog: Overview, Underwriting, Carrier Info
│   │   ├── carrier-comparison.tsx    # Side-by-side comparison sheet
│   │   ├── ai-assistant-panel.tsx    # Right column: streaming chat + proactive insights
│   │   ├── lead-enrichment-popover.tsx # PDL lookup + auto-fill
│   │   ├── email-quote-dialog.tsx    # Email quote summary dialog
│   │   ├── proposal-dialog.tsx       # PDF proposal generation dialog
│   │   ├── share-quote-dialog.tsx    # Share quote dialog
│   │   ├── quote-workspace.tsx       # Main quote workspace layout
│   │   ├── contact-info-card.tsx     # Contact info display
│   │   ├── carrier-logo.tsx          # Carrier logo component
│   │   ├── call-insights-view.tsx    # Call insights panel
│   │   └── medical-history-section.tsx # Conditions combobox, medications, DUI toggle
│   ├── navigation/               # Navigation components
│   │   ├── top-nav.tsx           # Top navigation bar (Clerk signOut)
│   │   ├── notification-bell.tsx # Notification bell + slide-out panel
│   │   ├── unsaved-changes-guard.tsx
│   │   └── back-to-quoter.tsx
│   ├── dashboard/                # Dashboard page components (stat cards, calendar views)
│   ├── leads/                    # Lead management (list, detail, kanban, notes, follow-ups, CSV)
│   ├── calling/                  # Call lifecycle (WebRTC, transcription, coaching)
│   ├── inbox/                    # SMS inbox (conversation list, thread, contact)
│   ├── agents/                   # AI Agent management
│   │   ├── agents-page-client.tsx     # Tabbed page wrapper
│   │   ├── agents-list-client.tsx     # Agent card grid
│   │   ├── create-agent-wizard.tsx    # Multi-step agent creation wizard
│   │   ├── wizard-steps/              # Wizard step components (business, collection, personality, purpose, review)
│   │   ├── agent-detail-client.tsx    # Agent config + call history
│   │   ├── call-detail-panel.tsx      # Expandable call detail UI
│   │   ├── call-logs-list.tsx         # Call history list
│   │   ├── transcript-viewer.tsx      # Chat-style transcript viewer
│   │   ├── usage-dashboard.tsx        # Usage stats + cost estimation
│   │   ├── business-hours-editor.tsx  # Business hours config
│   │   ├── faq-editor.tsx             # FAQ management
│   │   └── edit-step-nav.tsx          # Step navigation for editing
│   ├── settings/                 # Agent settings
│   │   ├── profile-settings-client.tsx     # Profile form (Clerk user metadata)
│   │   ├── commission-settings-client.tsx  # Per-carrier commission table
│   │   ├── licenses-settings-client.tsx    # License management
│   │   ├── phone-numbers-settings-client.tsx # Phone number management
│   │   ├── business-info-client.tsx        # Business info form
│   │   ├── business-profile-section.tsx    # Business profile section
│   │   ├── billing-group-card.tsx           # Telnyx billing group status card
│   │   ├── google-calendar-card.tsx        # Google Calendar integration card
│   │   ├── usage-client.tsx                # Usage metrics display
│   │   ├── carriers-settings-client.tsx     # My Carriers: 115 carriers, search, toggles, auto-save
│   │   └── security-settings-section.tsx   # Security settings
│   ├── assistant/                # Underwriting Assistant chat UI
│   │   ├── chat-interface.tsx    # Full-screen chat: message list, input, suggested questions
│   │   ├── chat-message.tsx      # Message bubbles with role avatars + source indicators
│   │   └── suggested-questions.tsx # Clickable starter question chips
│   ├── coaching/                 # Real-time coaching cards (DISC, medication, life-event)
│   ├── history/                  # Call/activity history view
│   ├── calendar/                 # Full calendar view components
│   ├── landing/                  # Marketing page components
│   └── shared/                   # Shared reusable components (empty-state)
│
├── lib/
│   ├── types/                    # TypeScript type definitions
│   │   ├── carrier.ts, quote.ts, lead.ts, ai.ts, activity.ts
│   │   ├── commission.ts, coaching.ts
│   │   ├── database.ts           # Stricter DB row aliases
│   │   ├── database.generated.ts # Auto-generated Supabase types (DO NOT EDIT)
│   │   └── index.ts
│   ├── data/                     # Static data (carriers, pipeline, medications, conditions, build charts, compulife-companies, proddis-filters)
│   ├── engine/                   # Quote engine (pricing, eligibility, scoring, commission calc, SI/FUW filtering)
│   ├── ai/                       # AI prompts (system prompt, coaching context, call coach)
│   ├── store/                    # Zustand stores
│   │   ├── lead-store.ts         # Lead data + CRUD actions
│   │   ├── ui-store.ts           # Panel visibility, view modes
│   │   ├── commission-store.ts   # Commission rate management
│   │   └── call-store.ts         # Active call state
│   ├── supabase/                 # Database access layer
│   │   ├── clerk-client.ts       # Server-side Supabase client via Clerk JWT (respects RLS)
│   │   ├── clerk-client-browser.ts # Browser-side Supabase hook with Clerk token injection
│   │   ├── server.ts             # Service role client (bypasses RLS — webhooks only)
│   │   ├── leads.ts              # Lead CRUD
│   │   ├── calls.ts              # Call log CRUD
│   │   ├── activities.ts         # Activity log
│   │   ├── notes.ts              # Lead notes CRUD
│   │   ├── notifications.ts      # Derived notifications
│   │   ├── dashboard.ts          # Dashboard stats
│   │   ├── settings.ts           # Agent settings
│   │   ├── ai-agents.ts          # AI agent CRUD + transcripts + usage
│   │   ├── usage.ts              # Usage metrics
│   │   ├── inbox.ts              # SMS conversations
│   │   ├── sms.ts                # SMS log operations
│   │   ├── phone-numbers.ts      # Phone number management
│   │   ├── licenses.ts           # License management
│   │   ├── business-profile.ts   # Business profile CRUD
│   │   ├── avatar.ts             # Avatar management
│   │   └── google-integrations.ts # Google OAuth token CRUD
│   ├── actions/                  # Server actions (leads, notes, send-quote-email, log-activity)
│   ├── voice/                    # AI voice agent utilities
│   │   ├── ensurance-prompt-compiler.ts  # Insurance intake voice prompt builder
│   │   ├── openai-extraction.ts          # Call data extraction
│   │   └── spanish-agent.service.ts      # Spanish language agent support
│   ├── assistant/                # Underwriting Assistant AI
│   │   ├── build-context.ts     # Exhaustive carrier context compiler (tobacco matrix, medical, DUI, Rx, rate classes)
│   │   └── tools.ts             # get_quote tool — Compulife pricing with source attribution
│   ├── agents/                   # Agent prompt building
│   │   └── prompt-builder.ts
│   ├── telnyx/                   # Telnyx integration (WebRTC, AI Assistants, billing, audio capture)
│   ├── google/                   # Google OAuth + Calendar service
│   ├── email/                    # Resend SDK + email templates
│   ├── sms/                      # SMS sending utilities
│   │   └── send.ts
│   ├── pdf/                      # PDF generation
│   │   └── proposal-generator.ts
│   ├── deepgram/                 # Deepgram transcription (sessions, streaming)
│   ├── coaching/                 # Coaching prompt builder
│   ├── encryption/               # Field encryption utilities
│   │   ├── field-encryption.ts
│   │   └── crypto.ts
│   ├── middleware/               # API middleware
│   │   ├── auth-guard.ts         # API auth: shared secret OR Clerk session
│   │   ├── rate-limiter.ts       # Upstash Redis rate limiter (5 tiers, fail-open)
│   │   ├── csrf.ts               # CSRF protection: Origin/Referer validation
│   │   └── telnyx-webhook-verify.ts # ED25519 webhook signature verification
│   ├── jobs/                     # Cron job handlers (retention, follow-up reminders)
│   ├── utils/                    # Utilities (CSV parser, quote summary, date helpers)
│   └── utils.ts                  # cn() helper
│
├── hooks/
│   ├── use-mobile.ts             # useIsMobile() hook
│   ├── use-coaching-interval.ts  # 30s coaching hint interval during active calls
│   └── use-business-profile.ts   # Business profile data hook
│
├── styles/
│   └── globals.css               # Tailwind v4 theme (DO NOT MODIFY)
│
├── middleware.ts                  # Clerk middleware: auth protection + CSRF validation
├── CLAUDE.md                     # <-- THIS FILE
├── GLOBAL_RULES.md               # Design system rules (read before UI changes)
├── PROJECT_SCOPE.md              # Project phases, goals, risks
├── docs/                         # Reference documentation
│   ├── COMPULIFE_API.md          # Compulife API reference (consolidated from 3 files 2026-03-11)
│   ├── COMPULIFE_EXPLORATION_RESULTS.md # API exploration results (HA, build charts, DUI, PRODDIS)
│   ├── DATA_REFERENCE.md         # Carrier data breakdown
│   ├── FINAL_EXPENSE.md          # Final Expense product docs
│   ├── PRODUCT_FEATURES.md       # Product feature specs
│   ├── PHASE_HISTORY.md          # Completed phase details
│   ├── SECURITY_MEASURES.md      # Security implementation docs
│   ├── CODEBASE_AUDIT.md         # Codebase audit findings
│   └── email-setup.md            # Resend SMTP setup guide
├── compulife-proxy/              # Railway proxy for Compulife API (fixed outbound IP)
├── supabase/                     # Supabase migrations and config
└── TASKS/                        # Task specs (CK-01–CK-07, BG-01–BG-03, UA-00–UA-03)
```

### Key Architectural Decisions

1. **App Router Over Pages Router**: All routes use Next.js App Router (app/ directory)
2. **shadcn/ui Philosophy**: Components copied into project, allowing full customization
3. **Tailwind CSS v4**: @theme inline syntax with OKLCH color space
4. **Path Aliases**: `@/*` maps to root, configured in tsconfig.json
5. **Quote Logic is Deterministic**: No AI/ML for premium calculations — if/else blocks and database lookups only. Legal liability requires this.
6. **Lead as First-Class Entity**: All data (enrichment, quotes, calls) attaches to a Lead record. The Lead type composes existing types.
7. **Zustand for State**: Four stores: LeadStore (data), UIStore (panels/views), CommissionStore (rates), CallStore (active call). Replaces scattered useState.
8. **Clerk + Supabase Integration**: Auth handled by Clerk (hosted UI, session management). Supabase used for data only — Clerk JWT passed to Supabase via `createClerkSupabaseClient()` for RLS enforcement. Service role client (`createServiceRoleClient`) only in webhook handlers where no user session exists. All server actions use `requireClerkUser()` for auth.
9. **Dual Entry Points**: `/leads/[id]` for lead-centric workflow (persistent), `/quote` for quick anonymous quoting (ephemeral).
10. **Agent Controls the Flow**: No auto-quoting, no auto-calling. Enrichment auto-fills, agent reviews and triggers.

## Authentication (Clerk)

### How Auth Works

```
Browser Request
    ↓
middleware.ts (clerkMiddleware)
    ↓
  ├── Public route (/auth/*, /api/jobs/*, /api/ai-agent/*, /api/webhooks/*)? → Allow
  └── Private route → auth.protect() checks Clerk session
                        ↓
                     No session → Redirect to /auth/login (Clerk <SignIn />)
                        ↓
                     Valid session → Allow through

API Request
    ↓
requireAuth(request) in auth-guard.ts
    ├── X-API-Secret header matches INTERNAL_API_SECRET → Allow (server-to-server)
    └── Clerk session via auth() → Allow
         ↓
      No auth method → 401 Unauthorized
```

### Server-Side Auth Pattern (API routes)

```typescript
import { auth } from "@clerk/nextjs/server"
import { createClerkSupabaseClient } from "@/lib/supabase/clerk-client"

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await createClerkSupabaseClient()  // JWT auto-attached, RLS enforced
  const { data } = await supabase.from("leads").select("*").eq("agent_id", userId)
}
```

### Server Actions Auth Pattern

```typescript
import { requireClerkUser as requireUser } from "@/lib/supabase/clerk-client"

export async function fetchLeads() {
  const user = await requireUser()  // throws "Unauthorized" if no session
  const leads = await dbGetLeads(user.id)
}
```

### Browser-Side Auth Pattern

```typescript
import { useUser } from "@clerk/nextjs"              // User data
import { useClerkSupabase } from "@/lib/supabase/clerk-client-browser"  // DB access

const { user } = useUser()
const supabase = useClerkSupabase()  // Auto-injects fresh Clerk JWT per request
```

### Clerk-Supabase Bridge

- **Server**: `createClerkSupabaseClient()` — calls `auth().getToken()` (no template — uses native JWKS), creates Supabase client with `Authorization: Bearer <clerk_jwt>`
- **Browser**: `useClerkSupabase()` hook — wraps Supabase client with custom `fetch` that calls `getToken()` per request
- **RLS**: `auth.uid()` in Supabase policies resolves the Clerk user ID from the JWT `sub` claim
- **No JWT template needed** — Clerk's native Supabase integration uses JWKS verification

## Quote Engine

### Pipeline
```
IntakeForm → QuoteRequest → POST /api/quote → For each carrier:
  1. checkEligibility(carrier, age, state, coverage, term, dui)
  2. calculatePremium(carrier, age, gender, coverage, term, tobacco)
  3. calculateMatchScore(carrier, medical, tobacco, priceRank)
→ QuoteResponse { eligible: CarrierQuote[], ineligible: [] }
```

### Carrier Intelligence (38 carriers — 14 with structured intelligence data)

**Fully enriched carriers** (structured medical conditions, Rx exclusions, combination declines, living benefits detail, rate class criteria):

| ID | Carrier | AM Best | Key Differentiator |
|---|---|---|---|
| amam | American Amicable | A- | Most data-rich: 105 conditions, 379 Rx exclusions, 22 combo declines |
| foresters | Foresters Financial | A | Vaping = non-smoker rates (only carrier) |
| moo | Mutual of Omaha | A+ | Strong brand, 119 Rx exclusions, 7 combo declines |
| sbli | SBLI | A | All states, 6 rate classes, digital-first |
| transamerica | Transamerica | A | Unique DUI flat-extra schedule, 52 medical conditions |
| americo | Americo | A | DocuSign only, Eagle Premier telesales |
| uhl | United Home Life | A- | DLX product uniquely accepts DUI |
| aig | AIG / American General | A | 40 medical conditions, rate class criteria |
| americanhomelife | American Home Life | NR | 80 conditions, 59 Rx exclusions, 16 combo declines |
| baltimore | Baltimore Life | B++ | 46 medical conditions |
| betterlife | BetterLife | NR | 56 conditions, rate class criteria |
| gtl | Guarantee Trust Life | A | 32 conditions, rate class criteria |
| illinoismutual | Illinois Mutual | A- | 90 conditions, rate class criteria |
| pekin | Pekin Life | A- | 83 conditions, 8 combo declines, rate class criteria |

**Basic carriers** (products, state availability, tobacco, DUI — no structured intelligence):
jh, lga, nlg, fg, protective, corebridge, lincoln, prudential, nationwide, pacific, principal, northamerican, securian, globalatlantic, massmutual, newyorklife, pennmutual, symetra, brighthouse, gerber, colonialpenn, globelife, anico, kemper

See `docs/DATA_REFERENCE.md` for full carrier data breakdown.

### Pricing
**Compulife cloud API** (`compulifeapi.com`) for real carrier pricing — returns 75+ carriers per quote. Auth ID is IP-locked; works for local dev. For production (Vercel, dynamic IPs), requests route through a **Railway proxy** (`compulife-proxy/`) with a fixed outbound IP — set `COMPULIFE_PROXY_URL` + `COMPULIFE_PROXY_SECRET`. Either `COMPULIFE_AUTH_ID` or `COMPULIFE_PROXY_URL` must be set — no mock/fallback pricing exists (mock-provider.ts and mock-pricing.ts were deleted 2026-03-11). If Compulife is unreachable, the quote returns a 503 "Pricing service unavailable" error. The `PricingProvider` interface in `lib/engine/pricing.ts` is implemented solely by `CompulifePricingProvider` in `compulife-provider.ts`; `pricing-config.ts` throws on startup if neither env var is set.

**Health Analyzer (HA)**: Compulife's built-in underwriting engine. Enabled via `DoHealthAnalysis=ON`, `DoHeightWeight=ON` toggles. HA evaluates build chart, DUI, tobacco, and medical conditions to determine rate class. Toggle values are `ON`/`OFF` (not `Y`/`N`).

**Underwriting Type Filtering (SI/FUW)**: Toggle between Simplified Issue, Fully Underwritten, or All products. SI filtering uses a post-response allowlist of 170 known SI products (`lib/data/proddis-filters.ts`). FUW filtering uses Compulife's `PRODDIS` parameter to exclude SI product codes. Product classification data covers 1,871 products across 115 carriers.

**My Carriers (COMPINC)**: Agents select their appointed carriers on `/settings/carriers`. Selected carriers are stored as `selected_carriers` jsonb in `agent_settings` (null = all). The quote route reads the agent's filter via `getSelectedCarriers(userId)` and passes a `companyInclude` string to Compulife's `COMPINC` parameter, so only appointed carriers appear in results. Degrades gracefully if settings read fails.

**Birthdate Input**: The intake form collects exact month/day/year via `BirthDateInput` (3 Select dropdowns) instead of an integer age spinner. `birthMonth`, `birthDay`, `birthYear` fields on `QuoteRequest` and `PricingRequest` pass directly to Compulife so each carrier's age calculation method (nearest birthday vs. last birthday) applies correctly. Shared date utilities in `lib/utils/date.ts`. Falls back to `ageToBirthDate()` for assistant tool calls (age-only).

### Final Expense (Category Y)
Dedicated FE tab in the quote engine with its own UI: $5K-$50K coverage slider, no term duration/toggles, results grouped by product type (Level/Graded/Guaranteed Issue) with colored filter chips. Compulife category Y returns ~35 real FE products. FE type classification from Compulife product names. Compulife product names (e.g., "Living Promise Whole Life Insurance") are displayed via `compulifeProductName` field on `CarrierQuote`. 16 of 35 FE carriers are mapped to our CARRIERS array.

### Match Scoring
Proprietary 0-99 scale. Factors: AM Best rating, e-sign capability, vape-friendly bonus, price rank, medical condition acceptance, state eligibility.

## AI Assistant Panel (Quote Page)

- **Streaming chat** via Vercel AI SDK → OpenAI GPT-4o-mini
- **System prompt** includes carrier intelligence + client profile + quote results
- **Proactive insights**: auto-generated cards when intake/quotes change (2s debounce)
- **Enrichment trigger**: PDL lookup from the panel header

## Underwriting Assistant (`/assistant`)

Standalone full-screen AI chat for underwriting questions, independent of the quote page.

- **Streaming chat** via Vercel AI SDK → OpenAI GPT-4o-mini (temperature 0)
- **Exhaustive carrier context**: `lib/assistant/build-context.ts` compiles tobacco matrix, medical conditions, DUI rules, Rx screening, rate class criteria, state availability, living benefits, operational info for all 38 carriers into the system prompt
- **Tool calling**: `get_quote` tool fetches real Compulife pricing, returns formatted table with source attribution (`[Live Compulife pricing]`)
- **Grounding rules**: closed-set responses only — LLM can only cite data present in the context, never hallucinate carrier policies
- **Source indicators**: messages tagged with data source (Carrier guides / Live pricing)
- **Suggested questions**: 5 starter chips for common agent scenarios
- **Error handling**: retry button on failures, tool-running indicator during pricing lookups

## PDL Enrichment

- 80+ fields across 10 categories (identity, location, employment, income, career, education, skills, contact, social, metadata)
- Agent-reviewed auto-fill: enrichment results show in dialog with per-field checkboxes (overwrite warnings for fields with existing values)
- Expanded auto-fill targets: firstName, lastName, age, gender, state, dateOfBirth, address, city, zipCode, maritalStatus, occupation, incomeRange
- Age estimation fallback if birth_year gated on PDL free tier

## AI Voice Agents (Telnyx)

- **Inbound call handling**: Telnyx AI Assistants answer calls, run insurance intake conversations
- **Multi-agent support**: Each agent has its own phone number, voice, personality, collection fields
- **Transcript storage**: Full call transcripts saved to `ai_transcripts` table
- **Data extraction**: OpenAI extracts structured lead data from transcripts → auto-creates CRM leads
- **Call forwarding**: Transfer tool enables live handoff to insurance agent's phone
- **Spanish support**: Dedicated Spanish-language agent configuration
- **Business hours**: Configurable availability windows per agent
- **Prompt compilation**: `lib/voice/ensurance-prompt-compiler.ts` builds dynamic prompts from agent config

## Telnyx Billing Groups

Per-agent cost tracking via Telnyx billing groups. Auto-provisioned on signup, with fallback creation from settings.

- **Clerk webhook** (`/api/webhooks/clerk`): on `user.created`, creates a Telnyx billing group and stores ID in `agent_settings`
- **Webhook verification**: Svix signature verification (Standard Webhooks spec)
- **Fallback API** (`/api/settings/billing-group`): checks status, auto-creates if webhook failed or group was deleted on Telnyx
- **Settings UI**: `BillingGroupCard` on Settings → Integrations shows Active/Not Provisioned badge with retry
- **API client**: `lib/telnyx/billing.ts` — CRUD wrapper for Telnyx billing groups API

## SMS (Telnyx)

- **Inbound/outbound SMS** via Telnyx API
- **Conversation threading**: Messages grouped by phone number in inbox view
- **Webhook-driven**: Inbound SMS received via `/api/webhooks/sms` webhook
- **Lead association**: SMS conversations linked to leads via phone number matching

## Email Features

Two email features powered by Resend SDK (`lib/email/resend.ts`):

### Quote Summary Email (agent-triggered)
Agent clicks "Email Quote" → `EmailQuoteDialog` → server action `sendQuoteEmail()` builds branded HTML → sends via Resend → logs activity. Template shows top 3 carriers with monthly premium, AM Best rating, and key feature. Excludes PII.

### Follow-up Reminder Email (cron-triggered)
Vercel cron at 7am/11am/3pm UTC on weekdays → queries leads with overdue/upcoming follow-ups → groups by agent → sends digest email with urgency badges.

## Environment Variables

```bash
# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=   # Clerk publishable key (client-side)
CLERK_SECRET_KEY=                     # Clerk secret key (server-side only)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/register
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/quote   # Post-login redirect
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/quote   # Post-signup redirect
CLERK_WEBHOOK_SECRET=                    # Svix signing secret (Clerk Dashboard → Webhooks)

# Database (Supabase — data only, auth handled by Clerk)
NEXT_PUBLIC_SUPABASE_URL=            # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=           # Supabase service key (server-side, webhooks only)

# AI & Enrichment
OPENAI_API_KEY=                      # GPT-4o-mini for AI chat + proactive insights
PEOPLEDATALABS_API_KEY=              # PDL person enrichment

# Telephony (Telnyx)
TELNYX_API_KEY=                      # Shared: WebRTC calling + AI Assistants API
TELNYX_WEBHOOK_PUBLIC_KEY=           # ED25519 public key for webhook signature verification

# Transcription
DEEPGRAM_API_KEY=                    # Deepgram Nova-3 live transcription

# Email
RESEND_API_KEY=                      # Resend API key (optional)
RESEND_FROM=                         # Sender address override (optional)

# Security & Infrastructure
INTERNAL_API_SECRET=                 # Shared secret for server-to-server API auth
NEXT_PUBLIC_APP_URL=                 # Public URL for webhooks + CSRF origin validation
UPSTASH_REDIS_REST_URL=              # Rate limiting (optional — falls back to allow-all)
UPSTASH_REDIS_REST_TOKEN=            # Rate limiting token (optional)
CRON_SECRET=                         # Shared secret for cron job endpoints

# Google Calendar (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Compulife Pricing (REQUIRED — no fallback)
COMPULIFE_AUTH_ID=                   # IP-locked authorization ID (local dev)
COMPULIFE_PROXY_URL=                 # Railway proxy URL for production
COMPULIFE_PROXY_SECRET=              # Proxy auth secret
```

## Database

**14 tables** with RLS on all:
- `leads` — Lead records (agent-scoped)
- `enrichments` — PDL enrichment results
- `quotes` — Quote snapshots
- `call_logs` — Call history
- `lead_notes` — Agent notes on leads
- `activity_logs` — Activity timeline entries
- `agent_settings` — Per-agent configuration + commission rates
- `agent_licenses` — Insurance license management
- `agent_phone_numbers` — Telnyx phone number assignments
- `ai_agents` — AI voice agent configurations
- `ai_agent_calls` — AI agent call records
- `ai_transcripts` — Call transcript messages
- `sms_logs` — SMS message history
- `google_integrations` — Google OAuth tokens

## Completed Phases

Phases 1-12 + feature modules (BG, UA) are complete. For detailed records, see `docs/PHASE_HISTORY.md`.

| Phase | Name | Tasks |
|-------|------|-------|
| 1 | Lead CRM Foundation | 8 — Supabase schema, lead CRUD, CSV upload, list/detail views |
| 2 | Quote Engine + Intelligence | 8 — Eligibility, mock pricing, match scoring, 38 carriers, AI chat |
| 3 | Telnyx Calling + Transcription | 10 — WebRTC calling, Deepgram transcription, coaching hints |
| 4 | Supabase Auth + User Scoping | 4 — Cookie-based auth, RLS, user-scoped data |
| 5 | UI Polish + Settings | 8 — Panel affordances, settings pages, commission management |
| 6 | Lead Data Expansion + CRM | 8 — 13 new fields, status pipeline, follow-ups, activity timeline |
| 7 | Telnyx AI Agent — Inbound | 6 — AI voice intake, webhook processing, CRM integration |
| 8 | Agent Management | 5 — Multi-agent CRUD, transcripts, usage dashboard |
| 9 | Security Hardening | 6 — Redis rate limiting, CSRF, password policy, webhook verification |
| 10 | Dashboard + UX Polish | 11 — Dashboard, notifications, Google Calendar, coaching cards |
| 10b | CRM Pipeline | 6 — Kanban, follow-up picker, quote history, empty states |
| 10c | Notes + Kanban + Notifications | 3 — Client notes, drag-and-drop board, notification enhancement |
| 11 | Compulife Integration | — Real carrier pricing, rate class spreads, FE/ROP/UL products, mock removal, SI/FUW filtering, My Carriers COMPINC, birthdate input, 4 bug fixes |
| 12 | Clerk Migration | 7 — Replace Supabase Auth with Clerk, JWKS integration |
| BG | Telnyx Billing Groups | 3 — API client, Clerk webhook, fallback + settings UI |
| UA | Underwriting Assistant | 2 — Full-screen chat page, AI backend with carrier context + tool calling |

## Rules

### DO NOT
- Modify `components/ui/*` — use shadcn components as-is
- Modify `styles/globals.css` theme
- Use AI for premium calculations — deterministic if/else only
- Auto-trigger quotes — agent must click "Get Quotes"
- Hard-decline carriers for medical conditions — show warnings, let agents decide
- Install new dependencies without asking
- Break the `/quote` route — it's the quick-quote fallback and demo route

### ALWAYS
- Run `bunx tsc --noEmit` after every change
- Persist lead data to Supabase — never lose data on refresh
- Track "dirty" fields — enrichment must not overwrite manual edits
- Read `GLOBAL_RULES.md` before UI changes
- Follow mobile-first responsive (Tailwind breakpoints)

## Design System

### Color System (OKLCH)
```css
--primary: oklch(0.205 0 0);     /* Light: near black */
--background: oklch(1 0 0);       /* Light: white */
--primary: oklch(0.922 0 0);     /* Dark: near white */
--background: oklch(0.145 0 0);  /* Dark: dark gray */
```

### Imports
```typescript
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
```

## Branch Strategy

- `main` — Production branch
- `feature/lukas` — Active development branch

## References

- **Next.js**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind v4**: https://tailwindcss.com/docs
- **Supabase**: https://supabase.com/docs
- **Clerk**: https://clerk.com/docs
- **Zustand**: https://docs.pmnd.rs/zustand
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **Telnyx**: https://developers.telnyx.com
- **People Data Labs**: https://docs.peopledatalabs.com
- **Design Rules**: `GLOBAL_RULES.md`
- **Data Reference**: `docs/DATA_REFERENCE.md`
- **Project Scope**: `PROJECT_SCOPE.md`
