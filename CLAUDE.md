# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ensurance** is a term life insurance agent command center — quoting, lead management, enrichment, and AI assistance in one platform. Agents upload lead lists, enrich prospects with People Data Labs, get instant carrier quotes with underwriting intelligence, and (soon) call leads via Telnyx — all from a three-column resizable interface.

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
- **AI**: Vercel AI SDK + OpenAI GPT-4o-mini (streaming chat + proactive insights)
- **Enrichment**: People Data Labs API (80+ field person enrichment)
- **Transcription**: Deepgram Nova-3 (@deepgram/sdk, live streaming via SSE+POST proxy)
- **Email**: Resend SDK (transactional emails — quote summaries, reminders)
- **Runtime**: Bun (package manager)

- **Rate Limiting**: Upstash Redis (@upstash/redis + @upstash/ratelimit) — distributed, 5 tiers
- **State Management**: Zustand (lead store, UI store, commission store)
- **Calendar**: Google Calendar API (googleapis) — OAuth2 token storage, event sync
- **Database**: Supabase (PostgreSQL with RLS on all 11 tables)
- **Auth**: Supabase Auth with `@supabase/ssr` (cookie-based sessions)
- **CSV Parsing**: PapaParse
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable (Kanban board)
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
│   ├── auth/                     # Authentication routes
│   │   ├── callback/route.ts     # OAuth callback — exchanges code for session
│   │   ├── login/
│   │   ├── register/
│   │   ├── confirm/
│   │   └── password/
│   ├── settings/                 # Agent settings (sidebar + content)
│   │   ├── layout.tsx            # TopNav + sidebar (9 nav items) + centered content
│   │   ├── page.tsx              # Redirects to /settings/profile
│   │   ├── profile/page.tsx      # Profile: name, email, license (Supabase user_metadata)
│   │   ├── commissions/page.tsx  # Commission rates (per-carrier, Supabase-synced)
│   │   ├── integrations/page.tsx # Links to /agents + coming soon integrations
│   │   └── [section]/page.tsx    # Dynamic placeholder for 6 "Coming Soon" sections
│   ├── agents/                    # AI Agent management (Phase 8)
│   │   ├── layout.tsx             # TopNav layout
│   │   ├── page.tsx               # Tabbed: My Agents (card grid) + Usage dashboard
│   │   └── [id]/page.tsx          # Agent detail: config, call history, transcripts
│   ├── quote/                    # Quick quote engine (anonymous, no lead context)
│   │   ├── page.tsx
│   │   └── quote-page-client.tsx
│   ├── api/
│   │   ├── quote/route.ts        # POST — eligibility + pricing + scoring
│   │   ├── chat/route.ts         # POST — streaming AI chat (GPT-4o-mini)
│   │   ├── chat/proactive/route.ts # POST — proactive insight cards
│   │   ├── enrichment/route.ts   # POST — PDL person enrichment
│   │   ├── coaching/route.ts      # POST — real-time AI coaching hints (GPT-4o-mini)
│   │   ├── call-summary/route.ts  # POST — 3-sentence AI call summary (GPT-4o-mini)
│   │   ├── call-log/route.ts      # POST — save call log to Supabase + activity log
│   │   ├── call-log/[leadId]/route.ts  # GET — fetch call logs for a lead
│   │   ├── call-log/counts/route.ts    # GET — call counts by lead IDs
│   │   ├── activity-log/route.ts       # POST — insert activity log entry
│   │   ├── activity-log/[leadId]/route.ts # GET — paginated activity feed for a lead
│   │   ├── settings/route.ts          # GET/PUT — agent commission settings (Supabase)
│   │   ├── agents/route.ts             # GET/POST — multi-agent CRUD
│   │   ├── agents/[id]/route.ts       # GET/PUT/DELETE — single agent CRUD + Telnyx sync
│   │   ├── agents/[id]/transcripts/route.ts       # POST — store transcript messages
│   │   ├── agents/[id]/transcripts/[callId]/route.ts # GET — transcript messages
│   │   ├── agents/usage/route.ts      # GET — aggregated usage stats
│   │   ├── ai-agent/route.ts          # GET/POST/DELETE — Phase 7 AI assistant (legacy)
│   │   ├── ai-agent/toggle/route.ts   # PUT — enable/disable AI agent (legacy)
│   │   ├── ai-agent/webhook/route.ts  # POST — Telnyx AI webhook (Phase 8: multi-agent + transcripts)
│   │   ├── notifications/route.ts     # GET — derived notifications, POST — mark all read
│   │   ├── dashboard/
│   │   │   ├── stats/route.ts         # GET — dashboard stat cards
│   │   │   └── calendar/route.ts      # GET — calendar events for dashboard
│   │   ├── jobs/
│   │   │   ├── retention/route.ts           # POST — data retention cleanup (daily cron)
│   │   │   └── follow-up-reminders/route.ts # POST — follow-up digest emails (weekday cron)
│   │   └── transcribe/
│   │       ├── stream/route.ts  # GET — SSE stream (Deepgram live transcription)
│   │       └── audio/route.ts   # POST — forward base64 PCM to Deepgram
│   ├── dashboard/page.tsx         # Dashboard: stats, follow-ups, activity feed
│   ├── layout.tsx                # Root layout (Inter + Geist Mono + AuthProvider)
│   └── page.tsx                  # Marketing landing page
│
├── components/
│   ├── ui/                       # shadcn/ui (56 components — DO NOT MODIFY)
│   ├── quote/                    # Quote engine components
│   │   ├── intake-form.tsx       # Left column: client info intake
│   │   ├── carrier-results.tsx   # Center column: Best Matches + All Carriers + Email Quote button
│   │   ├── carrier-detail-modal.tsx  # Three-tab dialog: Overview, Underwriting, Carrier Info
│   │   ├── carrier-comparison.tsx    # Side-by-side comparison sheet (2-3 carriers)
│   │   ├── ai-assistant-panel.tsx    # Right column: streaming chat + proactive insights
│   │   ├── lead-enrichment-popover.tsx # PDL lookup + results dialog + Apply to Lead checkboxes
│   │   ├── email-quote-dialog.tsx    # Email quote summary dialog: recipient, carrier preview, send
│   │   └── medical-history-section.tsx # Conditions combobox, medications, DUI toggle
│   ├── navigation/               # Navigation components
│   │   ├── top-nav.tsx                # Top navigation bar
│   │   ├── notification-bell.tsx      # Notification bell: count badge, resizable slide-out panel, date grouping
│   │   ├── unsaved-changes-guard.tsx  # beforeunload prompt for dirty forms
│   │   └── back-to-quoter.tsx         # Reusable back navigation component
│   ├── dashboard/                # Dashboard page components
│   │   ├── dashboard-client.tsx       # Main dashboard: stat cards, follow-ups, activity
│   │   ├── calendar-view.tsx          # Week-at-a-glance calendar view
│   │   ├── calendar-week-grid.tsx     # Weekly calendar grid layout
│   │   ├── calendar-day-grid.tsx      # Daily calendar grid layout
│   │   ├── calendar-event-block.tsx   # Calendar event block rendering
│   │   ├── calendar-event-item.tsx    # Calendar event list item
│   │   ├── calendar-event-popover.tsx # Calendar event detail popover
│   │   └── add-calendar-event-dialog.tsx # Create calendar event dialog
│   ├── shared/                   # Shared reusable components
│   │   └── empty-state.tsx            # Reusable EmptyState: icon, title, description, actions, compact mode
│   ├── leads/                    # Lead management components
│   │   ├── lead-list.tsx              # CRM table + Kanban toggle: sort, filter, status pills, view mode (list/board)
│   │   ├── lead-detail-client.tsx     # Lead detail page with status dropdown + save
│   │   ├── lead-details-section.tsx   # Collapsible sections: follow-up, personal, financial, notes, activity
│   │   ├── lead-status-badge.tsx      # Color-coded status badges + LEAD_STATUSES + getStatusLabel
│   │   ├── kanban-board.tsx           # Drag-and-drop pipeline board (@dnd-kit): 6 columns, draggable cards
│   │   ├── lead-notes.tsx             # Timestamped agent notes: add, delete, newest-first list
│   │   ├── follow-up-scheduler.tsx    # Date/time picker + FollowUpIndicator + urgency helpers
│   │   ├── follow-up-picker.tsx       # Inline follow-up picker with quick presets (1hr, tomorrow, next Mon/Fri)
│   │   ├── quote-history.tsx          # Collapsible quote history cards with re-run + copy summary + email
│   │   ├── activity-timeline.tsx      # Chronological activity feed with icons + load more
│   │   ├── date-picker-input.tsx      # DatePickerInput: text input MM/DD/YYYY + Calendar popover with year/month dropdowns
│   │   ├── column-mapper.tsx          # CSV column mapping UI component
│   │   ├── add-lead-dialog.tsx        # Manual lead creation dialog (Phase 6 expanded fields)
│   │   ├── csv-upload.tsx             # CSV file upload trigger
│   │   └── import-preview.tsx         # CSV column mapping preview (Phase 6 expanded columns)
│   ├── calling/                  # Call lifecycle components
│   │   ├── call-log-viewer.tsx      # Expandable call history in lead detail
│   │   ├── transcript-modal.tsx     # Full transcript Sheet with coaching hints
│   │   ├── transcript-view.tsx      # Live transcript during active calls
│   │   ├── transcript-entry.tsx     # Individual transcript bubble
│   │   ├── coaching-hint-card.tsx   # Inline coaching hint card
│   │   ├── call-mode-header.tsx     # Active call header bar
│   │   ├── incoming-call-banner.tsx  # Fixed-top inbound call accept/decline banner
│   │   ├── ring-sound.tsx           # Web Audio ring tone for inbound calls
│   │   ├── call-button.tsx          # Dial/hangup button
│   │   ├── active-call-bar.tsx      # Global call status bar
│   │   └── call-notification-handler.tsx  # Root-level call event handler
│   ├── settings/                 # Agent settings components
│   │   ├── settings-sidebar.tsx           # 9-item nav (Profile → Commissions)
│   │   ├── settings-page-header.tsx       # Reusable title + description header
│   │   ├── profile-settings-client.tsx    # Profile form (RHF + Zod → user_metadata)
│   │   ├── settings-placeholder.tsx       # Reusable "Coming Soon" card for 6 sections
│   │   ├── commission-settings-client.tsx  # Default rates + per-carrier commission table
│   │   ├── commission-table-row.tsx        # Inline-editable carrier commission row
│   │   └── integrations-settings-client.tsx # Links to /agents + coming soon integrations
│   ├── agents/                  # AI Agent management components
│   │   ├── agents-page-client.tsx     # Tabbed page wrapper (My Agents + Usage)
│   │   ├── agents-list-client.tsx     # Agent card grid + empty/error states
│   │   ├── create-agent-dialog.tsx    # Create agent dialog (name, desc, phone, voice)
│   │   ├── agent-detail-client.tsx    # Config form + call history + delete
│   │   ├── transcript-viewer.tsx      # Chat-style transcript viewer
│   │   └── usage-dashboard.tsx        # Usage stats, sortable table, cost estimation
│   ├── coaching/                  # Real-time coaching card components
│   │   ├── coaching-card-stack.tsx   # Card stack with auto-collapse timers + EmptyState
│   │   ├── style-card.tsx            # DISC communication style card
│   │   ├── medication-card.tsx       # Medication detection + carrier eligibility card
│   │   ├── life-event-card.tsx       # Life event cross-sell card
│   │   ├── coaching-tip-card.tsx     # General coaching tip card
│   │   └── index.ts                  # Barrel exports
│   ├── landing/                  # Marketing page components (atoms, molecules, organisms, templates)
│   └── auth/                     # Auth form components + provider
│       └── auth-provider.tsx     # AuthProvider context + useAuth() hook
│
├── lib/
│   ├── types/
│   │   ├── carrier.ts            # Carrier, Product, TobaccoRules, DUIRule
│   │   ├── quote.ts              # QuoteRequest, CarrierQuote, QuoteResponse
│   │   ├── lead.ts               # Lead, LeadStatus, MaritalStatus, IncomeRange, LeadQuoteSnapshot
│   │   ├── ai.ts                 # EnrichmentResult, ProactiveInsight, EnrichmentAutoFillData
│   │   ├── activity.ts           # ActivityLog, ActivityType, detail payload interfaces
│   │   ├── commission.ts          # CarrierCommission, CommissionSettings, CommissionEstimate
│   │   ├── coaching.ts            # CoachingCard (discriminated union), CoachingResponseSchema (Zod)
│   │   ├── database.ts           # Stricter DB row aliases (LeadRow, ActivityLogRow, etc.)
│   │   ├── database.generated.ts # Auto-generated Supabase types (DO NOT EDIT)
│   │   └── index.ts              # Barrel exports
│   ├── data/
│   │   ├── carriers.ts           # 38 carriers (14 with structured intelligence data)
│   │   ├── pipeline.ts           # PIPELINE_STAGES, PipelineStatus, STATUS_ORDER, shouldSuggestStatus()
│   │   ├── medications.ts        # 92 medication entries across 13 categories with carrier eligibility
│   │   ├── life-event-triggers.ts # 25 life-event triggers for cross-sell detection
│   │   ├── medical-conditions.ts # 18 searchable conditions
│   │   ├── build-charts.ts       # Height/weight limits per carrier (Preferred/Standard thresholds)
│   │   └── carrier-intelligence-summary.ts  # Text for AI system prompt
│   ├── engine/
│   │   ├── pricing.ts            # PricingProvider interface + PricingRequest/PricingResult types
│   │   ├── pricing-config.ts     # Single config point — swap provider here
│   │   ├── mock-provider.ts      # MockPricingProvider wrapping mock-pricing.ts
│   │   ├── mock-pricing.ts       # TEMPORARY — wrapped by mock-provider.ts
│   │   ├── match-scoring.ts      # PERMANENT — proprietary scoring algorithm
│   │   ├── eligibility.ts        # PERMANENT — state/medical/DUI/build chart checks
│   │   ├── build-chart.ts        # checkBuildChart() + calculateBMI() — rate class from height/weight
│   │   └── commission-calc.ts    # Pure function: annual premium × rate → CommissionEstimate
│   ├── ai/
│   │   ├── system-prompt.ts      # buildSystemPrompt() for AI chat
│   │   ├── coaching-context.ts   # Condensed carrier intelligence for coaching prompts
│   │   └── call-coach.ts         # Coaching prompt builder, parser, deduplication
│   ├── deepgram/
│   │   ├── sessions.ts           # Deepgram WS session manager (Map-based, max 10)
│   │   └── stream.ts             # Client-side: SSE + audio POST + call-store dispatch
│   ├── telnyx/
│   │   ├── notification-handler.ts  # Maps TelnyxRTC events to call-store
│   │   ├── inbound-handler.ts       # Accept/decline inbound calls
│   │   ├── post-call-save.ts        # Post-call: format transcript, AI summary, save to DB
│   │   ├── active-call.ts           # Active call state + stream accessors
│   │   ├── audio-capture.ts         # PCM audio capture for transcription
│   │   ├── client.ts                # TelnyxRTC client wrapper
│   │   ├── ai-types.ts             # Telnyx AI Assistants API interfaces
│   │   ├── ai-service.ts           # AI Assistants CRUD (create/update/get/delete)
│   │   ├── ai-prompts.ts           # Insurance intake voice prompt builder
│   │   ├── ai-config.ts            # Assistant config builder + webhook URL helper
│   │   └── ai-lead-processor.ts    # Webhook data → CRM lead + call log + activity
│   ├── google/
│   │   ├── oauth.ts              # OAuth2 client factory, auth URL generation, code exchange
│   │   └── calendar-service.ts   # Google Calendar CRUD (create/update/delete/list events)
│   ├── email/
│   │   ├── resend.ts             # Resend SDK: sendEmail() for transactional emails (quote summaries, reminders)
│   │   └── templates/
│   │       ├── quote-summary.ts      # buildQuoteSummaryEmail() — branded HTML, top 3 carriers, no PII
│   │       └── follow-up-reminder.ts # buildFollowUpReminderEmail() — agent digest, urgency badges
│   ├── coaching/
│   │   └── build-coaching-prompt.ts # DISC style framework, medication DB, life-event triggers for coaching API
│   ├── auth/
│   │   └── password-rules.ts     # Shared password Zod schema + visual checklist rules (GLBA-appropriate)
│   ├── supabase/
│   │   ├── server.ts             # Service role Supabase client (createServiceRoleClient, bypasses RLS — webhooks only)
│   │   ├── auth-server.ts        # Session-based Supabase client (createAuthClient, respects RLS) + getCurrentUser/requireUser
│   │   ├── auth-client.ts        # Browser-side Supabase client for auth operations
│   │   ├── client.ts             # Browser-side Supabase client singleton
│   │   ├── leads.ts              # Lead CRUD operations (auth client, Phase 6 expanded fields)
│   │   ├── calls.ts              # Call log CRUD: saveCallLog (optional service client), getCallLogs, getCallCounts
│   │   ├── activities.ts         # Activity log: getActivityLogs, insertActivityLog (optional service client)
│   │   ├── notes.ts              # Lead notes CRUD: getNotesForLead, addNote, deleteNote
│   │   ├── notifications.ts      # Derived notifications: overdue follow-ups, upcoming callbacks, AI calls, activities
│   │   ├── dashboard.ts          # Dashboard stats: lead counts, activity summary
│   │   ├── usage.ts              # Usage metrics: phone numbers, calling stats, cost estimation
│   │   ├── settings.ts           # Agent settings: getAgentSettings, upsertAgentSettings, getAIAgentSettings (optional service client)
│   │   ├── ai-agents.ts          # AI agent CRUD, transcript storage, usage stats (optional service client on webhook-callable fns)
│   │   └── google-integrations.ts # Google OAuth token CRUD (getGoogleTokens, storeGoogleTokens, deleteGoogleTokens)
│   ├── actions/
│   │   ├── leads.ts              # Server actions: CRUD + activity logging on mutations
│   │   ├── notes.ts              # Server actions: fetchNotes, createNote, removeNote (Zod-validated)
│   │   ├── send-quote-email.ts   # Server action: Zod validate → build HTML → sendEmail → log activity
│   │   └── log-activity.ts       # Fire-and-forget activity logging helper
│   ├── utils/
│   │   ├── csv-parser.ts         # CSV column mapping + parsing (Phase 6 expanded)
│   │   └── quote-summary.ts      # buildQuoteSummary() + buildSingleCarrierSummary() + pickKeyFeature() for clipboard/email
│   ├── jobs/
│   │   ├── data-retention.ts         # runRetentionCleanup() — 90d transcripts, 1yr summaries/enrichments
│   │   └── follow-up-reminders.ts    # runFollowUpReminders() — query due follow-ups, send agent digests
│   ├── middleware/
│   │   ├── auth-guard.ts         # API auth: shared secret OR Supabase session cookies
│   │   ├── rate-limiter.ts       # Upstash Redis rate limiter (5 tiers, fail-open)
│   │   ├── csrf.ts               # CSRF protection: Origin/Referer validation + custom header fallback
│   │   └── telnyx-webhook-verify.ts # ED25519 webhook signature verification + replay protection
│   └── utils.ts                  # cn() helper
│
├── hooks/
│   ├── use-mobile.ts             # useIsMobile() hook
│   └── use-coaching-interval.ts  # 30s coaching hint interval during active calls
│
├── styles/
│   └── globals.css               # Tailwind v4 theme (DO NOT MODIFY)
│
├── middleware.ts                  # Next.js middleware: session refresh + route protection
├── CLAUDE.md                     # ← THIS FILE
├── GLOBAL_RULES.md               # Design system rules (read before UI changes)
├── PROJECT_SCOPE.md              # Project phases, goals, risks
├── LEARNINGS.md                  # Auto-populated by task execution
├── docs/
│   └── email-setup.md            # Resend SMTP setup guide (Supabase dashboard config + SDK usage)
├── ERRORS/                       # Task failure dumps (auto-created)
└── TASKS/                        # Task specs
```


### Key Architectural Decisions

1. **App Router Over Pages Router**: All routes use Next.js App Router (app/ directory)
2. **shadcn/ui Philosophy**: Components copied into project, allowing full customization
3. **Tailwind CSS v4**: @theme inline syntax with OKLCH color space
4. **Path Aliases**: `@/*` maps to root, configured in tsconfig.json
5. **Quote Logic is Deterministic**: No AI/ML for premium calculations — if/else blocks and database lookups only. Legal liability requires this.
6. **Lead as First-Class Entity**: All data (enrichment, quotes, calls) attaches to a Lead record. The Lead type composes existing types.
7. **Zustand for State**: Two stores: LeadStore (data) and UIStore (panels, views). Replaces scattered useState.
8. **Supabase for Persistence**: PostgreSQL with RLS active on all 11 tables. Auth client (`createAuthClient`) by default in all data layer files — respects RLS via session cookies. Service role client (`createServiceRoleClient`) only in webhook handlers where no user session exists, passed explicitly via optional `client?: DbClient` parameter. All server actions use `requireUser()` for auth.
9. **Dual Entry Points**: `/leads/[id]` for lead-centric workflow (persistent), `/quote` for quick anonymous quoting (ephemeral).
10. **Agent Controls the Flow**: No auto-quoting, no auto-calling. Enrichment auto-fills, agent reviews and triggers.

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
| foresters | Foresters Financial | A | ★ Vaping = non-smoker rates (only carrier) |
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
Currently **mock pricing** (formula-based). Being replaced by **Compulife Internet Engine** ($1,650-2,000/yr) — a CGI binary on a separate DigitalOcean server, wrapped with a Node.js JSON API. See `Compulife/` for implementation tasks. The `PricingProvider` interface in `lib/engine/pricing.ts` allows swapping mock→Compulife via `pricing-config.ts`.

### Match Scoring
Proprietary 0-99 scale. Factors: AM Best rating, e-sign capability, vape-friendly bonus, price rank, medical condition acceptance, state eligibility.

## AI Assistant Panel

- **Streaming chat** via Vercel AI SDK → OpenAI GPT-4o-mini
- **System prompt** includes carrier intelligence + client profile + quote results
- **Proactive insights**: auto-generated cards when intake/quotes change (2s debounce)
- **Enrichment trigger**: PDL lookup from the panel header

## PDL Enrichment

- 80+ fields across 10 categories (identity, location, employment, income, career, education, skills, contact, social, metadata)
- Agent-reviewed auto-fill: enrichment results show in dialog with per-field checkboxes (overwrite warnings for fields with existing values)
- Expanded auto-fill targets: firstName, lastName, age, gender, state, dateOfBirth, address, city, zipCode, maritalStatus, occupation, incomeRange
- Age estimation fallback if birth_year gated on PDL free tier

## Email Features

Two email features powered by Resend SDK (`lib/email/resend.ts`):

### Quote Summary Email (agent-triggered)
Agent clicks "Email Quote" in carrier results or quote history → `EmailQuoteDialog` opens with pre-filled recipient email → server action `sendQuoteEmail()` builds branded HTML via `buildQuoteSummaryEmail()` → sends via Resend → logs `email_sent` activity. Only visible when lead has an email address. Template shows top 3 carriers with monthly premium, AM Best rating, and key feature. Excludes PII (no medical conditions, tobacco, DUI).

### Follow-up Reminder Email (cron-triggered)
Vercel cron hits `POST /api/jobs/follow-up-reminders` at 7am/11am/3pm UTC on weekdays → `runFollowUpReminders()` queries leads with follow-ups due within 1 hour or overdue (excludes dead/issued) → groups by agent → sends one digest email per agent with color-coded urgency badges (overdue/today/upcoming) and links to lead detail pages. Uses service role client + `auth.admin.getUserById()` to resolve agent emails.

### Email Templates
- Inline-styled, table-based HTML (no `<style>` tags) for maximum email client compatibility
- 600px max-width, mobile-fluid
- Located in `lib/email/templates/`

## Environment Variables

```bash
# .env.local (currently configured)
OPENAI_API_KEY=                      # GPT-4o-mini for AI chat + proactive insights
PEOPLEDATALABS_API_KEY=              # PDL person enrichment
DEEPGRAM_API_KEY=                    # Deepgram Nova-3 live transcription ($0.0077/min)
NEXT_PUBLIC_SUPABASE_URL=            # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=           # Supabase service key (server-side only)
INTERNAL_API_SECRET=                 # Shared secret for server-to-server API auth (REQUIRED — auth guard denies all API requests without valid session or secret)
TELNYX_API_KEY=                      # Telnyx API key (shared: WebRTC calling + AI Assistants API)
NEXT_PUBLIC_APP_URL=                 # Public app URL for AI agent webhooks + CSRF origin validation
UPSTASH_REDIS_REST_URL=              # Upstash Redis URL for distributed rate limiting (optional — falls back to allow-all)
UPSTASH_REDIS_REST_TOKEN=            # Upstash Redis token (optional — falls back to allow-all)
TELNYX_WEBHOOK_PUBLIC_KEY=           # Telnyx ED25519 public key for webhook signature verification (base64-encoded DER/SPKI)
GOOGLE_CLIENT_ID=                    # Google OAuth2 client ID (optional — calendar sync disabled without it)
GOOGLE_CLIENT_SECRET=                # Google OAuth2 client secret (optional)
GOOGLE_REDIRECT_URI=                 # Google OAuth callback URL (e.g., http://localhost:3000/api/auth/google/callback)
RESEND_API_KEY=                      # Resend API key for transactional emails (optional — app-sent emails disabled without it)
RESEND_FROM=                         # Sender address override (optional — defaults to "Ensurance <noreply@yourdomain.com>")
CRON_SECRET=                         # Shared secret for cron job endpoints (retention, follow-up reminders)
```

### Pre-Production: Supabase Dashboard Auth Rate Limits

Configure in Supabase Dashboard → Authentication → Rate Limits:
- **Sign in (password)**: 5 per 5 minutes per IP
- **Sign up**: 3 per 15 minutes per IP
- **Password reset**: 3 per 15 minutes per IP
- **Email resend**: 3 per 15 minutes per IP

Auth forms call Supabase directly from the browser (not through API routes), so the application-level rate limiter does not apply. Supabase's GoTrue rate limits are the only protection against brute-force/credential stuffing on auth endpoints.

Also set **Minimum password length**: 10 (matches `lib/auth/password-rules.ts` schema).

## Completed Phases

Phases 1-10c are complete. For detailed records, see `docs/PHASE_HISTORY.md`.

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

**Database: 11 tables** — leads, enrichments, quotes, call_logs, agent_settings, activity_logs, ai_agent_calls, ai_agents, ai_transcripts, google_integrations, lead_notes

### Upcoming
- Phase 11: Compulife real pricing (see `Compulife/` task files), deployment optimization

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

- `main` — Miguel's branch, requires PR review
- `feature/lukas` — Active development branch

## References

- **Next.js**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind v4**: https://tailwindcss.com/docs
- **Supabase**: https://supabase.com/docs
- **Zustand**: https://docs.pmnd.rs/zustand
- **Vercel AI SDK**: https://sdk.vercel.ai/docs
- **People Data Labs**: https://docs.peopledatalabs.com
- **Design Rules**: `GLOBAL_RULES.md`
- **Data Reference**: `DATA_REFERENCE.md`
- **Project Scope**: `PROJECT_SCOPE.md`