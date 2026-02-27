# Ensurance Codebase Audit

**Date:** 2026-02-26
**Branch:** `feature/lukas`
**Last Commit:** Structured carrier intelligence integration (38 carriers, medical conditions, Rx exclusions, combination declines)

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
| `/auth/login` | `app/auth/login/page.tsx` | Functional | LoginForm: signInWithPassword, error mapping, redirect param |
| `/auth/register` | `app/auth/register/page.tsx` | Functional | RegisterForm: signUp with name/license metadata, emailRedirectTo |
| `/auth/confirm` | `app/auth/confirm/page.tsx` | Functional | CheckEmailCard: reads email/type from URL params, resend with correct type |
| `/auth/password` | `app/auth/password/page.tsx` | Functional | PasswordResetForm: resetPasswordForEmail, redirect to confirm |
| `/auth/password/reset` | `app/auth/password/reset/page.tsx` | Functional | SetPasswordForm: updateUser for new password, redirect to /leads |
| `/auth/callback` | `app/auth/callback/route.ts` | Functional | Exchange auth code for session, validated redirect (relative paths only) |
| `/dashboard` | `app/dashboard/page.tsx` | Legacy | Prototype dashboard (pre-Zustand). QuoteEngineHeader + CoverageTermPanel + UnderwritingPanel + MarketComparisonTable |
| `/dashboard/profile` | `app/dashboard/profile/page.tsx` | Scaffold | PersonalInfoCard + ProfessionalInfoCard |
| `/dashboard/payment` | `app/dashboard/payment/page.tsx` | Prototype | OrderSummaryCard + PaymentMethodForm (step 2/3) |
| `/dashboard/payment/success` | `app/dashboard/payment/success/page.tsx` | Prototype | ConfirmationDetailsCard + WhatsNextStepper (step 3/3) |
| `/dashboard/payment/cancel` | `app/dashboard/payment/cancel/page.tsx` | Prototype | ErrorDetailsCard + retry options (step 2/3) |
| `/leads` | `app/leads/page.tsx` | Functional | Lead list CRM table with search, filter, sort, CSV upload, manual add |
| `/leads/[id]` | `app/leads/[id]/page.tsx` | Functional | Lead detail: QuoteWorkspace + CallLogViewer + ActiveCallBar + save/dirty tracking |
| `/quote` | `app/quote/page.tsx` | Functional | Anonymous quick-quote. Clears activeLead, renders QuoteWorkspace. Product tabs (only Term Life active) |
| `/settings` | `app/settings/page.tsx` | Functional | Redirects to `/settings/profile` |
| `/settings/profile` | `app/settings/profile/page.tsx` | Functional | ProfileSettingsClient: name/email/license fields, saves to Supabase user_metadata |
| `/settings/commissions` | `app/settings/commissions/page.tsx` | Functional | CommissionSettingsClient: default rates + per-carrier commission table (Supabase-synced) |
| `/settings/integrations` | `app/settings/integrations/page.tsx` | Functional | IntegrationsSettingsClient: AI Voice Agents card with active count badge + "Manage Agents" link, Coming Soon cards (Compulife, SendGrid, PDL) |
| `/settings/[section]` | `app/settings/[section]/page.tsx` | Placeholder | Dynamic route for 6 sections: licenses, business, billing, team, preferences, security. "Coming Soon" cards with planned features |
| `/agents` | `app/agents/page.tsx` | Functional | Tabbed interface: "My Agents" (AgentsListClient card grid) + "Usage" (UsageDashboard stats + table) |
| `/agents/[id]` | `app/agents/[id]/page.tsx` | Functional | Agent detail: config form, call history with transcript viewer, delete with confirmation |

### Layouts

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/layout.tsx` | Root: Inter + Geist Mono fonts, Sonner toasts, CallNotificationHandler (global), IncomingCallBanner (global) |
| `/auth/*` | `app/auth/layout.tsx` | Auth wrapper: logo header, centered content (max-w-lg), gradient bg, footer |
| `/leads/*` | `app/leads/layout.tsx` | TopNav + full-height flex |
| `/quote/*` | `app/quote/layout.tsx` | TopNav + full-height flex |
| `/settings/*` | `app/settings/layout.tsx` | TopNav + sidebar (9 nav items) + centered content area (max-w-3xl) |
| `/agents/*` | `app/agents/layout.tsx` | TopNav + full-height flex |

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
| `/api/settings` | GET/PUT | Functional | Agent commission settings: GET (fetch or defaults) + PUT (Zod-validated upsert). Auth-guarded, rate limited (20/min) |
| `/api/ai-agent` | GET | Functional | AI agent status (enabled, assistantId, hasAssistant). Auth-guarded, rate limited |
| `/api/ai-agent` | POST | Functional | Create or update Telnyx AI assistant. Builds insurance prompt, sets webhook URL. Auth-guarded |
| `/api/ai-agent` | DELETE | Functional | Delete Telnyx AI assistant + clear local reference. Auth-guarded |
| `/api/ai-agent/toggle` | PUT | Functional | Enable/disable AI agent. Validates assistant exists on Telnyx before enabling |
| `/api/ai-agent/webhook` | POST | Functional | Telnyx AI webhook receiver. No user auth (called by Telnyx). Zod-validated payload, stores in ai_agent_calls with ai_agent_id. Phase 8: transcript storage + stats increment. Phase 7 backward compat via agent_settings fallback |
| `/api/agents` | GET | Functional | List all AI agents for current user. Auth-guarded, rate limited (20/min) |
| `/api/agents` | POST | Functional | Create AI agent: DB row + Telnyx assistant. On Telnyx failure, saves with status 'error'. Zod-validated (name, description, phone, greeting, voice) |
| `/api/agents/[id]` | GET | Functional | Agent detail + recent calls + stats. Ownership verified via agent_id |
| `/api/agents/[id]` | PUT | Functional | Update agent config in DB + sync to Telnyx if name/greeting/voice changed |
| `/api/agents/[id]` | DELETE | Functional | Delete Telnyx assistant (ignore errors) then delete DB row |
| `/api/agents/[id]/transcripts/[callId]` | GET | Functional | Ordered transcript messages for a call. Ownership verified via agent lookup |
| `/api/agents/[id]/transcripts` | POST | Functional | Bulk store transcript messages (internal, auth via INTERNAL_API_SECRET). Zod-validated |
| `/api/agents/usage` | GET | Functional | Aggregated usage stats across all agents (total calls, minutes, per-agent breakdown) |
| `/api/telnyx/token` | POST | Functional | Two-step: create telephony credential -> generate JWT for TelnyxRTC client |
| `/api/telnyx/credentials` | GET | Functional | Return SIP login/password for persistent inbound WebRTC registration |

---

## 2. All Components

### `components/quote/` — Quote Engine (8 files)

| File | Status | Description |
|------|--------|-------------|
| `intake-form.tsx` | Functional | Left panel form: name, age, gender, state, coverage slider (18 presets $100K-$10M), term, tobacco, medical conditions, medications, DUI. Auto-fill respects dirty fields. Debounced 500ms submit. Agent card with demo user |
| `carrier-results.tsx` | Functional | Two-tier grid: Best Matches (top 3) + collapsible Others. ScrollableTable wrapper with CSS scroll-shadow gradients (min-width 820px). Feature pills show 2 + "+N more". Columns: Carrier, Product, Rating, Monthly, Annual, Commission, Actions. Sort by matchScore/premium/amBest/commission. Commission from commission-store, highest highlighted green |
| `carrier-detail-modal.tsx` | Functional | Three-tab dialog: Pricing (premiums + commission breakdown + features + product details), Underwriting (tobacco rules + DUI + medical eligibility), Company (AM Best + operational + state availability + living benefits) |
| `carrier-comparison.tsx` | Functional | CompareFloatingButton (visible when 2+ selected) + ComparisonSheet: 16-row side-by-side table for selected carriers |
| `ai-assistant-panel.tsx` | Functional | Two modes: Call Mode (CallModeHeader + InlineCallControls + TranscriptView) and Chat Mode (streaming chat + proactive insights + enrichment trigger). Vercel AI SDK useChat(). Auto-switches on call connect |
| `lead-enrichment-popover.tsx` | Functional | Search by name/email/phone -> PDL API -> 10-section accordion results -> auto-fill form -> "Send to AI" button |
| `medical-history-section.tsx` | Functional | Collapsible: searchable conditions combobox (18 conditions), removable badges, medications input, DUI toggle with years input |
| `quote-workspace.tsx` | Functional | Three-column resizable layout (ResizablePanelGroup): IntakeForm | Coverage+Term+CarrierResults | AiAssistantPanel. All three panels collapsible with context bars (icons, labels, expand buttons). Center panel minimize toggle with coverage/term/eligible-count badge. Panel sizes persist in UIStore. Auto-expand center on "Get Quotes". Keyboard shortcuts (ESC/ALT+S/ALT+Q) |

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
| `call-log-viewer.tsx` | Functional | Collapsible "Call History" for lead detail. Fetches from API. Shows duration, AI summary (2-line clamp), "AI Agent" badge for AI-handled calls, expandable details, "View Full Transcript" |
| `ring-sound.tsx` | Functional | Web Audio 440Hz double-beep (2 beeps every 2s). Renders null |
| `remote-audio.tsx` | Functional | `<audio autoPlay>` element with MediaStream from remote party |
| `dtmf-keypad.tsx` | Functional | Popover 3x4 grid (1-9, *, 0, #) with letter sub-labels. Calls sendDTMF() |

### `components/leads/` — Lead CRM (9 files)

| File | Status | Description |
|------|--------|-------------|
| `lead-list.tsx` | Functional | Sortable table with search/filter (source incl. AI Agent, state, status). CSV upload + manual add buttons. Status filter pills. Source labels (AI Agent = violet). Hydrates from Supabase. Fetches call counts. Click row -> /leads/[id] |
| `lead-detail-client.tsx` | Functional | Header (breadcrumb, status dropdown, AI Agent/Enriched/Quotes badges, Call/Save buttons) + AI info banner (for ai_agent source) + ActiveCallBar + QuoteWorkspace + CallLogViewer. Hydrates lead from Supabase if not in store. UnsavedChangesGuard |
| `lead-details-section.tsx` | Functional | 4 collapsible sections: Follow-Up (scheduler + indicator), Personal Details, Financial & Professional, Notes + Activity Timeline |
| `lead-status-badge.tsx` | Functional | Color-coded badges for 6 statuses + LEAD_STATUSES array + getStatusLabel() |
| `follow-up-scheduler.tsx` | Functional | Date/time picker + FollowUpIndicator (red=overdue, amber=today, blue=upcoming) + quick-schedule popover |
| `activity-timeline.tsx` | Functional | Chronological feed with type-specific icons/colors, AI agent call detection, relative timestamps, load more pagination (20/page) |
| `csv-upload.tsx` | Functional | 4-step dialog wizard: Upload (drag-drop) -> Map (auto-detect columns) -> Preview -> Done. Batch create via server action |
| `column-mapper.tsx` | Functional | Dropdown list: CSV column -> Lead field mapping. Mapped count badge |
| `import-preview.tsx` | Functional | Preview table of mapped rows before import |
| `add-lead-dialog.tsx` | Functional | Dialog form: first/last name, email, phone, state. Creates lead via server action |

### `components/settings/` — Agent Settings (7 files)

| File | Status | Description |
|------|--------|-------------|
| `settings-sidebar.tsx` | Functional | 9-item vertical nav: Profile, Licenses, Business Info, Integrations, Billing, Team, Preferences, Security, Commissions. Active link highlighting. Responsive |
| `settings-page-header.tsx` | Functional | Reusable title + description header for all settings pages |
| `profile-settings-client.tsx` | Functional | Profile form: full name, email (read-only), license number. React Hook Form + Zod validation. Saves to Supabase user_metadata via auth.updateUser() |
| `settings-placeholder.tsx` | Functional | Reusable "Coming Soon" card: icon circle, title, description, Clock badge, planned features bullet list. Used by 6 placeholder sections |
| `integrations-settings-client.tsx` | Functional | AI Voice Agents card: active agent count badge + "Manage Agents" link to /agents. Coming Soon cards: Compulife, SendGrid, PDL |
| `commission-settings-client.tsx` | Functional | Two sections: Default Rates (FY%/RN%) + Per-Carrier Table (11 carriers sorted A-Z). Debounced server sync (1s). Loads from Supabase on mount |
| `commission-table-row.tsx` | Functional | Inline-editable row: carrier badge + AM Best + FY% input + RN% input + "Custom" badge + Reset button. Clamped 0-150 FY, 0-25 RN |

### `components/agents/` — Agent Management (6 files)

| File | Status | Description |
|------|--------|-------------|
| `agents-page-client.tsx` | Functional | Tabbed interface (shadcn Tabs): "My Agents" tab (AgentsListClient) + "Usage" tab (UsageDashboard) |
| `agents-list-client.tsx` | Functional | Card grid (1/2/3 cols responsive). AgentCard: Bot icon, name, description, status badge, phone, stats row, last call relative time. Toggle switch, empty state, error state with retry, skeleton loading. Cards link to /agents/[id] |
| `create-agent-dialog.tsx` | Functional | Dialog: name (default "Insurance Intake Agent"), description, phone (E.164), voice (4 Telnyx options). Posts to /api/agents, handles warnings (Telnyx failure), form reset on success |
| `agent-detail-client.tsx` | Functional | DetailHeader (back nav, name, status badge, delete with AlertDialog). ConfigSection: name, description, phone, greeting, voice, status toggle, dirty tracking, save via PUT. CallHistorySection: expandable call rows with caller info, status badges, TranscriptViewer |
| `transcript-viewer.tsx` | Functional | Lazy-loads via GET /api/agents/[id]/transcripts/[callId]. Chat-style: assistant (left, violet), user (right, blue), system (centered italic). Timestamps, loading/error/empty states |
| `usage-dashboard.tsx` | Functional | Summary cards (Total Calls, Total Minutes, Est. Cost with tooltip). Per-agent sortable table (name, status, calls, minutes, cost). Time range selector (UI only). TELNYX_AI_COST_PER_MINUTE = $0.05. Empty state, error state, skeleton |

### `components/navigation/` — Navigation (2 files)

| File | Status | Description |
|------|--------|-------------|
| `top-nav.tsx` | Functional | Logo (links to /leads) + Leads/Quick Quote/Agents/Settings links + auth user avatar (initials + name from useAuth). DropdownMenu with Settings/Sign out. Active link highlighting. Mobile hamburger |
| `unsaved-changes-guard.tsx` | Functional | beforeunload listener when isDirty=true. Renders null |

### `components/landing/` — Marketing (15+ files)

Atoms (Logo, MaterialIcon, GradientText, etc.), Molecules (FeatureCard, StatBadge, TrustLogo, etc.), Organisms (HeroSection, TrustSection, ProductTabSwitcher, FeaturesGrid, CTASection), Templates (MarketingTemplate). All functional, marketing-only.

### `components/auth/` — Auth Forms (7 files)

| File | Status | Description |
|------|--------|-------------|
| `auth-provider.tsx` | Functional | AuthProvider context + useAuth() hook. Wraps app, provides user/session/loading state |
| `login-form.tsx` | Functional | signInWithPassword, error mapping (invalid credentials, email not confirmed), redirect param preservation, validated redirect (relative paths only) |
| `register-form.tsx` | Functional | signUp with emailRedirectTo, name/license metadata, redirect to confirm page |
| `check-email-card.tsx` | Functional | Reads email/type from URL params, resend with correct type detection (signup vs recovery) |
| `password-reset-form.tsx` | Functional | resetPasswordForEmail, redirect to confirm with type=recovery |
| `set-password-form.tsx` | Functional | updateUser for new password, redirect to /leads |

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

### `lib/store/commission-store.ts` — Commission Settings (Supabase-persisted)

| Fields | Description |
|--------|-------------|
| `commissions: CarrierCommission[]` | Per-carrier overrides (11 carriers pre-populated) |
| `defaultFirstYearPercent` | Fallback FY% (default: 75) |
| `defaultRenewalPercent` | Fallback RN% (default: 5) |
| `isLoaded` | Whether initial server fetch has completed |

**Key actions:** `setCarrierCommission()`, `removeCarrierCommission()`, `getCommissionRates()` (returns custom or defaults + isCustom flag), `setDefaults()`, `loadFromServer()` (fetches from Supabase, migrates localStorage), `saveToServer()` (debounced 1s PUT to /api/settings)
**Persistence:** Supabase agent_settings table via API (replaces localStorage)

---

## 4. All Types

### `lib/types/carrier.ts`
- `ProductType` = "term" | "wholeLife" | "finalExpense" | "iul" | "accidental" | "guaranteedIssue"
- `AmBestRating` = "A++" | "A+" | "A" | "A-" | "B++" | "NR"
- `Product` — name, type, ageRange, faceAmountRange, conversionAge, isSimplifiedIssue, hasROP, gradedPeriod, parameters?
- `ProductParameters` — issueAgeMin?, issueAgeMax?, faceAmountMin?, faceAmountMax?, availableTerms?, rateClasses?, ageCalculation?, conversionAgeMax?, bandBreakpoints?, policyFee?, notes?
- `TobaccoRules` — cigarettes, cigars, vaping, smokeless, nrt, marijuana, quitLookback, keyNote, quitLookbackMonths?
- `MedicalDecision` = "ACCEPT" | "DECLINE" | "CONDITIONAL" | "MODIFIED" | "STANDARD" | "REVIEW"
- `MedicalConditionRule` — condition, decision, lookbackMonths, conditions, rateClass, riderEligibility?, notes
- `CombinationDecline` — conditions[], decision, notes
- `PrescriptionAction` = "DECLINE" | "REVIEW" | "ACCEPT"
- `PrescriptionExclusion` — name, action, associatedCondition, notes
- `PrescriptionExclusions` — type, medications[], notes
- `LivingBenefitRider` — available, type?, cost?, trigger?, maxPercent?, maxAmount?, notes?
- `AccidentalDeathBenefit` — available, issueAges?, maxAmount?, notes?
- `OtherRider` — name, cost?, availability?, description?, notes?
- `LivingBenefitsDetail` — terminalIllness?, criticalIllness?, chronicIllness?, accidentalDeathBenefit?, otherRiders[], exclusionConditions?, notes?
- `DUIRule` — rule, result, lookbackYears?, maxIncidentsAllowed?, flatExtra?, specialRules?, declineTriggers?
- `OperationalInfo` — eSign, eSignNote?, declinesReported?, phoneInterview?, telesales?, payments?, underwritingType?, eApp?, paymentMethods?, commissionAdvance?, chargebackSchedule?
- `RateClassThresholds` — tobaccoFreeMonths?, bpMaxSystolic?, bpMaxDiastolic?, cholesterolMax?, cholesterolRatioMax?, bmiMin?, bmiMax?, duiFreeMonths?, familyHistory?, otherRequirements?, notes?
- `RateClassCriteria` — preferredPlus?, preferred?, standardPlus?, standard?, notes?
- `Carrier` — id, name, abbr, color, amBest, amBestLabel, yearFounded, products[], tobacco, livingBenefits, dui, operational, medicalHighlights{}, statesNotAvailable[], medicalConditions?[], combinationDeclines?[], prescriptionExclusions?, livingBenefitsDetail?, rateClassCriteria?, sourceDocuments?[], availableAllStates?, stateAvailabilityNotes?

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

### `lib/telnyx/ai-types.ts`
- `TelnyxAssistantCreateDto` — Full assistant creation payload
- `TelnyxAssistantUpdateDto` — Update + promote_to_main
- `TelnyxAssistant` — API response with id, name, model, system_message, tools, settings
- `TelnyxTool` — Function tool with url, method, headers, json_schema, dynamic_variables
- `TelnyxConversation` — Conversation record (id, assistant_id, status, telephony)
- `TelnyxTranscriptMessage` — role, content, created_at
- Voice, transcription, telephony, widget settings interfaces

### `lib/types/database.ts` + `lib/types/database.generated.ts`
- Auto-generated Supabase types (Database, Json, Tables, TablesInsert, TablesUpdate)
- Domain aliases: `LeadSource` (incl. "ai_agent"), `CallDirection`, `CallProvider`, `AiAgentStatus` ("active" | "inactive" | "error"), `TranscriptRole` ("assistant" | "user" | "system")
- Stricter row types: `LeadRow`, `EnrichmentRow`, `QuoteRow`, `CallLogRow`, `AgentSettingsRow` (incl. telnyx_ai fields), `AiAgentRow`, `AiAgentCallRow` (incl. ai_agent_id), `AiTranscriptRow`, `CoachingHintJson`
- Insert/Update variants for each table

---

## 5. All Engine Files

### `lib/engine/eligibility.ts` — PERMANENT
Deterministic eligibility checks via if/else + lookup tables.

| Function | Description |
|----------|-------------|
| `checkEligibility(carrier, age, state, coverage, term, options?)` | State availability -> term products -> age range -> face amount -> DUI. Returns `{ isEligible, ineligibilityReason?, matchedProduct }` |
| `checkMedicalEligibility(carrier, conditionIds[])` | Legacy: Returns status per condition: accepted/review/declined/unknown via medicalHighlights string matching |
| `checkStructuredMedicalEligibility(carrier, conditionIds[])` | Enhanced: Uses structured MedicalConditionRule[] when available, falls back to legacy. Returns `StructuredMedicalResult[]` with decision, lookbackMonths, rateClass, conditions, notes, source ("structured" or "legacy") |
| `checkPrescriptionScreening(carrier, medicationsInput)` | Screens comma-separated medications against carrier prescriptionExclusions. Returns matches where carrier flags medication as DECLINE or REVIEW |
| `checkCombinationDeclines(carrier, conditionIds[])` | Checks if client's selected conditions trigger multi-condition decline rules. Requires 2+ matching conditions from carrier.combinationDeclines |
| `checkDUIEligibility(carrier, duiHistory, yearsSinceLastDui)` | Returns `{ isAccepted, carrierRule, carrierResult }` |
| `getStateAbbreviation(state)` | "California" -> "CA" |

### `lib/engine/match-scoring.ts` — PERMANENT
Proprietary 0-99 scoring algorithm.

| Factor | Points |
|--------|--------|
| Base | 70 |
| AM Best A++/A+ | +15 |
| AM Best A | +12 |
| AM Best A- | +10 |
| AM Best B++ | +7 |
| AM Best NR | +0 |
| e-Sign available | +4 |
| ROP available | +2 |
| Short tobacco lookback (non-smoker) | +3 |
| Foresters vaping bonus | +12 |
| State not available | -50 |
| Best price (rank 0) | +5 |
| Second best (rank 1) | +3 |
| Build chart preferred | +2 |
| Living benefits present | +2 |
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

### Telnyx AI Assistants (Inbound Voice Agent) — ACTIVE
| Component | Description |
|-----------|-------------|
| `lib/telnyx/ai-types.ts` | Full TypeScript interfaces: TelnyxAssistantCreateDto, TelnyxAssistantUpdateDto, TelnyxAssistant, TelnyxTool, TelnyxConversation, TelnyxTranscriptMessage, voice/transcription/telephony/widget settings |
| `lib/telnyx/ai-service.ts` | Stateless API wrapper: telnyxAIRequest<T>() with retry on 429/network (exponential backoff). Exports: createAssistant, updateAssistant (POST not PATCH), getAssistant, deleteAssistant, getConversations, getTranscript |
| `lib/telnyx/ai-prompts.ts` | buildInsuranceIntakePrompt(agentName, agencyName?): goal-based voice prompt, 5 caller scenarios, NEVER rules (no advice/pricing), output format instructions |
| `lib/telnyx/ai-config.ts` | buildInsuranceAssistantConfig(): full TelnyxAssistantCreateDto with webhook tool, enabled_features: ['telephony'], no hangup tool. getAIAgentWebhookUrl(agentId, aiAgentId?) |
| `lib/telnyx/ai-lead-processor.ts` | processAICallToLead(): phone dedup, name parsing, callback preference parsing, notes building, call log + activity log creation |
| `lib/supabase/ai-agents.ts` | Multi-agent data layer: CRUD (listAgents, getAgent, getAgentByTelnyxAssistantId, createAgent, updateAgent, deleteAgent), stats (incrementAgentStats), transcripts (getTranscriptMessages, insertTranscriptMessages bulk), calls (getAgentCalls), usage (getAgentUsage with totals) |
| `/api/ai-agent` | GET/POST/DELETE: Phase 7 single-agent CRUD. Auth-guarded, rate limited (10/min) |
| `/api/ai-agent/toggle` | PUT: enable/disable with Telnyx validation |
| `/api/ai-agent/webhook` | POST: Telnyx webhook receiver. No user auth. Supports Phase 8 (ai_agent_id query param → ai_agents lookup) + Phase 7 fallback (agent_settings). Stores transcript messages, increments agent stats |
| `/api/agents` | GET/POST: Multi-agent CRUD. Create syncs to Telnyx. Auth-guarded, rate limited (20/min) |
| `/api/agents/[id]` | GET/PUT/DELETE: Agent detail, config update (syncs to Telnyx), delete. Ownership verified |
| `/api/agents/[id]/transcripts` | GET (by callId) / POST (bulk store). Message-level transcript storage |
| `/api/agents/usage` | GET: Aggregated usage stats across all agents |
| **Model** | `Qwen/Qwen3-235B-A22B` (Llama models output JSON that TTS reads literally) |
| **Critical Gotchas** | POST for updates (not PATCH), always promote_to_main, no hangup tool (breaks WebRTC), no voice_speed/noise override, enabled_features required |

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

### Supabase (PostgreSQL + Auth) — ACTIVE
| Component | Description |
|-----------|-------------|
| `lib/supabase/server.ts` | Service role key (bypasses RLS, used in server actions) |
| `lib/supabase/auth-server.ts` | Session-based client (respects RLS) + getCurrentUser/requireUser |
| `lib/supabase/auth-client.ts` | Browser-side client for auth operations (signIn, signUp, etc.) |
| `lib/supabase/leads.ts` | CRUD + enrichment + quote persistence (agent_id ownership filter) |
| `lib/supabase/calls.ts` | Call log CRUD + bulk counts |
| `lib/supabase/settings.ts` | Agent settings: getAgentSettings, upsertAgentSettings + getAIAgentSettings, updateAIAgentSettings |
| `lib/supabase/ai-agents.ts` | Multi-agent data layer: CRUD, stats increment, transcript storage/retrieval, recent calls, usage aggregation |
| `lib/actions/leads.ts` | Zod-validated server actions, all use requireUser() for auth |
| `lib/middleware/auth-guard.ts` | API auth: shared secret (timing-safe) OR Supabase session cookies |
| `lib/middleware/rate-limiter.ts` | In-memory sliding window rate limiter (all API endpoints, incl. agentsLimiter 20/min + agentsTranscriptLimiter 30/min) |
| `middleware.ts` | Session refresh + route protection (/leads, /quote, /settings, /agents) |
| **Project** | `orrppddoiumpwdqbavip` (us-west-2) |
| **RLS** | Enabled on all 9 tables (leads, enrichments, quotes, call_logs, agent_settings, activity_logs, ai_agent_calls, ai_agents, ai_transcripts) |

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
| `INTERNAL_API_SECRET` | Internal | Server | Yes | Shared secret for server-to-server API auth (auth guard denies all requests without valid session or secret) |
| `NEXT_PUBLIC_APP_URL` | Internal | Public | Yes | Public app URL for AI agent webhooks (e.g., https://ensurance.vercel.app) |
| `SUPABASE_ACCESS_TOKEN` | Supabase | Dev | No | CLI-only for type generation |

---

## 8. Known Gaps

### Compulife API
- `mock-pricing.ts` is formula-based placeholder
- Real carrier pricing requires Compulife API ($480/yr)
- When integrated, will return carriers not in intelligence database (those use default commission rates)

### Missing Features
- **Ringba inbound**: Call logs support `provider: "ringba"` but no Ringba integration exists
- **Recording**: `recording_url` column exists in call_logs but no recording implementation
- **Product tabs**: Quick quote shows Final Expense, Term Life, IUL, Annuities tabs but only Term Life is active
- **Living benefits comparison**: Data exists in carriers but not surfaced in quote results grid (only in detail modal)

### Implemented (previously listed as gaps)
- **Rx screening**: Now implemented via `checkPrescriptionScreening()` in eligibility engine + searchable `PrescriptionScreeningSection` in carrier detail modal. 3 carriers have Rx exclusion databases (amam: 379, moo: 119, americanhomelife: 59)

### Carrier Intelligence Data
- **38 total carriers** in `lib/data/carriers.ts` (~198KB)
- **14 carriers** with at least one structured intelligence field
- **11 carriers** with structured `medicalConditions[]` (616 total condition rules)
- **3 carriers** with `prescriptionExclusions` (557 total medications)
- **8 carriers** with `combinationDeclines` (65 total rules)
- **14 carriers** with `livingBenefitsDetail`
- **7 carriers** with `rateClassCriteria`
- **24 carriers** have basic fields only (products, state availability, tobacco, DUI)
- Data source: JSON extraction from carrier PDF underwriting guides via Claude Code parallel instances (2026-02-26)
- **Consent mechanism**: No call recording consent (required by German/EU law per compliance rules)
- **Data retention**: No enforcement of retention policies (audit logs, consent records)
- **Settings pages**: 6 of 9 settings sections are placeholders (licenses, business, billing, team, preferences, security)

### Technical Debt
- Legacy `dashboard/` route and `components/{atoms,molecules,organisms,templates}/` (~36 components) superseded by quote/leads architecture
- `@base-ui/react` and `radix-ui` both installed (potential overlap with shadcn)
- Deepgram sessions stored in `globalThis` (lost on serverless cold start — works in dev, fragile in production)

---

## 9. Database Schema

**Supabase Project:** `orrppddoiumpwdqbavip` (us-west-2)
**Tables:** 9 | **Views:** 0 | **Functions:** 0 | **RLS:** Enabled on all tables

### `leads`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `agent_id` | text | No | | auth.uid() — enforced by RLS |
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
| `source` | text | No | | Domain: "csv" / "ringba" / "manual" / "api" / "ai_agent" |
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

### `agent_settings`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `user_id` | text | No | | Unique, auth.uid() — RLS enforced |
| `default_first_year_percent` | numeric | No | 75 | Default FY commission % |
| `default_renewal_percent` | numeric | No | 5 | Default renewal commission % |
| `carrier_commissions` | jsonb | Yes | | Per-carrier commission overrides |
| `telnyx_ai_assistant_id` | text | Yes | | Telnyx AI assistant ID |
| `telnyx_ai_enabled` | bool | Yes | false | Whether AI agent is active |
| `created_at` | timestamptz | No | now() | |
| `updated_at` | timestamptz | No | auto-updated | |

### `activity_logs`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `lead_id` | uuid | No | | FK -> leads.id |
| `agent_id` | text | No | | auth.uid() — RLS enforced |
| `activity_type` | text | No | | lead_created, status_change, call, quote, enrichment, follow_up, note, lead_updated |
| `title` | text | No | | Human-readable activity title |
| `details` | jsonb | Yes | | Type-specific payload (fields_changed, from/to, etc.) |
| `created_at` | timestamptz | No | now() | |

### `ai_agents`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `agent_id` | text | No | | auth.uid() — RLS enforced |
| `name` | text | No | | Agent display name |
| `description` | text | Yes | | Agent description |
| `phone_number` | text | Yes | | E.164 format |
| `voice` | text | No | 'Tina' | Telnyx voice (Tina/Alena/Chloe/Aurelia) |
| `greeting` | text | Yes | | Custom greeting message |
| `status` | text | No | 'inactive' | Domain: "active" / "inactive" / "error" |
| `telnyx_assistant_id` | text | Yes | | Telnyx AI assistant reference |
| `total_calls` | int4 | No | 0 | Aggregate call count |
| `total_minutes` | numeric | No | 0 | Aggregate minutes |
| `last_call_at` | timestamptz | Yes | | Most recent call timestamp |
| `created_at` | timestamptz | No | now() | |
| `updated_at` | timestamptz | No | auto-updated | |

### `ai_transcripts`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `call_id` | uuid | No | | FK -> ai_agent_calls.id |
| `agent_id` | text | No | | auth.uid() — RLS enforced |
| `role` | text | No | | Domain: "assistant" / "user" / "system" |
| `content` | text | No | | Message text |
| `timestamp` | timestamptz | Yes | | Message timestamp |
| `created_at` | timestamptz | No | now() | |

### `ai_agent_calls`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | No | gen_random_uuid() | PK |
| `agent_id` | text | No | | auth.uid() — RLS enforced |
| `ai_agent_id` | uuid | Yes | | FK -> ai_agents.id (Phase 8) |
| `telnyx_conversation_id` | text | Yes | | Telnyx conversation reference |
| `caller_phone` | text | Yes | | Inbound caller number |
| `caller_name` | text | Yes | | Name collected by AI |
| `callback_number` | text | Yes | | Preferred callback number |
| `reason` | text | Yes | | Call reason |
| `callback_time` | text | Yes | | Preferred callback time |
| `age_range` | text | Yes | | Age range collected |
| `state` | text | Yes | | State collected |
| `urgency` | text | Yes | | low/medium/high/urgent |
| `notes` | text | Yes | | Additional notes |
| `transcript` | text | Yes | | Full conversation transcript |
| `processed` | bool | Yes | false | Whether lead was created |
| `lead_id` | uuid | Yes | | FK -> leads.id (after processing) |
| `created_at` | timestamptz | No | now() | |

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
                                   |
AgentsPageClient                 /api/agents  -------------------> Supabase + Telnyx AI
  |-- AgentsListClient           /api/agents/[id]  --------------> Supabase + Telnyx AI
  |-- UsageDashboard             /api/agents/usage  -------------> Supabase
  |                              /api/agents/[id]/transcripts  --> Supabase (ai_transcripts)
AgentDetailClient                  |
                                 /api/ai-agent  ------------------> Telnyx AI Assistants API
                                 /api/ai-agent/webhook  <---------- Telnyx AI (inbound leads)

Stores: call-store (ephemeral) | lead-store (Supabase) | ui-store (ephemeral) | commission-store (Supabase)
```

---

**Totals:** 109 components | 27 API endpoints | 4 Zustand stores | 9 database tables | 6 external integrations | 41 dependencies
