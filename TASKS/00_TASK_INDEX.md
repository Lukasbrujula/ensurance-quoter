# Telnyx Billing Group Integration — Task Index

**Created:** 2026-03-07
**Total Tasks:** 3
**Estimated Total:** ~2 hrs
**Branch:** `feature/lukas`
**Depends on:** Clerk + Supabase auth working, Telnyx API key configured

---

## What We're Building

Per-agent Telnyx billing groups so we can track telephony costs (voice, AI agents, phone numbers) per agent. When an agent signs up via Clerk, a Telnyx billing group is automatically created and stored in Supabase. Later, phone numbers and AI assistants assigned to that agent's number will roll costs into their billing group.

---

## Execution Order

Tasks must be executed sequentially — each builds on the previous:

| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **BG-01** | Telnyx billing group API client + DB migration | 30 min | None |
| **BG-02** | Clerk webhook endpoint (`user.created` → create billing group) | 45 min | BG-01 |
| **BG-03** | Fallback check + Settings UI card | 30 min | BG-02 |

---

## Dependency Graph

```
BG-01 (API client + DB column)
  └── BG-02 (Clerk webhook creates billing group on signup)
        └── BG-03 (Fallback for existing users + Settings visibility)
```

---

## Pre-requisites (Lukas manual steps)

Before Claude Code starts BG-02:
1. Go to Clerk Dashboard → Webhooks → Add Endpoint
2. URL: `https://your-domain.com/api/webhooks/clerk` (use Vercel URL or ngrok for dev)
3. Subscribe to event: `user.created`
4. Copy the **Signing Secret** → add as `CLERK_WEBHOOK_SECRET` in `.env.local` and Vercel env vars
5. Install svix: `bun add svix`

---

## Claude Code Setup Prompt

```
Read these files in order:
1. BILLING_GROUP_TASKS/00_TASK_INDEX.md (this file — understand the full plan)
2. BILLING_GROUP_TASKS/BG-01_API_CLIENT_AND_MIGRATION.md (first task)
3. lib/telnyx/ai-service.ts (reference for how we call Telnyx APIs)
4. lib/telnyx/phone-numbers.ts (reference for Telnyx API patterns)
5. lib/supabase/settings.ts (reference for agent_settings CRUD)
6. lib/supabase/server.ts (service role client)
7. app/api/webhooks/sms/route.ts (reference for webhook pattern)
8. middleware.ts (to verify webhook route is public)

Then execute BG-01. Run `bunx tsc --noEmit` after completion.
```
