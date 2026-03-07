# Clerk Migration — Task Index

**Created:** March 2026
**Branch:** `feature/lukas`
**Total Tasks:** 7 (6 Claude Code + 1 manual SQL)
**Estimated Total:** ~2.5 hours Claude Code + 20 min manual

---

## What We're Doing

Replacing Supabase Auth with Clerk for authentication. Supabase stays as the database + RLS layer. Clerk becomes the identity provider. All carrier intelligence, quote engine, Telnyx calling, and data layer logic is untouched — only auth changes.

---

## Prerequisite (Lukas — before ANY tasks)

Before handing anything to Claude Code, you must:

1. Create a Clerk account at clerk.com (free)
2. Create an application called "Ensurance"
3. Choose auth methods: Email/Password (required)
4. Copy API keys: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`
5. Enable Supabase integration in Clerk Dashboard → Integrations → Supabase
6. Copy the Clerk Domain shown
7. In Supabase Dashboard → Authentication → Sign In / Up → Add provider → Clerk → paste Clerk Domain
8. Add both Clerk env vars to `.env.local` AND Vercel environment settings

---

## Execution Order

| Task | Description | Executor | Effort | Depends On |
|------|-------------|----------|--------|------------|
| **CK-01** | Install Clerk SDK + ClerkProvider + Middleware | Claude Code | 20 min | Prerequisites |
| **CK-02** | Replace auth pages with Clerk components + delete old auth | Claude Code | 15 min | CK-01 |
| **CK-03** | Create Clerk-aware Supabase client (server + browser) | Claude Code | 25 min | CK-01 |
| **CK-M1** | Supabase SQL migration: requesting_user_id(), column types, RLS | **Lukas (manual)** | 20 min | CK-03 |
| **CK-04** | Update all 13 API routes + auth-guard to use Clerk auth() | Claude Code | 30 min | CK-M1 |
| **CK-05** | Update navigation + all useAuth() refs to Clerk hooks | Claude Code | 15 min | CK-01 |
| **CK-06** | Swap data layer imports to Clerk Supabase client | Claude Code | 25 min | CK-03, CK-M1 |
| **CK-07** | Delete dead code, build check, TypeScript verification | Claude Code | 15 min | All above |

---

## Dependency Graph

```
CK-01 (SDK + Provider + Middleware)
  ├── CK-02 (Auth pages)
  ├── CK-03 (Clerk Supabase client)
  │     └── CK-M1 (SQL migration — LUKAS MANUAL)
  │           ├── CK-04 (API routes)
  │           └── CK-06 (Data layer)
  ├── CK-05 (Navigation + hooks)
  └── CK-07 (Cleanup — after ALL others)
```

---

## Claude Code Prompt

```
Read these files first:
1. CODEBASE_AUDIT.md (sections 5, 7, 8)
2. CLAUDE.md
3. CLERK_MIGRATION_TASKS/TASK_INDEX.md

Before each task:
1. Read the task file (all 9 pillars)
2. Verify file paths with find/ls against actual codebase
3. Read each dependency file listed
4. Plan before writing
5. Run npx tsc --noEmit after each task

Rules:
- Do NOT modify components/ui/ or styles/globals.css
- Do NOT install packages not listed in the task
- Codebase is source of truth — verify paths before editing
- Complete each task fully before starting the next

Start with CK-01.
```
