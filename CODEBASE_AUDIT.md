# Ensurance Codebase Audit

**Generated:** 2026-03-13
**Branch:** feature/lukas
**Last Commit:** dd9be85 — refactor: remove after-hours mode toggle from agent wizard
**Total TypeScript Files:** 532 (excluding node_modules, .next)

---

## 1. Routes (Pages)

### Root Layout (`app/layout.tsx`)

Server component. Fonts: `Inter` (400–900) + `Geist_Mono` via `next/font/google`. External: Google Material Symbols via `<link>` tag (render-blocking). Providers: `ClerkProvider`, `ThemeProvider`, `Toaster` (Sonner). Global: `IncomingCallBanner`, `CallNotificationHandler`, `SupportWidget`. Inline `<script>` for theme flash prevention.

| Route | Type | Status | Key Components | Special Files |
|-------|------|--------|----------------|---------------|
| `/` | Server | Functional | `MarketingTemplate`, `HeroSection`, `TrustSection`, `ProductTabSwitcher`, `FeaturesGrid`, `CTASection` | — |
| `/auth` layout | Server | Functional | Logo, decorative blurs. Links to `/support`, `/privacy`, `/terms` (none exist — would 404) | `layout.tsx` |
| `/auth/login` | Server | Functional | Clerk `<SignIn fallbackRedirectUrl="/quote" />` | — |
| `/auth/register` | Server | Functional | Clerk `<SignUp fallbackRedirectUrl="/quote" />` | — |
| `/quote` layout | Server | Functional | `TopNav` | `layout.tsx` |
| `/quote` | Server shell / Client inner | Functional | `QuotePageClient` → `QuoteWorkspace`, `useLeadStore` | — |
| `/dashboard` | Server | Functional | `TopNav`, `DashboardClient` | — |
| `/leads` layout | Server | Functional | `TopNav` | `layout.tsx`, `loading.tsx` |
| `/leads` | Server | Functional | `LeadList`, `BackToQuoter` | `loading.tsx` |
| `/leads/[id]` | Async Server | Functional | `LeadDetailClient` (receives `leadId`) | `loading.tsx` |
| `/pipeline` layout | Server | Functional | `TopNav` | `layout.tsx` |
| `/pipeline` | Server shell / Client inner | Functional | `PipelinePageClient` → `KanbanBoard`, `useLeadStore` | — |
| `/inbox` layout | Server | Functional | `TopNav` | `layout.tsx` |
| `/inbox` | Server shell / Client inner | Functional | `InboxPageClient` (3-column SMS) | — |
| `/calendar` | Server | Functional | `TopNav`, `CalendarPageClient` | — |
| `/history` | Server | Functional | `TopNav`, `HistoryClient` | — |
| `/tools` | Server | **Placeholder** | 6 "Coming Soon" cards (opacity-60), no working functionality | — |
| `/assistant` layout | Server | Functional | `TopNav` | `layout.tsx` |
| `/assistant` | Server | Functional | `ChatInterface` (streaming underwriting AI) | — |
| `/agents` layout | Server | Functional | `TopNav` | `layout.tsx` |
| `/agents` | Server | Functional | `AgentsPageClient` (tabs: My Agents + Usage) | — |
| `/agents/[id]` | Async Server | Functional | `AgentDetailClient` | — |
| `/agents/setup` | Server shell / Client inner | Functional | `AgentSetupClient` (business setup wizard) | — |
| `/agents/personality` | Server shell / Client inner | Functional | `AgentPersonalityClient` | — |
| `/agents/collect` | Server shell / Client inner | Functional | `AgentCollectFieldsClient` | — |
| `/settings` layout | Server | Functional | `TopNav`, `SettingsSidebar`, `BackToQuoter` | `layout.tsx` |
| `/settings` | Server | Redirect → `/settings/profile` | — | — |
| `/settings/profile` | Server | Functional | `ProfileSettingsClient` | — |
| `/settings/commissions` | Server | Functional | `CommissionSettingsClient` | — |
| `/settings/carriers` | Server | Functional | `CarriersSettingsClient` (115 carriers) | — |
| `/settings/integrations` | Server | Functional | Google Calendar + Billing Group cards | — |
| `/settings/licenses` | Server | Functional | `LicensesSettingsClient` | — |
| `/settings/phone-numbers` | Server | Functional | `PhoneNumbersSettingsClient` | — |
| `/settings/usage` | Server | Functional | `UsageClient` | — |
| `/settings/custom-fields` | Server | Functional | `CustomFieldsSettingsClient` | — |
| `/settings/business` | Async Server | Functional | `BusinessKnowledgePage` | — |
| `/settings/security` | Async Server | Functional | `SecuritySettingsSection` (read-only) | — |
| `/settings/billing` | Async Server | **Placeholder** | Coming Soon card | — |
| `/settings/team` | Async Server | **Placeholder** | Coming Soon card | — |
| `/settings/preferences` | Async Server | **Placeholder** | Coming Soon card | — |

**Summary:** 29 functional pages, 4 placeholders (`/tools`, `/settings/billing`, `/settings/team`, `/settings/preferences`).

**Issues:**
- `/auth/layout.tsx` links to `/support`, `/privacy`, `/terms` — none exist (404)
- Google Material Symbols loaded via raw `<link>` (render-blocking, bypasses `next/font` optimization)
- `loading.tsx` only under `/leads` and `/leads/[id]` — other routes have no loading UI

---

## 2. API Endpoints

58 route.ts files total.

| Endpoint | Methods | Auth | Rate Limited | External Services | Description |
|----------|---------|------|-------------|-------------------|-------------|
| `/api/quote` | POST | requireAuth + Clerk | `quote` | Compulife, Supabase | Full quote engine: eligibility, pricing, scoring, rate class spreads |
| `/api/chat` | POST | requireAuth | `ai` | OpenAI GPT-4o-mini | Streaming AI chat for quote page |
| `/api/chat/proactive` | POST | requireAuth | `ai` | OpenAI GPT-4o-mini | 2-4 proactive insight cards (JSON mode) |
| `/api/enrichment` | POST | requireAuth | `api` | People Data Labs | 80+ field person enrichment |
| `/api/proposal` | POST | requireAuth + Clerk | `api` | Supabase, Clerk | PDF proposal generation (jsPDF), streams download |
| `/api/assistant/chat` | POST | requireAuth | `ai` | OpenAI + Compulife (tool) | Streaming underwriting assistant with `get_quote` tool |
| `/api/coaching` | POST | requireAuth | `ai` | OpenAI GPT-4o-mini | Real-time coaching cards during calls (5s timeout) |
| `/api/call-summary` | POST | requireAuth | `ai` | OpenAI GPT-4o-mini | 3-sentence call transcript summary |
| `/api/agents` | GET, POST | requireAuth + Clerk | `api` | Supabase, Telnyx AI | List agents; create with Telnyx assistant |
| `/api/agents/[id]` | GET, PUT, DELETE | requireAuth + Clerk | `api` | Supabase, Telnyx AI | Agent CRUD; PUT recompiles prompt; DELETE unlinks numbers |
| `/api/agents/[id]/calls` | GET | requireAuth + Clerk | `api` | Supabase | Cursor-paginated call logs |
| `/api/agents/[id]/calls/[callId]` | GET | requireAuth + Clerk | `api` | Supabase | Single call detail |
| `/api/agents/[id]/transcripts` | POST | requireAuth | `api` | Supabase | Store transcript messages (server-to-server) |
| `/api/agents/[id]/transcripts/[callId]` | GET | requireAuth + Clerk | `api` | Supabase | Retrieve full transcript |
| `/api/agents/call-complete` | POST | Telnyx ED25519 | `webhook` | Supabase, OpenAI, Google Calendar | Post-call: extraction, lead upsert, calendar booking |
| `/api/agents/intake-webhook` | POST | Telnyx ED25519 | `webhook` | Supabase | Legacy inbound intake (save_caller_info tool) |
| `/api/agents/scrape-preview` | POST | requireAuth | `api` | HTTP fetch (SSRF-protected) | Business website text scraper |
| `/api/agents/usage` | GET | requireAuth + Clerk | `api` | Supabase | Aggregated AI agent usage stats |
| `/api/ai-agent` | GET, POST, DELETE | requireAuth + Clerk | `api` | Supabase, Telnyx AI | **Legacy** Phase 7 single-agent management |
| `/api/ai-agent/toggle` | PUT | requireAuth + Clerk | `api` | Supabase, Telnyx | Enable/disable legacy AI agent |
| `/api/ai-agent/webhook` | POST | Telnyx ED25519 | `webhook` | Supabase, Telnyx | **Legacy** Phase 7 webhook |
| `/api/call-log` | POST | requireAuth + Clerk | `api` | Supabase | Save call log (transcript, coaching, duration) |
| `/api/call-log/[leadId]` | GET | requireAuth + Clerk | `api` | Supabase | List call logs for lead |
| `/api/call-log/counts` | GET | requireAuth + Clerk | `api` | Supabase | Bulk call count for up to 100 lead IDs |
| `/api/activity-log` | POST | requireAuth + Clerk | `api` | Supabase | Insert activity log entry |
| `/api/activity-log/[leadId]` | GET | requireAuth + Clerk | `api` | Supabase | Paginated activity logs for lead |
| `/api/activity-log/history` | GET | requireAuth + Clerk | `api` | Supabase | Global activity history with filters |
| `/api/sms` | GET, POST | requireAuth + Clerk | `api` | Telnyx SMS, Supabase | Send/list SMS messages |
| `/api/inbox/conversations` | GET | requireAuth + Clerk | `api` | Supabase | SMS conversation previews |
| `/api/inbox/read` | POST | requireAuth + Clerk | `api` | Supabase | Mark conversations read/unread |
| `/api/notifications` | GET, POST | requireAuth + Clerk | `api` | Supabase | Derived notifications; mark all read |
| `/api/dashboard/stats` | GET | requireAuth + Clerk | `api` | Supabase | Dashboard KPI stats |
| `/api/dashboard/calendar` | GET | requireAuth + Clerk | `api` | Supabase, Google Calendar | Merged follow-ups + Google events |
| `/api/phone-numbers` | GET | requireAuth + Clerk | `api` | Supabase | List purchased numbers |
| `/api/phone-numbers/[id]` | PUT, DELETE | requireAuth + Clerk | `api`/`auth` | Supabase, Telnyx | Update/delete phone number |
| `/api/phone-numbers/search` | POST | requireAuth | `api` | Telnyx | Search available numbers |
| `/api/phone-numbers/purchase` | POST | requireAuth + Clerk | `auth` | Telnyx, Supabase | Purchase and provision number |
| `/api/telnyx/credentials` | GET | requireAuth | `auth` | Telnyx REST | SIP credentials for WebRTC |
| `/api/telnyx/token` | POST | requireAuth | `auth` | Telnyx REST | WebRTC JWT token |
| `/api/transcribe/stream` | GET | requireAuth | `ai` | Deepgram WebSocket | SSE live transcription session |
| `/api/transcribe/audio` | POST | requireAuth | `streaming` | Deepgram (via session) | Forward audio chunks to Deepgram |
| `/api/settings` | GET, PUT | requireAuth + Clerk | `api` | Supabase | Commission settings |
| `/api/settings/carriers` | GET, PUT | requireAuth + Clerk | `api` | Supabase | Selected carriers (COMPINC) |
| `/api/settings/billing-group` | GET | requireAuth + Clerk | **None** | Telnyx, Supabase | Billing group status + auto-create |
| `/api/settings/licenses` | GET, POST, PUT, DELETE | requireAuth + Clerk | `api` | Supabase | License CRUD |
| `/api/settings/business-profile` | GET, PUT | requireAuth + Clerk | `api` | Supabase | Business profile CRUD |
| `/api/settings/business` | GET, PUT | requireAuth + Clerk | `api` | Supabase | Business info CRUD |
| `/api/settings/usage` | GET | requireAuth + Clerk | `api` | Supabase | Usage stats for date range |
| `/api/settings/custom-fields` | GET, POST, PUT, DELETE | requireAuth + Clerk | `api` | Supabase | Custom field definitions CRUD (max 20) |
| `/api/settings/dashboard-layout` | GET, PUT | requireAuth + Clerk | `api` | Supabase | Dashboard widget order |
| `/api/custom-field-values` | GET, PUT | requireAuth + Clerk | `api` | Supabase | Custom field values per lead |
| `/api/auth/google` | GET | requireAuth + Clerk | `auth` | Google OAuth | Initiate OAuth flow |
| `/api/auth/google/callback` | GET | State HMAC only | `auth` | Google OAuth | OAuth callback + token exchange |
| `/api/auth/google/status` | GET | requireAuth + Clerk | `api` | Supabase | Calendar connection status |
| `/api/auth/google/disconnect` | POST | requireAuth + Clerk | `auth` | Google, Supabase | Revoke + delete tokens |
| `/api/webhooks/clerk` | POST | Svix signature | **None** | Telnyx billing, Supabase | `user.created` → billing group |
| `/api/webhooks/sms` | POST | Telnyx ED25519 | **None** | Supabase | Inbound SMS → lead + sms_log |
| `/api/jobs/follow-up-reminders` | POST | CRON_SECRET | **None** | Supabase, Resend | Follow-up digest emails |
| `/api/jobs/retention` | POST | CRON_SECRET | **None** | Supabase | Data retention cleanup |

**Issues:**
- `/api/settings/billing-group` missing rate limiting (inconsistent with other settings endpoints)
- `TELNYX_WEBHOOK_PUBLIC_KEY` absent → webhook signature verification silently skipped in production
- Legacy `/api/ai-agent/*` routes still active alongside newer `/api/agents/*`

---

## 3. Components

### components/ui/ — 56 shadcn components (DO NOT MODIFY)

### components/quote/ (15 files)

| File | Description |
|------|-------------|
| `ai-assistant-panel.tsx` | Right-column: streaming AI chat, proactive insights, enrichment, call-mode switch. Stores: `useLeadStore`, `useCallStore` |
| `call-insights-view.tsx` | Live transcript + coaching hints during active call. Store: `useCallStore` |
| `carrier-comparison.tsx` | Side-by-side carrier comparison sheet |
| `carrier-detail-modal.tsx` | Three-tab dialog: Overview, Underwriting, Carrier Info |
| `carrier-logo.tsx` | Carrier logo from Compulife CDN with abbreviation fallback |
| `carrier-results.tsx` | Center column: Best Matches + All Carriers with comparison, filters, sort. Stores: `useLeadStore`, `useCommissionStore` |
| `contact-info-card.tsx` | Lead summary card above AI chat. Store: `useLeadStore` |
| `email-quote-dialog.tsx` | Email quote summary dialog |
| `insight-card.tsx` | Presentational card for live call insights |
| `intake-form.tsx` | Left column: client intake (birthdate, coverage, health). Store: `useLeadStore` |
| `lead-enrichment-popover.tsx` | PDL lookup + per-field checkbox auto-fill |
| `medical-history-section.tsx` | Conditions combobox, medications, DUI toggle |
| `proposal-dialog.tsx` | PDF proposal generation + download |
| `quote-workspace.tsx` | Main 3-column layout. Stores: `useLeadStore`, `useUIStore` |
| `share-quote-dialog.tsx` | Email + SMS quote sharing |

### components/agents/ (20 files)

| File | Description |
|------|-------------|
| `agent-collect-fields-client.tsx` | Full-page collection fields + post-call actions editor |
| `agent-detail-client.tsx` | Agent detail: config form, call history, prompt preview |
| `agent-personality-client.tsx` | Voice/tone/language editor |
| `agent-setup-client.tsx` | Business setup: phone, hours, FAQ |
| `agents-list-client.tsx` | Agent card grid with create/delete |
| `agents-page-client.tsx` | Tabbed wrapper: My Agents + Usage |
| `business-hours-editor.tsx` | Day-by-day hours config |
| `call-detail-panel.tsx` | Expandable call detail (duration, outcome, transcript) |
| `call-logs-list.tsx` | Searchable/filterable call records |
| `create-agent-dialog.tsx` | Dialog wrapper for wizard |
| `create-agent-wizard.tsx` | 4-step wizard (Business → Personality → Collection → Review) |
| `edit-step-nav.tsx` | Prev/Next nav for 3-step edit flow |
| `faq-editor.tsx` | FAQ CRUD inline editor |
| `transcript-viewer.tsx` | Chat-style transcript display |
| `usage-dashboard.tsx` | Usage stats with time-range selector |
| `wizard-steps/business-step.tsx` | Step 1: name, state, phone |
| `wizard-steps/collection-step.tsx` | Step 3: fields, actions, hours, calendar |
| `wizard-steps/personality-step.tsx` | Step 2: tone, voice, language |
| `wizard-steps/purpose-step.tsx` | **ORPHANED** — former step removed when wizard went from 5 to 4 steps |
| `wizard-steps/review-step.tsx` | Step 4: config summary + prompt preview |

### components/assistant/ (3 files)

| File | Description |
|------|-------------|
| `chat-interface.tsx` | Full-screen underwriting assistant with streaming AI + tool calling |
| `chat-message.tsx` | Message bubble with source indicator |
| `suggested-questions.tsx` | 5 starter question chips |

### components/calling/ (14 files)

| File | Description |
|------|-------------|
| `active-call-bar.tsx` | Persistent call controls (mute, hold, hangup, DTMF, timer). Store: `useCallStore` |
| `call-button.tsx` | Click-to-call via TelnyxRTC. Stores: `useLeadStore`, `useCallStore` |
| `call-log-viewer.tsx` | Past call entries with transcript modal trigger |
| `call-mode-header.tsx` | Mini call status header. Store: `useCallStore` |
| `call-notification-handler.tsx` | Global: auto-connects TelnyxRTC, drives timer. Store: `useCallStore` |
| `coaching-hint-card.tsx` | Inline coaching card between transcript entries |
| `dtmf-keypad.tsx` | Popover DTMF keypad (0-9, *, #) |
| `incoming-call-banner.tsx` | Fixed banner for ringing inbound calls. Store: `useCallStore` |
| `panel-dialer.tsx` | Contact carousel + call action bar. Stores: `useLeadStore`, `useCallStore` |
| `remote-audio.tsx` | Hidden `<audio>` for remote party stream. Store: `useCallStore` |
| `ring-sound.tsx` | Web Audio API ring tone |
| `transcript-entry.tsx` | Single transcript bubble |
| `transcript-modal.tsx` | Full post-call transcript sheet |
| `transcript-view.tsx` | Auto-scrolling transcript timeline. Store: `useCallStore` |

### components/coaching/ (5 files)

| File | Description |
|------|-------------|
| `coaching-card-stack.tsx` | Stack of up to 5 coaching cards with auto-collapse |
| `coaching-tip-card.tsx` | Coaching tip card with dismiss |
| `life-event-card.tsx` | Cross-sell opportunity card |
| `medication-card.tsx` | Per-carrier medication acceptance card |
| `style-card.tsx` | DISC communication style card |

### components/dashboard/ (12 files)

| File | Description |
|------|-------------|
| `add-calendar-event-dialog.tsx` | Create follow-up calendar event |
| `business-profile-card.tsx` | Dashboard widget: business name, KB/FAQ counts |
| `calendar-day-grid.tsx` | Hour-grid day view |
| `calendar-event-block.tsx` | Colored event block in hour grids |
| `calendar-event-item.tsx` | `CalendarEvent` type + event row |
| `calendar-event-popover.tsx` | Event detail popover with delete/link |
| `calendar-view.tsx` | Dashboard mini calendar widget |
| `calendar-week-grid.tsx` | 7-column week view |
| `dashboard-charts.tsx` | Recharts line + pie charts |
| `dashboard-client.tsx` | Main dashboard: draggable widgets via `@dnd-kit` |
| `dashboard-goals.tsx` | Editable goals with progress bars (localStorage) |
| `sortable-widget.tsx` | `@dnd-kit/sortable` wrapper |

### components/calendar/ (4 files)

| File | Description |
|------|-------------|
| `calendar-page-client.tsx` | Full-page calendar with day/week/month switcher |
| `full-day-view.tsx` | Day hour-grid view |
| `full-month-view.tsx` | Month grid with event dots |
| `full-week-view.tsx` | 7-column week hour-grid view |

### components/leads/ (20 files)

| File | Description |
|------|-------------|
| `activity-timeline.tsx` | Paginated activity log per lead |
| `add-lead-dialog.tsx` | New lead form dialog |
| `column-mapper.tsx` | CSV column mapping grid |
| `csv-upload.tsx` | 4-step CSV import flow |
| `date-picker-input.tsx` | Text input + calendar popover |
| `follow-up-picker.tsx` | Quick-preset follow-up buttons + scheduler |
| `follow-up-scheduler.tsx` | Calendar + time picker for follow-ups |
| `import-preview.tsx` | CSV preview table with validation |
| `kanban-board.tsx` | Drag-and-drop pipeline via `@dnd-kit/core` |
| `lead-custom-fields.tsx` | Custom field values per lead |
| `lead-detail-client.tsx` | Lead detail: nav arrows, workspace, calls, notes, quotes |
| `lead-details-section.tsx` | Tabbed section: Personal, Medical, Notes, Follow-up, Activity, Quotes, Financial, Compliance |
| `lead-info-modal.tsx` | Lead quick-edit sheet |
| `lead-info-panel.tsx` | Lead quick-edit inline panel |
| `lead-list.tsx` | Main leads list with search, sort, filters, bulk actions |
| `lead-notes.tsx` | Notes CRUD per lead |
| `lead-status-badge.tsx` | Color-coded pipeline status badge |
| `pre-screen-badge.tsx` | Eligible carrier % badge |
| `quote-history.tsx` | Past quote snapshots with restore/share |
| `sms-panel.tsx` | SMS send + history per lead |

### components/inbox/ (4 files)

| File | Description |
|------|-------------|
| `conversation-contact.tsx` | Right-panel contact sidebar |
| `conversation-list.tsx` | Left-panel conversation previews |
| `conversation-thread.tsx` | Center-panel SMS thread + send box |
| `inbox-page-client.tsx` | 3-column inbox orchestrator (polls 30s) |

### components/navigation/ (4 files)

| File | Description |
|------|-------------|
| `back-to-quoter.tsx` | Back-link component |
| `notification-bell.tsx` | Bell icon + unread count + slide-out panel |
| `top-nav.tsx` | Top nav: logo, links, user menu (Clerk), dark mode toggle |
| `unsaved-changes-guard.tsx` | `beforeunload` handler for dirty state |

### components/settings/ (18 files)

| File | Description |
|------|-------------|
| `billing-group-card.tsx` | Telnyx billing group status + retry |
| `business-info-client.tsx` | Business info form (name, state, website, bio) |
| `business-knowledge-page.tsx` | Full KB page: name, scraper, KB text, hours, FAQ |
| `business-profile-section.tsx` | Agent-detail embedded KB + FAQ |
| `carriers-settings-client.tsx` | 115 carriers, A-Z grouped, toggle, search, auto-save |
| `commission-settings-client.tsx` | Commission rates table |
| `commission-table-row.tsx` | Single commission row with debounced edit |
| `custom-fields-settings-client.tsx` | Custom field definitions CRUD |
| `google-calendar-card.tsx` | Google OAuth connect/disconnect |
| `integrations-settings-client.tsx` | Integrations page: Calendar + Billing + Telnyx |
| `licenses-settings-client.tsx` | Insurance license CRUD |
| `phone-numbers-settings-client.tsx` | Phone number management |
| `profile-settings-client.tsx` | Profile form (Clerk metadata) |
| `security-settings-section.tsx` | Read-only security features |
| `settings-page-header.tsx` | Simple h1 + description header |
| `settings-placeholder.tsx` | "Coming Soon" card |
| `settings-sidebar.tsx` | Left nav for settings |
| `usage-client.tsx` | Usage metrics + time range |

### components/history/ (1 file)

| File | Description |
|------|-------------|
| `history-client.tsx` | Full call/activity history timeline |

### components/landing/ (14 files — atomic design)

**Atoms:** `ComplianceBadge`, `Logo`, `MaterialIcon`, `NavLink`
**Molecules:** `FeatureCard`, `FeatureItem`, `FooterLinkGroup`
**Organisms:** `CTASection`, `FeaturesGrid`, `Footer`, `Header`, `HeroSection`, `ProductTabSwitcher`, `TrustSection`
**Templates:** `MarketingTemplate`

### components/shared/ (1 file)

| File | Description |
|------|-------------|
| `empty-state.tsx` | Reusable empty state with icon, title, actions |

### components/support/ (1 file)

| File | Description |
|------|-------------|
| `support-widget.tsx` | Floating help form (email + message via Resend) |

### components/theme-provider.tsx

Light/dark theme context via `localStorage` + `data-theme` attribute.

**Total:** ~120 component files across 14 directories (excluding 56 shadcn/ui).

**Orphaned:** 1 file — `wizard-steps/purpose-step.tsx` (removed from wizard but file remains).

---

## 4. Libraries & Engine

### lib/types/ (10 files)

| File | Description |
|------|-------------|
| `index.ts` | Barrel re-export |
| `carrier.ts` | `Carrier` + sub-types (tobacco, medical, DUI, Rx, rate class, living benefits) |
| `quote.ts` | `QuoteRequest`, `QuoteResponse`, `CarrierQuote`, `RateClassPrice` |
| `lead.ts` | `Lead` (first-class entity), `LeadStatus`, `LeadQuoteSnapshot` |
| `ai.ts` | `EnrichmentResult` (80+ fields), `ProactiveInsight` |
| `activity.ts` | `ActivityLog`, `ActivityType` (20+ types) |
| `commission.ts` | `CommissionSettings`, `CommissionEstimate` |
| `coaching.ts` | `CoachingCard` union + Zod schemas |
| `database.ts` | Stricter domain aliases re-exported from generated types |
| `database.generated.ts` | Auto-generated by Supabase CLI — DO NOT EDIT |
| `custom-fields.ts` | Custom field types, `MAX_CUSTOM_FIELDS = 20` |

### lib/data/ (14 files)

| File | Description |
|------|-------------|
| `carriers.ts` | 13,325 lines. 38 carriers (14 fully enriched, 24 basic). Central dependency. |
| `carriers-generated.ts` | Auto-generated 26 carriers with limited intelligence (appended to CARRIERS) |
| `medical-conditions.ts` | 90+ conditions across 13 categories |
| `medications.ts` | 1,854 lines. Full medication database with carrier eligibility |
| `build-charts.ts` | Height/weight build chart data per carrier |
| `proddis-filters.ts` | SI product code allowlists (170 codes, 14 categories) |
| `carrier-intelligence-summary.ts` | Condensed carrier text for AI assistant prompt |
| `carrier-logos.ts` | 80+ Compulife CDN logo URLs |
| `life-event-triggers.ts` | 25 cross-sell triggers across 13 categories |
| `medication-keywords.ts` | Live transcript medication/condition keyword scanner |
| `pipeline.ts` | 6 pipeline stages + status suggestion logic |
| `sms-templates.ts` | 4 SMS templates with variable substitution |
| `us-states.ts` | 51 US states + territories |
| `rx-names.ts` | Large drug name reference list |
| `compulife-companies.ts` | Compulife company code lookup table |

### lib/engine/ (10 files)

| File | Permanent | Description |
|------|-----------|-------------|
| `pricing.ts` | Yes | `PricingProvider` interface, `PricingRequest` type |
| `compulife-provider.ts` | Yes | ~960 lines. Sole `PricingProvider` implementation. Proxy + direct mode. SI/FUW filtering. |
| `pricing-config.ts` | Yes | Lazy singleton. Throws if no Compulife env vars. |
| `eligibility.ts` | Yes | Medical, Rx, combination decline, DUI, state eligibility checks |
| `match-scoring.ts` | Yes | 0-99 proprietary score (AM Best, eSign, vape, price, medical, Rx) |
| `commission-calc.ts` | Yes | Simple commission arithmetic |
| `tobacco-classification.ts` | Yes | Carrier-specific tobacco/nicotine rules |
| `medication-screening.ts` | Yes | Per-carrier medication screening |
| `build-chart.ts` | Yes | BMI/build chart evaluation |
| `pre-screen.ts` | Yes | Quick eligibility scan across all carriers for a lead |

### lib/ai/ (3 files)

| File | Description |
|------|-------------|
| `system-prompt.ts` | Quote-page AI assistant system prompt builder |
| `coaching-context.ts` | Per-state carrier context for call coaching (~4K tokens) |
| `call-coach.ts` | Coaching message formatting + JSON parsing + deduplication |

### lib/store/ (4 Zustand stores)

| Store | Persistence | Key State |
|-------|------------|-----------|
| `lead-store.ts` (620 lines) | Manual Supabase sync | leads[], activeLead, dirtyFields, intakeData, quoteResponse, selectedCarrierIds |
| `ui-store.ts` | None (ephemeral) | Panel open/close, panel size percentages |
| `commission-store.ts` | API + localStorage migration | Per-carrier commission rates, debounced save |
| `call-store.ts` | None (resets on reload) | CallState enum, transcript entries, coaching hints/cards |

### lib/supabase/ (17 files)

| File | Tables Touched | Description |
|------|---------------|-------------|
| `clerk-client.ts` | — | Server-side Supabase client via Clerk JWT |
| `clerk-client-browser.ts` | — | Browser-side hook with Clerk token injection |
| `server.ts` | — | Service role client (webhooks only) |
| `leads.ts` | leads, enrichments, quotes | Full lead CRUD + enrichment + quote snapshots |
| `ai-agents.ts` | ai_agents, ai_agent_calls, ai_transcripts | Agent CRUD, calls, transcripts |
| `settings.ts` | agent_settings | Business info, AI settings, carriers, dashboard layout, commissions |
| `custom-fields.ts` | custom_field_definitions, custom_field_values | Custom field CRUD + reorder |
| `activities.ts` | activity_logs | Global + lead-scoped activity logs |
| `calls.ts` | call_logs | Call CRUD with AES-256-GCM encryption at rest |
| `notes.ts` | lead_notes | Note CRUD with encryption |
| `notifications.ts` | activity_logs, leads, ai_agent_calls | Derived notifications (no dedicated table) |
| `dashboard.ts` | leads, call_logs, activity_logs | 6 parallel stat queries |
| `inbox.ts` | leads, sms_logs, activity_logs | Conversation previews |
| `sms.ts` | sms_logs | SMS CRUD with encryption |
| `phone-numbers.ts` | agent_phone_numbers | Phone number CRUD |
| `licenses.ts` | agent_licenses | License CRUD |
| `business-profile.ts` | agent_business_profile | Profile CRUD + prompt formatting helpers |
| `avatar.ts` | Supabase Storage (`avatars/`) | Upload/delete avatar images |
| `google-integrations.ts` | google_integrations | Google OAuth token CRUD with encryption |
| `usage.ts` | call_logs, activity_logs, leads | Usage aggregation + cost estimation |

### lib/actions/ (4 files)

| File | Description |
|------|-------------|
| `leads.ts` | Server actions: fetch, create (+ pre-screen), update (+ Calendar sync + pre-screen), delete, enrichment, quote, batch |
| `notes.ts` | Server actions: fetch, create, delete |
| `log-activity.ts` | Fire-and-forget activity logging |
| `send-quote-email.ts` | Resend SDK email with branded HTML template |

### lib/voice/ (3 files)

| File | Status | Description |
|------|--------|-------------|
| `ensurance-prompt-compiler.ts` | **Likely orphaned** | Simpler prompt compiler, superseded by `lib/telnyx/prompt-compiler.ts` |
| `openai-extraction.ts` | Active | Structured data extraction from call transcripts via OpenAI |
| `spanish-agent.service.ts` | Active | Spanish companion agent lifecycle on Telnyx |

### lib/assistant/ (2 files)

| File | Description |
|------|-------------|
| `build-context.ts` | Exhaustive carrier context (~50K+ chars) for underwriting assistant |
| `tools.ts` | `get_quote` tool: real Compulife pricing via Vercel AI SDK `tool()` |

### lib/telnyx/ (15 files)

| File | Description |
|------|-------------|
| `ai-types.ts` | TypeScript interfaces for Telnyx AI Assistants REST API |
| `ai-config.ts` | Build `TelnyxAssistantCreateDto` for English + Spanish agents |
| `ai-prompts.ts` | **Partially orphaned** — 4 original prompt builders, superseded by `prompt-compiler.ts` |
| `prompt-compiler.ts` | Canonical voice agent prompt compiler with injection defense |
| `tone-presets.ts` | 4 tone presets: warm, professional, direct, casual |
| `agent-templates.ts` | Unified inbound agent template (legacy template IDs redirect) |
| `ai-service.ts` | Telnyx AI Assistants REST wrapper with retry (max 3) |
| `billing.ts` | Billing group CRUD |
| `client.ts` | TelnyxRTC singleton with reconnection |
| `connect.ts` | TelnyxRTC init with 15s timeout |
| `active-call.ts` | Module-level active call storage (not in Zustand) |
| `notification-handler.ts` | Call state → Zustand mapping, Deepgram start/stop, status advancement |
| `inbound-handler.ts` | Inbound call accept/handle |
| `post-call-save.ts` | Transcript format → AI summary → Supabase save |
| `ai-lead-processor.ts` | AI call → CRM lead conversion + post-call actions |
| `messaging-profiles.ts` | Telnyx messaging profile CRUD for SMS |
| `phone-numbers.ts` | Phone number search, order, release |
| `audio-capture.ts` | Web Audio API: mix local+remote → PCM 16kHz for Deepgram |

### lib/google/ (2 files)

| File | Description |
|------|-------------|
| `oauth.ts` | HMAC-signed state, token exchange, authenticated client |
| `calendar-service.ts` | Calendar event CRUD + token refresh persistence |

### lib/email/ (2 files)

| File | Description |
|------|-------------|
| `resend.ts` | Zod-validated email sending via Resend SDK |
| `escape-html.ts` | XSS prevention for email template interpolation |

### Other lib/ files

| File | Description |
|------|-------------|
| `lib/sms/send.ts` | SMS sending: resolve from-number, Telnyx API, save log |
| `lib/pdf/proposal-generator.ts` | Branded multi-page PDF via jsPDF + autotable |
| `lib/deepgram/sessions.ts` | Server-side Deepgram session management (max 10, 30s idle) |
| `lib/deepgram/stream.ts` | Client-side transcription: audio → SSE proxy → Deepgram → call-store |
| `lib/coaching/build-coaching-prompt.ts` | Compress medication DB + life events → coaching system prompt |
| `lib/encryption/crypto.ts` | AES-256-GCM with scrypt key derivation |
| `lib/encryption/field-encryption.ts` | Immutable per-field encrypt/decrypt |
| `lib/middleware/auth-guard.ts` | API secret OR Clerk session auth |
| `lib/middleware/rate-limiter.ts` | 5-tier Upstash rate limiter with in-memory fallback |
| `lib/middleware/csrf.ts` | Origin/Referer validation |
| `lib/middleware/telnyx-webhook-verify.ts` | ED25519 signature + 5-min replay protection |
| `lib/jobs/data-retention.ts` | Retention cleanup: transcripts 90d, coaching 90d, summaries 1yr, enrichments 1yr |
| `lib/jobs/follow-up-reminders.ts` | Overdue follow-up digest → email + SMS |
| `lib/utils.ts` | `cn()` helper (clsx + tailwind-merge) |
| `lib/utils/date.ts` | Age calculation, DOB parsing/formatting |
| `lib/utils/phone.ts` | E.164 normalize, display format |
| `lib/utils/csv-parser.ts` | PapaParse wrapper with lead field mapping |
| `lib/utils/quote-summary.ts` | Plain-text quote summary for clipboard/SMS |
| `lib/constants.ts` | **Orphaned** — `DEV_AGENT_ID = "REMOVED_USE_AUTH"` tombstone |
| `lib/constants/insight-styles.ts` | Insight type icons + colors |
| `lib/auth/password-rules.ts` | Zod password schema — reduced relevance post-Clerk migration |
| `lib/agents/prompt-builder.ts` | `buildInboundAgentPrompt()` — still used by `ai-config.ts` |

### hooks/ (3 files)

| Hook | Description |
|------|-------------|
| `use-mobile.ts` | `useIsMobile()` — 768px media query |
| `use-coaching-interval.ts` | 30s coaching hint request interval during active calls |
| `use-business-profile.ts` | Fetch business profile from API |

---

## 5. Data Files

- **Carriers defined:** 38 in primary array + 26 auto-generated = 64 total entries (14 fully enriched with structured intelligence)
- **Medical conditions:** 90+ across 13 categories
- **Medications:** 1,854 lines, full carrier eligibility database
- **Build charts:** Per-carrier height/weight data
- **SI products:** 170 codes across 14 categories
- **Life event triggers:** 25 across 13 categories
- **SMS templates:** 4 with variable substitution
- **US states:** 51 entries
- **Compulife company codes:** 80+ entries
- **Rx names:** Large reference list (85K+ tokens)

---

## 6. State Management

| Store | File | Persistence | Key State |
|-------|------|------------|-----------|
| `useLeadStore` | `lib/store/lead-store.ts` (620 lines) | Manual Supabase sync | leads[], activeLead, dirtyFields (enrichment protection), intakeData, quoteResponse, selectedCarrierIds, carousel nav |
| `useUIStore` | `lib/store/ui-store.ts` | None (ephemeral) | Panel visibility, panel size percentages (left/center/right) |
| `useCommissionStore` | `lib/store/commission-store.ts` | API + localStorage migration | Per-carrier rates, 1s debounced save to `/api/settings` |
| `useCallStore` | `lib/store/call-store.ts` | None (resets on reload) | CallState enum, transcript entries, coaching hints array, coaching cards with dedup |

---

## 7. Database Schema

15 tables total (14 documented + `agent_business_profile` added via migration), all with RLS enabled.

| Table | RLS | Key Columns / Notes |
|-------|-----|---------------------|
| `leads` | Yes | Agent-scoped lead records, first-class entity |
| `enrichments` | Yes | PDL enrichment results per lead |
| `quotes` | Yes | Quote snapshots |
| `call_logs` | Yes | Call history. Encrypted: transcript_text, ai_summary, coaching_hints. Extended: extracted_data, extraction_status, caller_name, caller_phone, transcript_data |
| `lead_notes` | Yes | Encrypted content |
| `activity_logs` | Yes | 20+ activity types |
| `agent_settings` | Yes | Commissions, selected_carriers (COMPINC), billing_group_id, dashboard_layout |
| `agent_licenses` | Yes | State, license number, expiry |
| `agent_phone_numbers` | Yes | Telnyx number assignments, primary flag, labels |
| `ai_agents` | Yes | Voice agent configs. knowledge_base, spanish_agent_assistant_id, custom_collect_fields |
| `ai_agent_calls` | Yes | AI agent call records |
| `ai_transcripts` | Yes | Call transcript messages |
| `sms_logs` | Yes | Encrypted messages. is_read flag with partial index |
| `google_integrations` | Yes | Encrypted OAuth tokens (access_token, refresh_token) |
| `agent_business_profile` | Yes | business_name, knowledge_base, faq (jsonb), business_hours (jsonb). Unique on agent_id |
| `custom_field_definitions` | Yes | Agent-defined custom lead fields (text/number/select/toggle) |
| `custom_field_values` | Yes | Custom field values per lead |

**Encryption at rest:** call_logs (transcript, summary, hints), lead_notes (content), sms_logs (message), google_integrations (tokens) — all via AES-256-GCM.

**Migrations present:** 7 incremental (base schema not in migrations — applied directly or pre-versioned).

---

## 8. External Integrations

| Service | Status | Key Files |
|---------|--------|-----------|
| **Clerk** (Auth) | Active | middleware.ts, lib/supabase/clerk-client*.ts, app/api/webhooks/clerk |
| **Supabase** (DB + Storage) | Active | lib/supabase/*.ts (17 files), all API routes |
| **OpenAI** (GPT-4o-mini) | Active | 6 API routes (chat, proactive, assistant, coaching, call-summary, extraction) |
| **Compulife** (Pricing) | Active | lib/engine/compulife-provider.ts, compulife-proxy/ |
| **Telnyx** (Voice + SMS + AI) | Active | lib/telnyx/*.ts (15 files), 10+ API routes |
| **Deepgram** (Transcription) | Active | lib/deepgram/*.ts, app/api/transcribe/* |
| **People Data Labs** (Enrichment) | Active | app/api/enrichment/route.ts |
| **Google** (Calendar OAuth) | Active | lib/google/*.ts, app/api/auth/google/*, app/api/dashboard/calendar |
| **Resend** (Email) | Active (optional) | lib/email/resend.ts, lib/actions/send-quote-email.ts, lib/jobs/follow-up-reminders.ts |
| **Upstash Redis** (Rate Limiting) | Active (optional) | lib/middleware/rate-limiter.ts (fails open if absent) |
| **Svix** (Webhook Verification) | Active | app/api/webhooks/clerk/route.ts |

---

## 9. Environment Variables

| Variable | Service | Required? |
|----------|---------|-----------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Required |
| `CLERK_SECRET_KEY` | Clerk | Required |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk | Required |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk | Required |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Clerk | Optional |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Clerk | Optional |
| `CLERK_WEBHOOK_SECRET` | Clerk/Svix | Required |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Required |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Required |
| `OPENAI_API_KEY` | OpenAI | Required |
| `PEOPLEDATALABS_API_KEY` | PDL | Required |
| `TELNYX_API_KEY` | Telnyx | Required |
| `TELNYX_WEBHOOK_PUBLIC_KEY` | Telnyx | Required (silently skipped if absent!) |
| `TELNYX_CONNECTION_ID` | Telnyx | Required |
| `TELNYX_CALLER_NUMBER` | Telnyx | Optional (fallback for SMS) |
| `TELNYX_WEBHOOK_BASE_URL` | Telnyx | Optional |
| `DEEPGRAM_API_KEY` | Deepgram | Required |
| `RESEND_API_KEY` | Resend | Optional (email disabled if absent) |
| `RESEND_FROM` | Resend | Optional |
| `INTERNAL_API_SECRET` | Internal | Required |
| `NEXT_PUBLIC_APP_URL` | CSRF/webhooks | Required |
| `UPSTASH_REDIS_REST_URL` | Upstash | Optional (rate limiting fails open) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Optional |
| `CRON_SECRET` | Vercel cron | Required |
| `ENCRYPTION_SECRET` | Encryption | Required |
| `GOOGLE_CLIENT_ID` | Google | Optional (Calendar disabled if absent) |
| `GOOGLE_CLIENT_SECRET` | Google | Optional |
| `GOOGLE_REDIRECT_URI` | Google | Optional |
| `COMPULIFE_AUTH_ID` | Compulife | One of AUTH_ID or PROXY_URL required |
| `COMPULIFE_PROXY_URL` | Compulife | One of AUTH_ID or PROXY_URL required |
| `COMPULIFE_PROXY_SECRET` | Compulife | Required with PROXY_URL |

**Gap:** No `.env.example` file exists in the repo.

---

## 10. Known Issues / Dead Code / Gaps

### Orphaned Files
1. **`components/agents/wizard-steps/purpose-step.tsx`** — Former wizard step, removed from flow but file remains
2. **`lib/constants.ts`** — Single tombstone export `DEV_AGENT_ID = "REMOVED_USE_AUTH"`
3. **`lib/voice/ensurance-prompt-compiler.ts`** — Superseded by `lib/telnyx/prompt-compiler.ts`
4. **`lib/telnyx/ai-prompts.ts`** — Partially orphaned; 4 original prompt builders superseded by `prompt-compiler.ts`

### Legacy Code
5. **`/api/ai-agent/*`** (3 routes) — Phase 7 legacy single-agent management, still active alongside newer `/api/agents/*`
6. **`lib/auth/password-rules.ts`** — Reduced relevance post-Clerk migration (Clerk handles auth UI)

### Security Gaps
7. **`TELNYX_WEBHOOK_PUBLIC_KEY`** — If absent in production, webhook signature verification is silently skipped (warning logged only)
8. **`/api/settings/billing-group`** — Missing rate limiting (all other settings endpoints have it)

### Missing Pages
9. **`/support`**, **`/privacy`**, **`/terms`** — Linked from auth layout but routes don't exist (404)

### Missing Files
10. **No `.env.example`** — Onboarding requires reading CLAUDE.md

### Placeholder Pages
11. **`/tools`** — 6 "Coming Soon" cards, no functionality
12. **`/settings/billing`** — Placeholder
13. **`/settings/team`** — Placeholder
14. **`/settings/preferences`** — Placeholder

### Documentation Mismatch
15. **`vercel.json`** cron — Only has 11 AM UTC for follow-up reminders, but CLAUDE.md mentions 7am/11am/3pm UTC runs

### Performance
16. **Google Material Symbols** loaded via raw `<link>` in root layout — render-blocking, bypasses `next/font` optimization
17. **`loading.tsx`** only exists under `/leads` — other routes have no loading UI skeleton

### Database
18. **Base schema not in migrations** — Only 7 incremental migrations present; initial schema was applied outside version control
19. **`agent_business_profile`** table uses `as any` cast in `business-profile.ts` because it's not in generated types

---

## 11. Configuration Summary

### next.config.ts
- Security headers: HSTS (2yr), X-Frame-Options DENY, CSP, nosniff
- CSP allows `unsafe-inline` for scripts (required by Next.js/Tailwind)
- No image remote patterns configured

### middleware.ts
- Clerk auth on all routes except: `/`, `/auth/*`, webhooks, cron, AI agent webhooks
- CSRF: Origin/Referer validation on all API mutations (GET/HEAD/OPTIONS exempt)

### Tailwind v4
- `@theme inline` syntax in `globals.css`
- OKLCH color space
- `--radius: 0.625rem` (10px) base with derived scale

### Vercel
- 2 cron jobs: retention (3 AM UTC), follow-up reminders (11 AM UTC)

### Package Manager
- Bun (bun.lock present)
- 40+ production dependencies
- Next.js 16.1.6, React 19.2.3, TypeScript 5.9.3
