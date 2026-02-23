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

### Planned (Phase 1 — not yet installed)
- **State Management**: Zustand (lead store, UI store)
- **Database**: Supabase (PostgreSQL with RLS)
- **CSV Parsing**: PapaParse

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

# Supabase (Phase 1 — not yet installed)
# bunx supabase link         # Link to Supabase project
# bunx supabase db push      # Apply migrations
# bunx supabase migration new <name>   # Create new migration
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
│   ├── settings/                 # Agent settings
│   │   ├── layout.tsx            # Single-column centered layout with TopNav
│   │   └── page.tsx              # Commission settings (per-carrier rates)
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
│   │   ├── call-log/route.ts      # POST — save call log to Supabase
│   │   ├── call-log/[leadId]/route.ts  # GET — fetch call logs for a lead
│   │   ├── call-log/counts/route.ts    # GET — call counts by lead IDs
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
│   │   ├── lead-enrichment-popover.tsx # PDL lookup + results dialog
│   │   └── medical-history-section.tsx # Conditions combobox, medications, DUI toggle
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
│   │   ├── commission-settings-client.tsx  # Default rates + per-carrier commission table
│   │   └── commission-table-row.tsx        # Inline-editable carrier commission row
│   ├── landing/                  # Marketing page components (atoms, molecules, organisms, templates)
│   └── auth/                     # Auth form components + provider
│       └── auth-provider.tsx     # AuthProvider context + useAuth() hook
│
├── lib/
│   ├── types/
│   │   ├── carrier.ts            # Carrier, Product, TobaccoRules, DUIRule
│   │   ├── quote.ts              # QuoteRequest, CarrierQuote, QuoteResponse
│   │   ├── ai.ts                 # EnrichmentResult, ProactiveInsight, AutoFillData
│   │   ├── commission.ts          # CarrierCommission, CommissionSettings, CommissionEstimate
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
│   │   └── client.ts                # TelnyxRTC client wrapper
│   ├── supabase/
│   │   ├── server.ts             # Server-side Supabase client (service role, bypasses RLS)
│   │   ├── auth-server.ts        # Session-based Supabase client (respects RLS) + getCurrentUser/requireUser
│   │   ├── auth-client.ts        # Browser-side Supabase client for auth operations
│   │   ├── leads.ts              # Lead CRUD operations
│   │   └── calls.ts              # Call log CRUD: saveCallLog, getCallLogs, getCallCounts
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
└── TASKS/                        # Phase 1 task specs (8 tasks)
```

### Planned Directories (Phase 1 — not yet created)
```
app/leads/                        # Lead CRM routes
components/leads/                 # Lead CRM components
components/navigation/            # Shared navigation
lib/store/                        # Zustand stores (lead-store, ui-store, commission-store)
lib/supabase/                     # Supabase clients + data access
lib/types/lead.ts                 # Lead type
lib/types/database.ts             # Supabase table types
lib/utils/csv-parser.ts           # CSV parsing utilities
supabase/migrations/              # Database migrations
DATA_REFERENCE.md                 # Carrier intelligence data reference
CONVERSATION_INDEX.md             # Past conversation summaries
```

### Key Architectural Decisions

1. **App Router Over Pages Router**: All routes use Next.js App Router (app/ directory)
2. **shadcn/ui Philosophy**: Components copied into project, allowing full customization
3. **Tailwind CSS v4**: @theme inline syntax with OKLCH color space
4. **Path Aliases**: `@/*` maps to root, configured in tsconfig.json
5. **Quote Logic is Deterministic**: No AI/ML for premium calculations — if/else blocks and database lookups only. Legal liability requires this.
6. **Lead as First-Class Entity**: All data (enrichment, quotes, calls) attaches to a Lead record. The Lead type composes existing types.
7. **Zustand for State**: Two stores: LeadStore (data) and UIStore (panels, views). Replaces scattered useState.
8. **Supabase for Persistence**: PostgreSQL with RLS. Tables: leads, enrichments, quotes, call_logs.
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
- Auto-fills intake: age, gender, state (Phase 1 expands to name + more fields)
- Age estimation fallback if birth_year gated on PDL free tier

## Environment Variables

```bash
# .env.local (currently configured)
OPENAI_API_KEY=                      # GPT-4o-mini for AI chat + proactive insights
PEOPLEDATALABS_API_KEY=              # PDL person enrichment
DEEPGRAM_API_KEY=                    # Deepgram Nova-3 live transcription ($0.0077/min)

# Phase 1 — add when Supabase is set up
# NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anonymous key
# SUPABASE_SERVICE_ROLE_KEY=         # Supabase service key (server-side only)
```

## Current Phase

**Phase 1: Lead CRM Foundation** (8 tasks in TASKS/)

### Built ✅
- Marketing landing page
- Auth UI (login, register, confirm, password reset) — no auth logic yet
- Quote engine: intake, eligibility, mock pricing, match scoring, two-tier carrier display
- Carrier detail modal (3 tabs), side-by-side comparison (2-3 carriers)
- AI assistant panel: streaming chat, proactive insights, enrichment trigger
- PDL enrichment: 80+ fields, accordion display, auto-fill bridge
- Medical history: 18 conditions combobox, DUI toggle
- 11 carriers with real intelligence data

### Building Now (Phase 1) 🔨
- Supabase schema (leads, quotes, enrichments, call_logs)
- Lead type + Zustand stores
- CSV upload with column mapping
- Lead list view (CRM table)
- Lead detail view (lead → quote engine)
- Resizable/collapsible three-column panels
- Enrichment → intake auto-fill pipeline
- Navigation (/leads, /leads/[id], /quote)

### Upcoming Phases ⏳
- Phase 2: Enrichment pipeline refinement
- Phase 3: Telnyx calling (outbound, recording, transcription)
- Phase 4: Ringba inbound + live AI during calls
- Phase 5: Compulife real pricing, Supabase Auth, deployment

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