# Ensurance — Product Feature Reference

> Last updated: 2026-03-06. This is the single source of truth for all product features, their status, and how they work.

---

## A. Quote Engine

### Product Types

| Product | Tab Status | How It Works |
|---------|------------|-------------|
| **Term Life** | Active | 10/15/20/25/30/35/40-year terms. Compulife API pricing with mock fallback. |
| **Final Expense** | Active | Category Y. Simplified whole life ($5K-$50K). Level/Graded/Guaranteed Issue. Age >= 45. Health class forced to "R" (Standard). NY uses state code 52. |
| **IUL** | Coming Soon | Placeholder tab with lock screen. |
| **Annuities** | Coming Soon | Placeholder tab with lock screen. |

### Intake Form Fields

**Core (required):** Name, Age (18-85), Gender (M/F), State, Coverage ($100K-$10M slider), Term Length, Tobacco Status

**Optional:**
- Nicotine type (cigarettes, vaping, cigars, smokeless, pouches, marijuana, NRT)
- Height (ft/in) + Weight (lbs) — feeds build chart + Health Analyzer
- Medical conditions — 18 searchable conditions via combobox
- Medications — 92+ entries from `rx-names.ts` via combobox
- DUI history + years since

**Product Toggles:**
- Include ROP (Return of Premium) — needs term 15/20/25/30
- Term-to-Age — dropdown age 65-110
- Include Table Ratings (T1-T4) — substandard risk pricing
- Include Universal Life — with pay structure sub-select (Pay to 121/100/65, 20 Pay, 10 Pay, Single Pay)
- Compare Terms — parallel pricing across all term lengths
- Include Final Expense — age >= 45 conditional

**Advanced Underwriting (collapsible):**
- Blood pressure: systolic, diastolic, on BP medication
- Cholesterol: total level, HDL ratio, on cholesterol medication
- Family history: heart disease before 60, cancer before 60
- Substance history: alcohol treatment + years since, drug treatment + years since

### Eligibility / Knockout System

Hard knockouts (carrier removed from results, shown in "Ineligible" section):

| Check | Source | Coverage |
|-------|--------|----------|
| State unavailability | `carriers.ts` state arrays | All 38 carriers |
| Age out of range | Product age min/max | All 38 carriers |
| Coverage out of range | Product face amount limits | All 38 carriers |
| DUI decline | Carrier DUI rules + lookback | All 38 carriers |
| Build chart fail | Height/weight limits | 11 carriers with build data |
| Medical condition DECLINE | `medicalConditions[]` structured rules | 14 carriers with structured data |
| Rx medication DECLINE | `prescriptionExclusions[]` | 14 carriers (379+ Rx entries) |
| Combination decline | `combinationDeclines[]` (2+ conditions) | 14 carriers |

Informational (carrier still shown, warning displayed):
- Medical condition REVIEW/CONDITIONAL — yellow warning icon
- Rx REVIEW — yellow warning icon
- Health Analyzer "nogo" — red traffic light
- Health Analyzer "unknown" — amber traffic light

### Health Analyzer (Compulife)

Three response values per carrier:
- **"go"** → green circle ✓ — likely eligible
- **"no"** (normalized to "nogo") → red circle ✕ — likely ineligible
- **"?"** (normalized to "unknown") → amber circle ? — insufficient data

Fields sent automatically when available:
- Height/weight (Feet, Inches, Weight)
- DUI (DoDriving + all driving sub-fields)
- Tobacco detail (DoCigarettes, DoCigars, DoChewingTobacco, DoNicotinePatchesOrGum)
- Blood pressure (systolic, diastolic, medication)
- Cholesterol (level, HDL ratio, medication)
- Family history (heart disease, cancer)
- Substance abuse (alcohol, drug, years since)

Zero extra API calls — fields go into existing pricing requests.

### Pricing

- **Compulife API** (`compulifeapi.com`) — real carrier pricing, 75+ carriers per quote
- **Railway proxy** — fixed outbound IP for production (Vercel dynamic IPs)
- **Mock fallback** — formula-based when Compulife unavailable or unsupported terms (35/40yr)
- **ModeUsed: "ALL"** — returns monthly, quarterly, semi-annual, annual premiums
- **Rate class spread** — parallel PP/P/RP/R calls per carrier

### Payment Mode Selector (Carrier Detail Modal)

Shows monthly/quarterly/semi-annual/annual toggle when Compulife returns all modes. Falls back to monthly + annual grid when only those are available.

### Match Scoring

Proprietary 0-99 scale. Factors:
- AM Best rating (A+ weighted highest)
- E-sign capability bonus
- Vape-friendly bonus (Foresters only)
- Price rank (normalized)
- Medical condition acceptance count
- State eligibility
- Rx/combo decline penalty

### Carrier Data

| Tier | Count | Data Available |
|------|-------|---------------|
| **Fully enriched** | 14 | Medical conditions, Rx exclusions, combo declines, living benefits, rate class criteria, build charts |
| **Basic** | 24 | Products, state availability, tobacco rules, DUI rules, AM Best rating |

Fully enriched: amam, foresters, moo, sbli, transamerica, americo, uhl, aig, americanhomelife, baltimore, betterlife, gtl, illinoismutual, pekin

---

## B. CRM / Lead Management

### Lead CRUD
- **Create**: Manual dialog, CSV bulk import, intake form, AI agent webhook
- **Read**: Sortable/filterable table, search, detail view at `/leads/[id]`
- **Update**: Inline edits with dirty-field tracking, status dropdown, follow-up scheduling
- **Delete**: Soft-delete via "dead" status

### CSV Import
Upload → auto-detect columns → mapping UI → preview → bulk create with activity logging.

### Pipeline / Kanban
6 status stages: New → Contacted → Quoted → Applied → Issued → Dead.
Drag-and-drop cards via `@dnd-kit`. Status changes logged to activity timeline.

### Follow-ups
- Date/time picker + quick presets (1hr, tomorrow, next Mon/Fri)
- Urgency badges: overdue (red), today (amber), upcoming (blue)
- Cron job sends agent digest email at 7am/11am/3pm UTC weekdays

### Activity Timeline
11 activity types logged chronologically: lead_created, status_change, call, quote, enrichment, follow_up, note, lead_updated, email_sent, sms_sent, sms_received.

### Notes
Timestamped agent notes per lead. Add/delete. Newest-first.

### Quote History
Per-lead quote snapshots with re-run, copy summary, and email actions.

---

## C. Calling

### WebRTC (Telnyx)
Outbound calling from lead detail. Features: caller ID, duration timer, mute, hang up, DTMF keypad.

### Live Transcription (Deepgram)
Nova-3 model. PCM audio streamed via POST, transcript returned via SSE. Speaker labels, word-level timestamps.

### Coaching Hints
Every 30s during calls: DISC style, medication flags, life event cross-sell, general tips. GPT-4o-mini, 5s timeout, auto-deduplicated.

### Call Logging
Per-lead call history: date, duration, direction, provider. Expandable with transcript viewer and AI-generated 3-sentence summary.

### AI Voice Agents (Inbound)
3-step setup wizard (business → personality → collection fields). Telnyx AI Assistants API. Spanish language toggle. Webhook extracts data → creates lead → logs call. Multi-agent management with usage dashboard.

---

## D. AI Features

| Feature | Model | Trigger |
|---------|-------|---------|
| **Chat Assistant** | GPT-4o-mini (streaming) | User types in sidebar panel |
| **Proactive Insights** | GPT-4o-mini (JSON) | Intake/quote change (2s debounce) |
| **PDL Enrichment** | People Data Labs API | Agent clicks enrich button |
| **Coaching Cards** | GPT-4o-mini (JSON) | 30s interval during active calls |
| **Call Summary** | GPT-4o-mini | Post-call automatic |

---

## E. Communication

### Email
- **Quote Summary** — Agent-triggered, branded HTML, top 3 carriers, via Resend SDK
- **Follow-up Reminders** — Cron-driven agent digest with urgency badges

### SMS
Send/receive via Telnyx. Activity logged. Per-lead thread.

### Notifications
Derived (computed on-demand): overdue follow-ups, upcoming callbacks, AI agent calls, recent activities. Bell icon with badge count + slide-out panel.

---

## F. Settings

| Page | Route | What It Does |
|------|-------|-------------|
| **Profile** | `/settings/profile` | Name, email, phone, license, agency, bio |
| **Commissions** | `/settings/commissions` | Default rate + per-carrier overrides |
| **Business Knowledge** | `/settings/business` | Business name, hours, KB (URL/file/text), FAQ |
| **Phone Numbers** | `/settings/phone-numbers` | Buy/manage Telnyx numbers, set primary |
| **Licenses** | `/settings/licenses` | Per-state insurance license tracking |
| **Integrations** | `/settings/integrations` | Google Calendar OAuth + 6 coming soon |
| **Usage** | `/settings/usage` | Phone/call costs, agent usage breakdown |

---

## G. Dashboard

- **4 stat cards**: Total Leads, Calls Made, Quotes Generated, AI Agents
- **Calendar**: Google Calendar sync, week + month views, event CRUD
- **Activity Feed**: Last 20 activities with load more

---

## H. Auth & Security

| Layer | Implementation |
|-------|---------------|
| **Auth** | Supabase Auth, cookie-based sessions, email + password |
| **Password** | 10+ chars, mixed case, numbers, special chars |
| **RLS** | All 11 tables user-scoped |
| **Rate Limiting** | 5-tier Upstash Redis (api/auth/ai/enrichment/quote) |
| **CSRF** | Origin/Referer validation + custom header fallback |
| **Webhooks** | Telnyx ED25519 signature verification + replay protection |
| **API Auth** | Session cookies OR shared secret (INTERNAL_API_SECRET) |

---

## I. Database (11 Tables)

leads, call_logs, ai_agents, ai_agent_calls, ai_transcripts, agent_settings, quotes, enrichments, activity_logs, google_integrations, lead_notes

---

## J. Feature Status Matrix

| Feature | Status | Key Files |
|---------|--------|-----------|
| Term Life Quoting | ✅ Full | `intake-form.tsx`, `carrier-results.tsx`, `quote/route.ts` |
| Final Expense Quoting | ✅ Full | Same + category Y override |
| IUL Quoting | 🔒 Coming Soon | `quote-page-client.tsx` placeholder |
| Annuities Quoting | 🔒 Coming Soon | `quote-page-client.tsx` placeholder |
| Eligibility Engine | ✅ Full | `eligibility.ts`, `build-chart.ts` |
| Health Analyzer | ✅ Full | `compulife-provider.ts` |
| Medical Knockouts | ✅ Full | `eligibility.ts` → `checkStructuredMedicalEligibility()` |
| Rx Screening | ✅ Full | `eligibility.ts` → `checkPrescriptionScreening()` |
| Ineligible Carriers Display | ✅ Full | `carrier-results.tsx` collapsible section |
| Lead CRM | ✅ Full | `lib/supabase/leads.ts`, `lead-list.tsx` |
| Pipeline/Kanban | ✅ Full | `kanban-board.tsx` |
| Follow-ups + Reminders | ✅ Full | `follow-up-picker.tsx`, cron job |
| WebRTC Calling | ✅ Full | `lib/telnyx/`, `call-button.tsx` |
| Live Transcription | ✅ Full | `lib/deepgram/`, `transcript-view.tsx` |
| Coaching Hints | ✅ Full | `lib/coaching/`, `coaching-card-stack.tsx` |
| AI Voice Agents | ✅ Full | `lib/telnyx/ai-*.ts`, `agents/` |
| Chat Assistant | ✅ Full | `ai-assistant-panel.tsx`, `/api/chat` |
| PDL Enrichment | ✅ Full | `lead-enrichment-popover.tsx`, `/api/enrichment` |
| Email Quotes | ✅ Full | `email-quote-dialog.tsx`, Resend SDK |
| SMS | ✅ Full | `/api/sms`, Telnyx |
| Notifications | ✅ Full | `notification-bell.tsx` |
| Dashboard | ✅ Full | `dashboard-client.tsx` |
| Google Calendar | ✅ Full | `lib/google/`, OAuth2 |
| Rate Limiting | ✅ Full | Upstash Redis, 5 tiers |
| CSRF + Webhook Auth | ✅ Full | `lib/middleware/` |
| Supabase RLS | ✅ Full | All 11 tables |
