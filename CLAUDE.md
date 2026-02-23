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
- **Runtime**: Bun (package manager)

- **State Management**: Zustand (lead store, UI store, commission store)
- **Database**: Supabase (PostgreSQL with RLS on all 7 tables)
- **Auth**: Supabase Auth with `@supabase/ssr` (cookie-based sessions)
- **CSV Parsing**: PapaParse
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
│   │   ├── integrations/page.tsx # AI Voice Agent setup + coming soon integrations
│   │   └── [section]/page.tsx    # Dynamic placeholder for 6 "Coming Soon" sections
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
│   │   ├── ai-agent/route.ts          # GET/POST/DELETE — AI assistant CRUD
│   │   ├── ai-agent/toggle/route.ts   # PUT — enable/disable AI agent
│   │   ├── ai-agent/webhook/route.ts  # POST — Telnyx AI webhook (lead creation)
│   │   └── transcribe/
│   │       ├── stream/route.ts  # GET — SSE stream (Deepgram live transcription)
│   │       └── audio/route.ts   # POST — forward base64 PCM to Deepgram
│   ├── layout.tsx                # Root layout (Inter + Geist Mono + AuthProvider)
│   └── page.tsx                  # Marketing landing page
│
├── components/
│   ├── ui/                       # shadcn/ui (56 components — DO NOT MODIFY)
│   ├── quote/                    # Quote engine components
│   │   ├── intake-form.tsx       # Left column: client info intake
│   │   ├── carrier-results.tsx   # Center column: Best Matches + All Carriers
│   │   ├── carrier-detail-modal.tsx  # Three-tab dialog: Overview, Underwriting, Carrier Info
│   │   ├── carrier-comparison.tsx    # Side-by-side comparison sheet (2-3 carriers)
│   │   ├── ai-assistant-panel.tsx    # Right column: streaming chat + proactive insights
│   │   ├── lead-enrichment-popover.tsx # PDL lookup + results dialog + Apply to Lead checkboxes
│   │   └── medical-history-section.tsx # Conditions combobox, medications, DUI toggle
│   ├── leads/                    # Lead management components
│   │   ├── lead-list.tsx              # CRM table: sort, filter, status pills, quick-schedule
│   │   ├── lead-detail-client.tsx     # Lead detail page with status dropdown + save
│   │   ├── lead-details-section.tsx   # Collapsible sections: follow-up, personal, financial, notes, activity
│   │   ├── lead-status-badge.tsx      # Color-coded status badges + LEAD_STATUSES + getStatusLabel
│   │   ├── follow-up-scheduler.tsx    # Date/time picker + FollowUpIndicator + urgency helpers
│   │   ├── activity-timeline.tsx      # Chronological activity feed with icons + load more
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
│   │   └── integrations-settings-client.tsx # AI Voice Agent setup + toggle + test call
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
│   │   ├── database.ts           # Stricter DB row aliases (LeadRow, ActivityLogRow, etc.)
│   │   ├── database.generated.ts # Auto-generated Supabase types (DO NOT EDIT)
│   │   └── index.ts              # Barrel exports
│   ├── data/
│   │   ├── carriers.ts           # 11 carriers with real intelligence data
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
│   ├── supabase/
│   │   ├── server.ts             # Server-side Supabase client (service role, bypasses RLS)
│   │   ├── auth-server.ts        # Session-based Supabase client (respects RLS) + getCurrentUser/requireUser
│   │   ├── auth-client.ts        # Browser-side Supabase client for auth operations
│   │   ├── leads.ts              # Lead CRUD operations (Phase 6 expanded fields)
│   │   ├── calls.ts              # Call log CRUD: saveCallLog, getCallLogs, getCallCounts
│   │   ├── activities.ts         # Activity log: getActivityLogs, insertActivityLog
│   │   ├── settings.ts           # Agent settings: getAgentSettings, upsertAgentSettings + AI agent settings
│   │   └── activities.ts         # Activity log: getActivityLogs, insertActivityLog
│   ├── actions/
│   │   ├── leads.ts              # Server actions: CRUD + activity logging on mutations
│   │   └── log-activity.ts       # Fire-and-forget activity logging helper
│   ├── utils/
│   │   └── csv-parser.ts         # CSV column mapping + parsing (Phase 6 expanded)
│   ├── middleware/
│   │   ├── auth-guard.ts         # API auth: shared secret OR Supabase session cookies
│   │   └── rate-limiter.ts       # In-memory sliding window rate limiter (all API endpoints)
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
├── ERRORS/                       # Task failure dumps (auto-created)
└── TASKS/                        # Task specs (Phase 6: 8 tasks, T6.1–T6.8)
```


### Key Architectural Decisions

1. **App Router Over Pages Router**: All routes use Next.js App Router (app/ directory)
2. **shadcn/ui Philosophy**: Components copied into project, allowing full customization
3. **Tailwind CSS v4**: @theme inline syntax with OKLCH color space
4. **Path Aliases**: `@/*` maps to root, configured in tsconfig.json
5. **Quote Logic is Deterministic**: No AI/ML for premium calculations — if/else blocks and database lookups only. Legal liability requires this.
6. **Lead as First-Class Entity**: All data (enrichment, quotes, calls) attaches to a Lead record. The Lead type composes existing types.
7. **Zustand for State**: Two stores: LeadStore (data) and UIStore (panels, views). Replaces scattered useState.
8. **Supabase for Persistence**: PostgreSQL with RLS active on all 7 tables (leads, enrichments, quotes, call_logs, agent_settings, activity_logs, ai_agent_calls). Service role client bypasses RLS; auth client respects it. All server actions use `requireUser()` for auth — no hardcoded agent IDs.
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

### Carrier Intelligence (11 carriers with full data)
| ID | Carrier | AM Best | Key Differentiator |
|---|---|---|---|
| amam | American Amicable | A- | Broad SI product line, 36-mo tobacco lookback |
| foresters | Foresters Financial | A | ★ Vaping = non-smoker rates (only carrier) |
| moo | Mutual of Omaha | A+ | Strong brand, wide state availability |
| jh | John Hancock | A+ | ★ Most lenient nicotine (ZYN, smokeless, marijuana) |
| lga | LGA / Banner Life | A+ | FUW, highest face amounts ($2M), lowest rates |
| sbli | SBLI | A | All states, 6 rate classes, digital-first |
| nlg | NLG/LSW | A | BMI-based rate classes, IUL products |
| transamerica | Transamerica | A | Unique DUI flat-extra schedule |
| americo | Americo | A | DocuSign only, Eagle Premier telesales |
| uhl | United Home Life | A- | DLX product uniquely accepts DUI |
| fg | F&G Fidelity & Guaranty | A- | IUL-only carrier |

### Pricing
Currently **mock pricing** (formula-based). Replaced by **Compulife API** ($480/yr) when access is secured.

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
NEXT_PUBLIC_APP_URL=                 # Public app URL for AI agent webhooks (e.g., https://ensurance.vercel.app)
```

### Pre-Production: Supabase Dashboard Auth Rate Limits

Configure in Supabase Dashboard → Authentication → Rate Limits:
- **Sign in (password)**: 5 per 5 minutes per IP
- **Sign up**: 3 per 15 minutes per IP
- **Password reset**: 3 per 15 minutes per IP
- **Email resend**: 3 per 15 minutes per IP

Auth forms call Supabase directly from the browser (not through API routes), so the in-memory rate limiter does not apply. Supabase's GoTrue rate limits are the only protection against brute-force/credential stuffing on auth endpoints.

## Completed Phases

### Phase 1: Lead CRM Foundation (8 tasks)
- Supabase schema: leads, enrichments, quotes, call_logs tables with RLS
- Lead type + Zustand stores (lead-store, ui-store, commission-store)
- CSV upload with column mapping (PapaParse)
- Lead list view (sortable/filterable CRM table)
- Lead detail view (three-column resizable: intake + results + AI panel)
- Navigation: /leads, /leads/[id], /quote, /settings

### Phase 2: Quote Engine + Intelligence (8 tasks)
- Quote engine: intake, eligibility, mock pricing, match scoring, two-tier display
- Carrier detail modal (3 tabs), side-by-side comparison (2-3 carriers)
- AI assistant panel: streaming chat, proactive insights, enrichment trigger
- PDL enrichment: 80+ fields, accordion display, auto-fill bridge
- Medical history: 18 conditions combobox, DUI toggle
- Build chart (height/weight) integration with rate class impact
- Commission settings: per-carrier rates, earnings in quote results
- 11 carriers with real intelligence data

### Phase 3: Telnyx Calling + Transcription (10 tasks)
- Outbound calling via TelnyxRTC (WebRTC, SIP credential auth)
- Inbound call handling: accept/decline banner, Web Audio ring tone
- Deepgram Nova-3 live transcription (SSE + POST proxy)
- Real-time AI coaching hints during calls (GPT-4o-mini, 30s interval)
- Post-call: AI summary, transcript formatting, Supabase persistence
- Call log viewer with expandable history + full transcript modal
- Rate limiting on all API endpoints (in-memory sliding window)
- Security hardening: input validation, error sanitization, security headers

### Phase 4: Supabase Auth + User Scoping (4 tasks)
- Supabase Auth with `@supabase/ssr` (cookie-based sessions)
- Auth infrastructure: middleware.ts (session refresh + route protection), auth-server.ts (getCurrentUser/requireUser), auth-client.ts (browser-side), auth-provider.tsx (React context + useAuth hook), callback route (email confirmation code exchange)
- Auth pages wired to Supabase: login (signInWithPassword), register (signUp with metadata), password reset (resetPasswordForEmail), set new password (updateUser), check email (resend with type detection)
- User-scoped data: all server actions use requireUser(), agent_id ownership filter on all CRUD operations, DEV_AGENT_ID removed
- RLS enabled on all 5 tables (leads, enrichments, quotes, call_logs, agent_settings)
- Commission settings migrated from localStorage to Supabase (agent_settings table, debounced server sync)
- Dual auth for API routes: shared secret (X-API-Secret, timing-safe comparison) + Supabase session cookies
- Security fixes: open redirect prevention, IDOR prevention, error sanitization, auth guard bypass removal

### Phase 5: UI Polish + Settings (8 tasks)
- Navigation fixes: middleware route protection, active link highlighting, logo links to /leads, redirect param preservation through login flow
- Collapsed panel affordances: all three QuoteWorkspace panels show vertical context bars (icons, labels, expand buttons) when collapsed; same in lead detail view
- Center panel minimize toggle: Minimize2 button, collapsed bar with coverage/term/eligible-count badge, auto-expand on "Get Quotes"
- Carrier table responsive reflow: ScrollableTable wrapper with CSS scroll-shadow gradients, min-width 820px, feature pills show 2 + "+N more"
- Settings layout: sidebar with 9 nav items + centered content area
- Profile settings page: name/email/license fields with React Hook Form + Zod, saves to Supabase user_metadata
- Placeholder settings pages: dynamic `[section]` route for 7 "Coming Soon" sections with planned features
- Commissions page moved to `/settings/commissions` sub-route

### Phase 6: Lead Data Expansion + CRM Workflow (8 tasks)
- Database migration: 13 new nullable columns on leads table (personal, financial, CRM workflow fields)
- Lead type expanded: dateOfBirth, address, city, zipCode, maritalStatus, occupation, incomeRange, dependents, existingCoverage, status, statusUpdatedAt, followUpDate, followUpNote, notes
- Lead detail form: 4 collapsible sections (Follow-Up, Personal, Financial, Notes) + Activity Timeline
- CSV mapper expanded: 13 new column mappings + date/state normalization + improved fuzzy matching
- Add Lead dialog expanded: 4-section form matching new fields
- PDL enrichment auto-fill: agent-reviewed checkbox UI with overwrite warnings, salary→incomeRange mapping, birthYear→dateOfBirth conversion
- Lead status workflow: 6-status pipeline (new→contacted→quoted→applied→issued→closed), color-coded badges, status filter pills, auto-advance on call connect + quote generation
- Follow-up scheduling: date/time picker, quick-schedule popover from leads list, follow-up urgency indicators (overdue/today/upcoming), post-call follow-up prompt
- Activity timeline: activity_logs table with RLS, chronological feed with type-specific icons/colors, paginated (20/page), fire-and-forget logging on lead create/update/status change/quote/enrichment/call/follow-up
- Database: 6 tables total (leads, enrichments, quotes, call_logs, agent_settings, activity_logs)

### Phase 7: Telnyx AI Agent — Inbound (6 tasks)
- Telnyx AI Assistants API wrapper: stateless CRUD module (`ai-service.ts`) with retry on 429/network errors, exponential backoff. Uses POST for updates (Telnyx quirk), always `promote_to_main: true`
- Insurance intake voice prompt: goal-based prompt builder (`ai-prompts.ts`) collecting name, phone, reason, callback preference, age range, state, urgency. 5 caller scenario paths. Explicit NEVER rules (no insurance advice/pricing/recommendations). Model: `Qwen/Qwen3-235B-A22B` (Llama outputs JSON that TTS reads literally)
- Assistant config builder (`ai-config.ts`): full `TelnyxAssistantCreateDto` with webhook tool, `enabled_features: ['telephony']`, no hangup tool (breaks WebRTC), no voice/speed/noise overrides
- Webhook endpoint (`/api/ai-agent/webhook`): receives Telnyx AI tool call data, Zod validation, agent_id from query param, stores in `ai_agent_calls` table, returns 200 quickly (Telnyx timeout), processes lead creation + transcript enrichment non-blocking
- AI lead processor (`ai-lead-processor.ts`): phone-based deduplication, name parsing, natural language callback preference → ISO date, notes building, call log + activity log creation, follow-up auto-scheduling
- Settings > Integrations page: AI Voice Agent card with enable/disable toggle, status indicator, personality preview, collected-info badges, Telnyx phone number display, test call button (opens Telnyx widget), delete button. Coming Soon cards for Compulife, SendGrid, PDL
- CRM AI badges: "AI" source badge (violet) in lead list + source filter, "AI Agent" badge in lead detail header, AI info banner for AI-sourced leads, "AI Agent" badge on call log entries, AI agent prefix on activity timeline call entries
- Database migration: `telnyx_ai_assistant_id` + `telnyx_ai_enabled` on agent_settings, `ai_agent` added to leads source CHECK, `ai_agent_calls` table with RLS
- Database: 7 tables total (leads, enrichments, quotes, call_logs, agent_settings, activity_logs, ai_agent_calls)

### Upcoming
- Phase 8: Compulife real pricing, deployment optimization

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