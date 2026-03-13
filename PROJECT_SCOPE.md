# Project Scope — Ensurance

## Vision

Ensurance is a full-stack insurance agent command center that combines carrier underwriting intelligence, real-time quoting, lead management, telephony, AI voice agents, SMS, and an AI underwriting assistant into a single platform. Agents go from cold CSV lead to quoted, called, and closed — without leaving the platform.

**One-liner:** The agent command center that turns lead lists into closed policies.

## Goals

- [x] Quote engine with carrier intelligence (tobacco, medical, DUI, state filtering)
- [x] AI assistant panel with proactive insights
- [x] PDL lead enrichment (80+ fields)
- [x] Three-column layout (intake / results / AI)
- [x] Lead CRM — CSV upload, lead list, lead detail, persistence
- [x] Enrichment → Quote pipeline — one-click enrich → auto-fill → agent runs quote
- [x] Telnyx calling — outbound dialer, WebRTC in-browser, transcription
- [x] AI voice agents — inbound call handling, multi-agent, transcripts
- [x] Live AI assistant — real-time transcript analysis, carrier suggestions mid-call
- [x] Real pricing — Compulife API with DigitalOcean Droplet proxy for production
- [x] Authentication — Clerk with JWKS-based Supabase RLS
- [x] Resizable panels — dynamic three-column layout with collapse/close
- [x] SMS — inbound/outbound, conversation threading, webhook-driven
- [x] Dashboard — stats, follow-ups, activity feed, calendar
- [x] Pipeline — Kanban board with drag-and-drop
- [x] Email — quote summaries, follow-up reminders (Resend)
- [x] Google Calendar — OAuth integration, event sync
- [x] Security hardening — rate limiting, CSRF, webhook verification
- [x] Telnyx billing groups — per-agent cost tracking, auto-provisioned
- [x] Underwriting assistant — standalone AI chat with carrier context + live pricing tool

## Upcoming / In Progress

- [ ] UA-03: Underwriting assistant polish (conversation history, follow-up suggestions, mobile)
- [ ] Final Expense intelligence expansion (structured medical data for FE carriers)
- [ ] Analytics dashboard (conversion rates, quote-to-application metrics)
- [ ] Multi-agency / white-label support
- [ ] Mobile-optimized responsive pass

## Non-Goals (Explicitly Out of Scope)

- Native mobile app — web-only
- Whole life / IUL quoting beyond Final Expense — term life + FE only
- Auto-quoting without agent review — agent always controls when quotes run
- AI for premium calculations — deterministic if/else only (legal liability)

## Completed Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | Lead CRM Foundation | Complete |
| 2 | Quote Engine + Intelligence | Complete |
| 3 | Telnyx Calling + Transcription | Complete |
| 4 | Supabase Auth + User Scoping | Complete |
| 5 | UI Polish + Settings | Complete |
| 6 | Lead Data Expansion + CRM | Complete |
| 7 | Telnyx AI Agent — Inbound | Complete |
| 8 | Agent Management + Transcripts + Usage | Complete |
| 9 | Security Hardening | Complete |
| 10 | Dashboard + UX Polish | Complete |
| 10b | CRM Pipeline | Complete |
| 10c | Notes + Kanban + Notifications | Complete |
| 11 | Compulife Integration | Complete |
| 12 | Clerk Migration | Complete |
| BG | Telnyx Billing Groups | Complete |
| UA | Underwriting Assistant | UA-01 + UA-02 Complete, UA-03 Pending |

See `docs/PHASE_HISTORY.md` for detailed implementation records.

## Dependencies (All Active)

- [x] OpenAI API key (GPT-4o-mini) — active
- [x] People Data Labs API key — active (free tier)
- [x] Supabase project — active (14 tables, RLS on all)
- [x] Compulife API — active (cloud API + DigitalOcean Droplet proxy)
- [x] Telnyx account — active (calling, SMS, AI Assistants, billing groups)
- [x] Clerk — active (auth, user management, webhooks)
- [x] Upstash Redis — active (rate limiting)
- [x] Resend — active (transactional email)
- [x] Deepgram — active (live transcription)
- [x] Google Calendar — active (OAuth, event sync)
- [x] Vercel — deployed at ensurance-quoter.vercel.app

## Architecture Notes

### Current State (Production)
- 38 carriers with intelligence data (14 fully enriched with medical/Rx/combo declines)
- Real Compulife pricing via DigitalOcean Droplet proxy
- Clerk auth with Supabase RLS via JWKS
- 14 database tables with row-level security
- 4 Zustand stores (lead, UI, commission, call)
- Vercel AI SDK streaming for all AI features
- Telnyx for voice (WebRTC outbound + AI inbound), SMS, and billing
- Standalone underwriting assistant with carrier context grounding

### Key Architectural Decisions
1. **Clerk over Supabase Auth** — hosted UI, JWKS-based JWT for Supabase RLS, webhook-driven provisioning
2. **Zustand over Context** — simpler than Redux, works with server components, persist middleware
3. **Lead as first-class entity** — everything (enrichment, quotes, calls) attaches to a lead record
4. **Telnyx for all telephony** — outbound WebRTC, inbound AI Assistants, SMS, billing groups
5. **Agent controls the flow** — no auto-quoting, no auto-calling. AI assists, agent decides
6. **Deterministic pricing** — no AI/ML for premiums, if/else + Compulife lookups only (legal liability)
7. **Grounded AI** — underwriting assistant uses closed-set responses from carrier data, never hallucinated

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Compulife API downtime | Medium | Low | Mock pricing fallback, composite provider pattern |
| Telnyx service disruption | High | Low | Billing group fallback creation, error-tolerant webhooks |
| PDL free tier data limitations | Low | High | Age estimation fallback, upgrade when revenue justifies |
| Context window limits on carrier data | Medium | Medium | Module-level caching in build-context.ts, selective context loading |

## Human Checkpoints

- [ ] Telnyx number purchase (real money)
- [ ] Production deployment changes
- [ ] Database migrations
- [ ] API key rotation
- [ ] Billing group cleanup

## Recommended Agents

| Agent | Use For |
|-------|---------|
| planner | Complex features, refactoring |
| architect | System design, database schema |
| database-reviewer | Supabase schema, RLS, migrations |
| code-reviewer | Component quality, TypeScript patterns |
| ui-reviewer | Lead list/detail views, responsive design |
| security-reviewer | Auth flow, API key management, webhook verification |
| build-error-resolver | Integration issues, type errors |
