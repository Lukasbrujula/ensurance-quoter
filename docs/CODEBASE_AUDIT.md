# Ensurance Codebase Audit

**Date:** 2026-02-22
**Branch:** `feature/lukas`
**Last Commit:** `bd03145` — feat: add agent commission settings and quote result integration

---

## Table of Contents

1. [All Routes](#1-all-routes)
2. [All Components](#2-all-components)
3. [All Stores](#3-all-stores)
4. [All Types](#4-all-types)
5. [All Engine Files](#5-all-engine-files)
6. [All Integrations](#6-all-integrations)
7. [Environment Variables](#7-environment-variables)
8. [Known Gaps](#8-known-gaps)
9. [Database Schema](#9-database-schema)
10. [Dependencies](#10-dependencies)

---

## 1. All Routes

### Pages

| Route | File | Status | Description |
|-------|------|--------|-------------|
| `/` | `app/page.tsx` | Functional | Marketing landing page (HeroSection, TrustSection, ProductTabSwitcher, FeaturesGrid, CTASection) |
| `/auth/login` | `app/auth/login/page.tsx` | Scaffold | LoginForm UI — no auth logic |
| `/auth/register` | `app/auth/register/page.tsx` | Scaffold | RegisterForm UI — no auth logic |
| `/auth/confirm` | `app/auth/confirm/page.tsx` | Scaffold | CheckEmailCard — post-registration |
| `/auth/password` | `app/auth/password/page.tsx` | Scaffold | PasswordResetForm UI |
| `/auth/password/reset` | `app/auth/password/reset/page.tsx` | Scaffold | SetPasswordForm UI |
| `/dashboard` | `app/dashboard/page.tsx` | Legacy | Prototype dashboard (pre-Zustand). QuoteEngineHeader + CoverageTermPanel + UnderwritingPanel + MarketComparisonTable |
| `/dashboard/profile` | `app/dashboard/profile/page.tsx` | Scaffold | PersonalInfoCard + ProfessionalInfoCard |
| `/dashboard/payment` | `app/dashboard/payment/page.tsx` | Prototype | OrderSummaryCard + PaymentMethodForm (step 2/3) |
| `/dashboard/payment/success` | `app/dashboard/payment/success/page.tsx` | Prototype | ConfirmationDetailsCard + WhatsNextStepper (step 3/3) |
| `/dashboard/payment/cancel` | `app/dashboard/payment/cancel/page.tsx` | Prototype | ErrorDetailsCard + retry options (step 2/3) |
| `/leads` | `app/leads/page.tsx` | Functional | Lead list CRM table with search, filter, sort, CSV upload, manual add |
| `/leads/[id]` | `app/leads/[id]/page.tsx` | Functional | Lead detail: QuoteWorkspace + CallLogViewer + ActiveCallBar + save/dirty tracking |
| `/quote` | `app/quote/page.tsx` | Functional | Anonymous quick-quote. Clears activeLead, renders QuoteWorkspace. Product tabs (only Term Life active) |
| `/settings` | `app/settings/page.tsx` | Functional | CommissionSettingsClient: default rates + per-carrier commission table |

### Layouts

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/layout.tsx` | Root: Inter + Geist Mono fonts, Sonner toasts, CallNotificationHandler (global), IncomingCallBanner (global) |
| `/auth/*` | `app/auth/layout.tsx` | Auth wrapper: logo header, centered content (max-w-lg), gradient bg, footer |
| `/leads/*` | `app/leads/layout.tsx` | TopNav + full-height flex |
| `/quote/*` | `app/quote/layout.tsx` | TopNav + full-height flex |
| `/settings/*` | `app/settings/layout.tsx` | TopNav + centered max-w-3xl container |

### API Routes

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/api/quote` | POST | Functional | Core quote engine. Zod validation -> eligibility check -> mock pricing -> match scoring -> ranked QuoteResponse |
| `/api/chat` | POST | Functional | Streaming AI chat via Vercel AI SDK + GPT-4o-mini. System prompt includes carrier intelligence + client context |
| `/api/chat/proactive` | POST | Functional | Generates 2-4 insight cards (warning/tip/info) via GPT-4o-mini JSON mode |
| `/api/enrichment` | POST | Functional | People Data Labs v5 person enrichment. 80+ fields, age estimation fallback, defensive extraction |
| `/api/coaching` | POST | Functional | Real-time coaching hint during calls. 5s timeout, deduplication, GPT-4o-mini JSON mode |
| `/api/call-summary` | POST | Functional | Post-call 3-sentence AI summary via `generateText()` |
| `/api/call-log` | POST | Functional | Save call log to Supabase (transcript, AI summary, coaching hints, metadata) |
| `/api/call-log/[leadId]` | GET | Functional | Fetch all call logs for a lead (ordered by started_at desc) |
| `/api/call-log/counts` | GET | Functional | Bulk call counts by lead IDs (for list badges) |
| `/api/transcribe/stream` | GET | Functional | SSE endpoint for live Deepgram transcription. Node.js runtime (long-lived). Events: session_init, transcript, utterance_end, error, close |
| `/api/transcribe/audio` | POST | Functional | Forward base64 PCM chunks to active Deepgram session. Max 1MB per chunk |
| `/api/telnyx/token` | POST | Functional | Two-step: create telephony credential -> generate JWT for TelnyxRTC client |
| `/api/telnyx/credentials` | GET | Functional | Return SIP login/password for persistent inbound WebRTC registration |

---

## 2. All Components

### `components/quote/` — Quote Engine (8 files)

| File | Status | Description |
|------|--------|-------------|
| `intake-form.tsx` | Functional | Left panel form: name, age, gender, state, coverage slider (18 presets $100K-$10M), term, tobacco, medical conditions, medications, DUI. Auto-fill respects dirty fields. Debounced 500ms submit. Agent card with demo user |
| `carrier-results.tsx` | Functional | Two-tier grid: Best Matches (top 3) + collapsible Others. Columns: Carrier, Product, Rating, Monthly, Annual, Commission, Actions. Sort by matchScore/premium/amBest/commission. Commission from commission-store, highest highlighted green |
| `carrier-detail-modal.tsx` | Functional | Three-tab dialog: Pricing (premiums + commission breakdown + features + product details), Underwriting (tobacco rules + DUI + medical eligibility), Company (AM Best + operational + state availability + living benefits) |
| `carrier-comparison.tsx` | Functional | CompareFloatingButton (visible when 2+ selected) + ComparisonSheet: 16-row side-by-side table for selected carriers |
| `ai-assistant-panel.tsx` | Functional | Two modes: Call Mode (CallModeHeader + InlineCallControls + TranscriptView) and Chat Mode (streaming chat + proactive insights + enrichment trigger). Vercel AI SDK useChat(). Auto-switches on call connect |
| `lead-enrichment-popover.tsx` | Functional | Search by name/email/phone -> PDL API -> 10-section accordion results -> auto-fill form -> "Send to AI" button |
| `medical-history-section.tsx` | Functional | Collapsible: searchable conditions combobox (18 conditions), removable badges, medications input, DUI toggle with years input |
| `quote-workspace.tsx` | Functional | Three-column resizable layout (ResizablePanelGroup): IntakeForm | Coverage+Term+CarrierResults | AiAssistantPanel. Panel sizes persist in UIStore. Collapse/expand. Keyboard shortcuts (ESC/ALT+S/ALT+Q) |

### `components/calling/` — Call Lifecycle (14 files)

| File | Status | Description |
|------|--------|-------------|
| `call-notification-handler.tsx` | Functional | Root-level handler. Auto-connects via SIP credentials on mount. Global 1s timer tick. Pre-warms mic (Safari). Cleanup on beforeunload |
| `call-button.tsx` | Functional | Green "CALL" button. Fetches token -> connectAndReady -> client.newCall(). Only shows if activeLead.phone exists |
| `active-call-bar.tsx` | Functional | Status bar: status dot, destination, timer, mute/hold/DTMF/hangup controls. Visible during connecting/ringing/active/held |
| `incoming-call-banner.tsx` | Functional | Fixed z-50 banner: pulsing phone icon, formatted caller number, Accept (green) / Decline (red). Auto-dismisses after 30s |
| `call-mode-header.tsx` | Functional | Minimal header: phone icon + "Live Call" + status dot + number + timer |
| `inline-call-controls.tsx` | Functional | Compact mute/hold/hangup for AI panel call mode |
| `transcript-view.tsx` | Functional | Scrollable transcript + coaching hints merged by timestamp. Auto-scroll (pauses on user scroll up). Post-call footer: Return to Chat + Copy Transcript |
| `transcript-entry.tsx` | Functional | Bubble: agent (left, blue) / client (right, gray). Timestamp + speaker + text. Interim = italic + reduced opacity |
| `coaching-hint-card.tsx` | Functional | Colored card: icon + hint text + related carrier badges. Type determines color (tip=blue, warning=amber, info=gray) |
| `transcript-modal.tsx` | Functional | Sheet with AI summary + parsed transcript lines + inline coaching hints (filtered by +-30s). Copy button |
| `call-log-viewer.tsx` | Functional | Collapsible "Call History" for lead detail. Fetches from API. Shows duration, AI summary (2-line clamp), expandable details, "View Full Transcript" |
| `ring-sound.tsx` | Functional | Web Audio 440Hz double-beep (2 beeps every 2s). Renders null |
| `remote-audio.tsx` | Functional | `<audio autoPlay>` element with MediaStream from remote party |
| `dtmf-keypad.tsx` | Functional | Popover 3x4 grid (1-9, *, 0, #) with letter sub-labels. Calls sendDTMF() |

### `components/leads/` — Lead CRM (6 files)

| File | Status | Description |
|------|--------|-------------|
| `lead-list.tsx` | Functional | Sortable table with search/filter (source, state). CSV upload + manual add buttons. Hydrates from Supabase. Fetches call counts. Click row -> /leads/[id] |
| `lead-detail-client.tsx` | Functional | Header (breadcrumb, badges, Call/Save buttons) + ActiveCallBar + QuoteWorkspace + CallLogViewer. Hydrates lead from Supabase if not in store. UnsavedChangesGuard |
| `csv-upload.tsx` | Functional | 4-step dialog wizard: Upload (drag-drop) -> Map (auto-detect columns) -> Preview -> Done. Batch create via server action |
| `column-mapper.tsx` | Functional | Dropdown list: CSV column -> Lead field mapping. Mapped count badge |
| `import-preview.tsx` | Functional | Preview table of mapped rows before import |
| `add-lead-dialog.tsx` | Functional | Dialog form: first/last name, email, phone, state. Creates lead via server action |

### `components/settings/` — Agent Settings (2 files)

| File | Status | Description |
|------|--------|-------------|
| `commission-settings-client.tsx` | Functional | Two sections: Default Rates (FY%/RN%) + Per-Carrier Table (11 carriers sorted A-Z). Debounced 300ms save. Hydration guard |
| `commission-table-row.tsx` | Functional | Inline-editable row: carrier badge + AM Best + FY% input + RN% input + "Custom" badge + Reset button. Clamped 0-150 FY, 0-25 RN |

### `components/navigation/` — Navigation (2 files)

| File | Status | Description |
|------|--------|-------------|
| `top-nav.tsx` | Functional | Logo + Leads/Quick Quote/Settings links + agent avatar (hardcoded "MV"). Mobile hamburger. Active link detection |
| `unsaved-changes-guard.tsx` | Functional | beforeunload listener when isDirty=true. Renders null |

### `components/landing/` — Marketing (15+ files)

Atoms (Logo, MaterialIcon, GradientText, etc.), Molecules (FeatureCard, StatBadge, TrustLogo, etc.), Organisms (HeroSection, TrustSection, ProductTabSwitcher, FeaturesGrid, CTASection), Templates (MarketingTemplate). All functional, marketing-only.

### `components/auth/` — Auth Forms

LoginForm, RegisterForm, CheckEmailCard, PasswordResetForm, SetPasswordForm. All UI scaffolds — no auth logic implemented.

### `components/{atoms,molecules,organisms,templates}/` — Legacy Dashboard (~36 files)

Prototype dashboard components (pre-Zustand). Includes CarrierBadge, CoverageSlider, IntakeField, CarrierTableRow, QuoteEngineHeader, MarketComparisonTable, PersonalInfoCard, etc. Functional but superseded by `components/quote/` and `components/leads/`.

---

## 3. All Stores

### `lib/store/call-store.ts` — Call State (Ephemeral)

| Category | Fields |
|----------|--------|
| Connection | `isClientReady`, `callerNumber` |
| Active call | `activeCallId`, `activeLeadId`, `callState` (idle/connecting/ringing/active/held/ending/error), `callDirection` (inbound/outbound), `destinationNumber`, `inboundCallerNumber`, `callStartedAt`, `callDuration` |
| Controls | `isMuted`, `isOnHold` |
| Transcript | `transcript: TranscriptEntry[]`, `coachingHints: CoachingHint[]` |
| Error | `error: string \| null` |

**Key actions:** `setCallConnecting()`, `setCallActive()`, `setInboundRinging()`, `tickDuration()`, `addTranscriptEntry()`, `replaceInterimEntry()`, `addCoachingHint()`, `resetCall()`
**Computed:** `callDurationFormatted()` (MM:SS), `isCallActive()`, `canDial()`
**Persistence:** None

### `lib/store/lead-store.ts` — Leads + Quote Session (Supabase-persisted)

| Category | Fields |
|----------|--------|
| Leads | `leads: Lead[]`, `activeLead`, `isLoading`, `dirtyFields: Set<string>` |
| Quote session | `intakeData`, `quoteResponse`, `selectedCarrierIds: Set<string>`, `coverageAmount`, `termLength`, `isQuoteLoading`, `autoFillVersion` |
| Persistence | `isSaving`, `lastSaveError` |

**Key actions:** `setActiveLead()`, `updateActiveLead()`, `markFieldDirty()`, `fetchQuotes()` (POST /api/quote + auto-save), `applyAutoFill()` (skips dirty fields), `switchToLead()` (restores quote history), `hydrateLeads()`, `hydrateLead()`, `saveActiveLead()`, `persistEnrichment()`, `persistQuote()`
**Persistence:** Supabase via server actions (background auto-persist for enrichment + quotes)

### `lib/store/ui-store.ts` — Layout State (Ephemeral)

| Fields | Description |
|--------|-------------|
| `activeView` | "list" / "detail" / "quote" |
| `leftPanelOpen`, `centerPanelOpen`, `rightPanelOpen` | Panel visibility |
| `panelSizes` | `{ left: 30, center: 45, right: 25 }` (percentages) |

**Persistence:** None

### `lib/store/commission-store.ts` — Commission Settings (localStorage)

| Fields | Description |
|--------|-------------|
| `commissions: CarrierCommission[]` | Per-carrier overrides (11 carriers pre-populated) |
| `defaultFirstYearPercent` | Fallback FY% (default: 75) |
| `defaultRenewalPercent` | Fallback RN% (default: 5) |

**Key actions:** `setCarrierCommission()`, `removeCarrierCommission()`, `getCommissionRates()` (returns custom or defaults + isCustom flag), `setDefaults()`
**Persistence:** localStorage via Zustand `persist` middleware, key: `"ensurance-commission-settings"`

---

## 4. All Types

### `lib/types/carrier.ts`
- `ProductType` = "term" | "wholeLife" | "finalExpense" | "iul" | "accidental"
- `AmBestRating` = "A++" | "A+" | "A" | "A-" | "B++"
- `Product` — name, type, ageRange, faceAmountRange, conversionAge, isSimplifiedIssue, hasROP, gradedPeriod
- `TobaccoRules` — cigarettes, cigars, vaping, smokeless, nrt, marijuana, quitLookback, keyNote
- `DUIRule` — rule (condition), result (outcome)
- `OperationalInfo` — eSign, eSignNote, declinesReported, phoneInterview, telesales, payments
- `Carrier` — id, name, abbr, color, amBest, amBestLabel, yearFounded, products[], tobacco, livingBenefits, dui, operational, medicalHighlights{}, statesNotAvailable[]

### `lib/types/quote.ts`
- `Gender` = "Male" | "Female"
- `TobaccoStatus` = "non-smoker" | "smoker"
- `TermLength` = 10 | 15 | 20 | 25 | 30 | 35 | 40
- `HealthIndicators` — bloodPressure?, ldl?, bmi?, preExistingConditions?
- `QuoteRequest` — name, age, gender, state, coverageAmount, termLength, tobaccoStatus, healthIndicators?, medicalConditions?, medications?, duiHistory?, yearsSinceLastDui?
- `CarrierQuote` — carrier, product, monthlyPremium, annualPremium, matchScore (0-99), isEligible, ineligibilityReason?, isBestValue, features[]
- `QuoteResponse` — quotes[], clientSummary, totalCarriersChecked, eligibleCount, timestamp

### `lib/types/ai.ts`
- `ProactiveInsight` — id, type (warning/tip/info), title, body
- `ProactiveInsightsResponse` — insights[]
- `EnrichmentResult` — 80+ fields: identity, location, employment, income, education, skills, contact, social, metadata
- `EnrichmentAutoFillData` — firstName?, lastName?, age?, gender?, state?
- `EnrichmentResponse` — success, data?, error?
- 10+ sub-types: EnrichmentStreetAddress, EnrichmentExperience, EnrichmentEducation, EnrichmentProfile, etc.

### `lib/types/lead.ts`
- `Lead` — id, agentId, firstName, lastName, email, phone, state, age, gender, tobaccoStatus, medicalConditions[], duiHistory, yearsSinceLastDui, coverageAmount, termLength, source, rawCsvData, enrichment?, quoteHistory[], createdAt, updatedAt
- `LeadQuoteSnapshot` — id, request (QuoteRequest), response (QuoteResponse), createdAt

### `lib/types/call.ts`
- `CallState` = "idle" | "connecting" | "ringing" | "active" | "held" | "ending" | "error"
- `TelnyxConfig` — token, callerNumber
- `TranscriptSpeaker` = "agent" | "client"
- `TranscriptWord` — word, start, end, confidence
- `TranscriptEntry` — id, speaker, text, timestamp, isFinal, words[]
- `CoachingHintType` = "tip" | "warning" | "info"
- `CoachingHint` — id, type, text, timestamp, confidence (0-1), relatedCarriers[]
- `CallLogEntry` — id, leadId, direction, provider, providerCallId?, durationSeconds?, recordingUrl?, transcriptText?, aiSummary?, coachingHints[], startedAt?, endedAt?

### `lib/types/commission.ts`
- `CarrierCommission` — carrierId, carrierName, firstYearPercent (0-150), renewalPercent (0-25)
- `CommissionSettings` — commissions[], defaultFirstYearPercent, defaultRenewalPercent
- `CommissionEstimate` — firstYear, renewal (per year), fiveYearTotal

### `lib/types/database.ts` + `lib/types/database.generated.ts`
- Auto-generated Supabase types (Database, Json, Tables, TablesInsert, TablesUpdate)
- Domain aliases: `LeadSource`, `CallDirection`, `CallProvider`
- Stricter row types: `LeadRow`, `EnrichmentRow`, `QuoteRow`, `CallLogRow`, `CoachingHintJson`
- Insert/Update variants for each table

---

## 5. All Engine Files

### `lib/engine/eligibility.ts` — PERMANENT
Deterministic eligibility checks via if/else + lookup tables.

| Function | Description |
|----------|-------------|
| `checkEligibility(carrier, age, state, coverage, term, options?)` | State availability -> term products -> age range -> face amount -> DUI. Returns `{ isEligible, ineligibilityReason?, matchedProduct }` |
| `checkMedicalEligibility(carrier, conditionIds[])` | Returns status per condition: accepted/review/declined/unknown |
| `checkDUIEligibility(carrier, duiHistory, yearsSinceLastDui)` | Returns `{ isAccepted, carrierRule, carrierResult }` |
| `getStateAbbreviation(state)` | "California" -> "CA" |

### `lib/engine/match-scoring.ts` — PERMANENT
Proprietary 0-99 scoring algorithm.

| Factor | Points |
|--------|--------|
| Base | 70 |
| AM Best A++/A+ | +8 |
| AM Best A | +5 |
| AM Best A- | +3 |
| e-Sign available | +4 |
| ROP available | +2 |
| Short tobacco lookback (non-smoker) | +3 |
| Foresters vaping bonus | +12 |
| State not available | -50 |
| Best price (rank 0) | +5 |
| Second best (rank 1) | +3 |
| Per medical decline | -8 |
| Per medical accept | +2 |

Clamped to [0, 99].

### `lib/engine/mock-pricing.ts` — TEMPORARY (replaced by Compulife API)
Formula: `(coverage / 1000) * baseRate * ageFactor * genderFactor * termFactor * tobaccoFactor`

- Base rates vary by carrier (LGA 0.11 lowest, Transamerica 0.16 highest)
- Age: `1 + (age - 25) * 0.035` (steeper for 60+)
- Gender: Male 1.0, Female 0.88
- Term: 10yr=0.7 to 40yr=1.6 (linear interpolation)
- Tobacco: non-smoker 1.0, smoker 2.4
- Annual = monthly * 11.5

### `lib/engine/commission-calc.ts` — PERMANENT
Pure function: `calculateCommission(annualPremium, fyPercent, renewalPercent)` -> `{ firstYear, renewal, fiveYearTotal }`

---

## 6. All Integrations

### OpenAI (GPT-4o-mini) — ACTIVE
| Endpoint | Usage | SDK |
|----------|-------|-----|
| `/api/chat` | Streaming chat | Vercel AI SDK (`streamText`) |
| `/api/chat/proactive` | 2-4 insight cards | OpenAI SDK (JSON mode) |
| `/api/coaching` | Real-time coaching hints (5s timeout) | OpenAI SDK (JSON mode) |
| `/api/call-summary` | 3-sentence post-call summary | Vercel AI SDK (`generateText`) |

### Telnyx (WebRTC Calling) — ACTIVE
| Component | Description |
|-----------|-------------|
| `/api/telnyx/token` | Two-step credential + JWT flow |
| `/api/telnyx/credentials` | SIP login/password for persistent inbound registration |
| `lib/telnyx/client.ts` | Singleton TelnyxRTC wrapper (token or SIP auth) |
| `lib/telnyx/connect.ts` | 15s timeout connection promise |
| `lib/telnyx/notification-handler.ts` | Maps TelnyxRTC events -> call-store |
| `lib/telnyx/inbound-handler.ts` | Accept/decline with audio track polling (15 retries) |
| `lib/telnyx/audio-capture.ts` | Web Audio PCM capture, downsample 48kHz->16kHz |
| `lib/telnyx/post-call-save.ts` | Format transcript + AI summary + save to DB (3 retries) |
| `lib/telnyx/active-call.ts` | Module-level TelnyxCall reference (non-serializable) |

### Deepgram (Live Transcription) — ACTIVE
| Component | Description |
|-----------|-------------|
| `lib/deepgram/sessions.ts` | Server-side globalThis session map (max 10), Nova-3, diarization, 30s idle timeout |
| `lib/deepgram/stream.ts` | Client-side SSE + audio POST chunking + call-store dispatch. 3 retries with backoff |
| `/api/transcribe/stream` | Long-lived SSE (Node.js runtime) |
| `/api/transcribe/audio` | Base64 PCM forwarding (max 1MB) |
| **Cost** | $0.0077/min |

### People Data Labs (Enrichment) — ACTIVE
| Component | Description |
|-----------|-------------|
| `/api/enrichment` | v5 person enrichment, 80+ fields, age estimation fallback |
| 10 categories | Identity, location, employment, income, education, skills, contact, social, metadata, data quality |

### Supabase (PostgreSQL) — ACTIVE (no auth)
| Component | Description |
|-----------|-------------|
| `lib/supabase/server.ts` | Service role key (bypasses RLS) |
| `lib/supabase/client.ts` | Anon key (browser) |
| `lib/supabase/leads.ts` | CRUD + enrichment + quote persistence |
| `lib/supabase/calls.ts` | Call log CRUD + bulk counts |
| `lib/actions/leads.ts` | Zod-validated server actions wrapping data layer |
| **Project** | `orrppddoiumpwdqbavip` (us-west-2) |

---

## 7. Environment Variables

| Variable | Service | Scope | Required | Description |
|----------|---------|-------|----------|-------------|
| `OPENAI_API_KEY` | OpenAI | Server | Yes | GPT-4o-mini for chat, insights, coaching, summaries |
| `PEOPLEDATALABS_API_KEY` | PDL | Server | Yes | Person enrichment (80+ fields) |
| `DEEPGRAM_API_KEY` | Deepgram | Server | Yes | Nova-3 live transcription ($0.0077/min) |
| `TELNYX_API_KEY` | Telnyx | Server | Yes | WebRTC token generation + SIP credentials |
| `TELNYX_CONNECTION_ID` | Telnyx | Server | Yes | Credential connection for call routing |
| `TELNYX_CALLER_NUMBER` | Telnyx | Server | Yes | Outbound caller ID (E.164 format) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Public | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Public | Yes | Supabase anonymous key (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Server | Yes | Supabase service role (bypasses RLS) |
| `SUPABASE_ACCESS_TOKEN` | Supabase | Dev | No | CLI-only for type generation |

---

## 8. Known Gaps

### Authentication (Phase 5)
- Auth pages are UI scaffolds only — no Supabase Auth integration
- All API endpoints have no auth checks (marked `TODO(P5)`)
- Telnyx token endpoint grants live calling access without authentication
- Hardcoded `DEV_AGENT_ID` used as agent identifier (`lib/constants.ts`)
- No RLS policies on any Supabase table
- Commission data in localStorage (not user-scoped)

### Compulife API (Phase 5)
- `mock-pricing.ts` is formula-based placeholder
- Real carrier pricing requires Compulife API ($480/yr)
- When integrated, will return carriers not in intelligence database (those use default commission rates)

### Missing Features
- **Rx screening**: Referenced in carrier tobacco notes ("Rx check on SI products") but not implemented
- **Ringba inbound**: Call logs support `provider: "ringba"` but no Ringba integration exists
- **Rate limiting**: No rate limiting on any API endpoint
- **Recording**: `recording_url` column exists in call_logs but no recording implementation
- **Product tabs**: Quick quote shows Final Expense, Term Life, IUL, Annuities tabs but only Term Life is active
- **Living benefits comparison**: Data exists in carriers but not surfaced in quote results grid (only in detail modal)
- **Consent mechanism**: No call recording consent (required by German/EU law per compliance rules)
- **Data retention**: No enforcement of retention policies (audit logs, consent records)

### Technical Debt
- Legacy `dashboard/` route and `components/{atoms,molecules,organisms,templates}/` (~36 components) superseded by quote/leads architecture
- `@base-ui/react` and `radix-ui` both installed (potential overlap with shadcn)
- Deepgram sessions stored in `globalThis` (lost on serverless cold start — works in dev, fragile in production)
- Agent avatar hardcoded as "MV" — no user profile system

---

## 9. Database Schema

**Supabase Project:** `orrppddoiumpwdqbavip` (us-west-2)
**Tables:** 4 | **Views:** 0 | **Functions:** 0 | **RLS:** None

### `leads`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `agent_id` | text | No | | Hardcoded DEV_AGENT_ID until auth |
| `first_name` | text | Yes | | |
| `last_name` | text | Yes | | |
| `email` | text | Yes | | |
| `phone` | text | Yes | | |
| `state` | text | Yes | | Two-letter abbreviation |
| `age` | int4 | Yes | | |
| `gender` | text | Yes | | Domain: "Male" / "Female" |
| `tobacco_status` | text | Yes | | Domain: "non-smoker" / "smoker" |
| `medical_conditions` | text[] | Yes | | Array of condition IDs |
| `dui_history` | bool | Yes | | |
| `years_since_last_dui` | int4 | Yes | | |
| `coverage_amount` | int4 | Yes | | Dollars |
| `term_length` | int4 | Yes | | Years |
| `source` | text | No | | Domain: "csv" / "ringba" / "manual" / "api" |
| `raw_csv_data` | jsonb | Yes | | Original CSV row |
| `created_at` | timestamptz | No | now() | |
| `updated_at` | timestamptz | No | auto-updated | |

### `enrichments`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `lead_id` | uuid | No | | FK -> leads.id |
| `pdl_data` | jsonb | No | | Full PDL enrichment object |
| `enriched_at` | timestamptz | No | now() | |

### `quotes`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `lead_id` | uuid | No | | FK -> leads.id |
| `request_data` | jsonb | No | | QuoteRequest payload |
| `response_data` | jsonb | No | | QuoteResponse with all carriers |
| `created_at` | timestamptz | No | now() | |

### `call_logs`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `lead_id` | uuid | No | | FK -> leads.id |
| `direction` | text | No | | "inbound" / "outbound" |
| `provider` | text | No | | "telnyx" / "ringba" |
| `provider_call_id` | text | Yes | | External call ID |
| `duration_seconds` | int4 | Yes | | |
| `recording_url` | text | Yes | | Not implemented yet |
| `transcript_text` | text | Yes | | Formatted transcript |
| `ai_summary` | text | Yes | | 3-sentence GPT summary |
| `coaching_hints` | jsonb | Yes | | Array of CoachingHintJson |
| `started_at` | timestamptz | Yes | | |
| `ended_at` | timestamptz | Yes | | |

---

## 10. Dependencies

### Framework & Runtime
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.1.6 | App Router framework |
| `react` | 19.2.3 | UI framework |
| `react-dom` | 19.2.3 | DOM rendering |
| `typescript` | 5 | Language |

### UI & Styling
| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | 4 | Utility-first CSS (OKLCH color space) |
| `@tailwindcss/postcss` | 4 | PostCSS plugin |
| `shadcn` | 3.8.4 | Component CLI (56 components installed) |
| `class-variance-authority` | 0.7.1 | Component variants |
| `clsx` | 2.1.1 | Classname utility |
| `tailwind-merge` | 3.4.0 | Smart Tailwind class merging |
| `lucide-react` | 0.563.0 | Icon library |
| `@base-ui/react` | 1.1.0 | Unstyled accessible components |
| `radix-ui` | 1.4.3 | UI primitives |
| `next-themes` | 0.4.6 | Dark mode |

### Forms & Validation
| Package | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | 7.71.1 | Form state management |
| `@hookform/resolvers` | 5.2.2 | Validation resolvers |
| `zod` | 4.3.6 | Schema validation |
| `cmdk` | 1.1.1 | Command/combobox |
| `input-otp` | 1.4.2 | OTP input |

### Layout & Display
| Package | Version | Purpose |
|---------|---------|---------|
| `react-resizable-panels` | 4 | Resizable three-column layout |
| `recharts` | 2.15.4 | Charts (dashboard) |
| `react-day-picker` | 9.13.2 | Date picker |
| `embla-carousel-react` | 8.6.0 | Carousel |
| `vaul` | 1.1.2 | Drawer/dialog |
| `sonner` | 2.0.7 | Toast notifications |
| `date-fns` | 4.1.0 | Date utilities |

### State Management
| Package | Version | Purpose |
|---------|---------|---------|
| `zustand` | 5.0.11 | 4 stores: call, lead, UI, commission |

### AI / LLM
| Package | Version | Purpose |
|---------|---------|---------|
| `ai` | 6.0.86 | Vercel AI SDK (streamText, generateText) |
| `@ai-sdk/openai` | 3.0.29 | OpenAI provider |
| `@ai-sdk/react` | 3.0.88 | React hooks (useChat) |
| `openai` | 6.22.0 | OpenAI SDK (insights, coaching) |

### Calling & Transcription
| Package | Version | Purpose |
|---------|---------|---------|
| `@telnyx/webrtc` | 2.25.18 | TelnyxRTC client (outbound + inbound) |
| `@deepgram/sdk` | 4.11.3 | Deepgram Nova-3 live transcription |

### Database
| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | 2.97.0 | Supabase client |
| `@supabase/ssr` | 0.8.0 | SSR adapter |

### Data Processing
| Package | Version | Purpose |
|---------|---------|---------|
| `papaparse` | 5.5.3 | CSV parsing |

### Custom Hooks
| Hook | File | Purpose |
|------|------|---------|
| `useIsMobile()` | `hooks/use-mobile.ts` | Viewport < 768px detection via matchMedia |
| `useCoachingInterval()` | `hooks/use-coaching-interval.ts` | 30s polling: client speech -> POST /api/coaching -> add hints. Max 10/call, 15s cooldown |

---

## Architecture Diagram

```
Browser                          Server                          External
-------                          ------                          --------
TopNav                           /api/quote                      Compulife (future)
  |                                |
LeadList ----hydrate-----------> /api/ (Supabase)                Supabase (PostgreSQL)
  |                                |
LeadDetail                       /api/enrichment  ------------> People Data Labs v5
  |                                |
QuoteWorkspace                   /api/chat  ---------------------> OpenAI GPT-4o-mini
  |-- IntakeForm                 /api/chat/proactive  -----------> OpenAI GPT-4o-mini
  |-- CarrierResults             /api/coaching  -----------------> OpenAI GPT-4o-mini
  |-- AiAssistantPanel           /api/call-summary  -------------> OpenAI GPT-4o-mini
       |                           |
       TranscriptView            /api/transcribe/stream  --------> Deepgram Nova-3
       |                         /api/transcribe/audio  ---------> Deepgram Nova-3
       CallNotificationHandler   /api/telnyx/token  -------------> Telnyx API v2
                                 /api/telnyx/credentials  -------> Telnyx API v2
                                   |
                                 TelnyxRTC WebSocket  -----------> Telnyx SIP/SRTP

Stores: call-store (ephemeral) | lead-store (Supabase) | ui-store (ephemeral) | commission-store (localStorage)
```

---

**Totals:** 86 components | 13 API endpoints | 4 Zustand stores | 4 database tables | 5 external integrations | 41 dependencies
