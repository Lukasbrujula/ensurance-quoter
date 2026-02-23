# Phase 4: Authentication & User System

## Overview

Implement real authentication using Supabase Auth so agents can create accounts, log in, and only see their own data. This replaces the hardcoded DEV_AGENT_ID and localStorage-based settings with a proper user system.

## Tasks

| Task | Model | Effort | Description |
|------|-------|--------|-------------|
| P4-01 | sonnet | 45 min | Auth infrastructure: helpers, middleware, provider, callback route |
| P4-02 | sonnet | 45 min | Wire auth pages + protected routes + nav user info + sign out |
| P4-03 | sonnet | 45 min | Replace hardcoded agent ID everywhere + RLS policies on all tables |
| P4-04 | sonnet | 30 min | Migrate commission settings from localStorage to Supabase |

## Dependency Graph

```
P4-01 (auth infrastructure) ─── must be first, everything else needs this
  ├── P4-02 (auth pages + protected routes) ─── independent after 01
  ├── P4-03 (agent ID + RLS) ─── independent after 01
  └── P4-04 (commission migration) ─── independent after 01
```

P4-02, P4-03, and P4-04 are all independent of each other. Only P4-01 is a hard prerequisite.

## Pre-requisites (Lukas manual steps in Supabase Dashboard)

Before Claude Code starts P4-01:
1. Go to Supabase Dashboard → Authentication → Providers
2. Confirm Email/Password provider is enabled
3. Go to Authentication → URL Configuration
4. Set Site URL to `http://localhost:3000` (dev)
5. Add redirect URLs: `http://localhost:3000/auth/confirm`, `http://localhost:3000/auth/password/reset`
6. Optional: Customize email templates for confirm/reset

## What Changes

### Before (current)
- Anyone can access any page by navigating to the URL
- API endpoints use shared secret OR no auth (dev mode)
- `DEV_AGENT_ID = "dev-agent-001"` hardcoded in lib/constants.ts
- Commission settings in localStorage (not user-scoped, lost on cache clear)
- No RLS on any Supabase table

### After (Phase 4 complete)
- `/auth/*` pages are public, everything else requires login
- API endpoints validate Supabase session cookies (shared secret still works for server-to-server)
- Real user UUID from Supabase `auth.users` used as agent_id
- Commission settings stored in Supabase `agent_settings` table
- RLS policies ensure agents only see their own data at the database level
- TopNav shows real user info with sign out
