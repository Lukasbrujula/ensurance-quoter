# Multi-Tenant Architecture — Task Index

**Created:** 2026-03-13
**Total Tasks:** 9 (MT-00 through MT-08)
**Branch:** `feature/multi-tenant` (create from `feature/lukas` at tag `pre-multi-tenant`)
**Reference:** `MULTI_TENANT_AUDIT.md` (in project root — the codebase snapshot this plan is built from)
**Architecture Doc:** `Ensurance_Multi_Tenant_Architecture.docx` (in project knowledge base)

---

## How This Works Without Breaking Anything

The entire multi-tenant system is built on ONE principle: **`org_id` is nullable.**

- `NULL` = solo agent. Behaves exactly like today. Same queries, same RLS, same UI.
- Present = team member. Enables team visibility through dual-mode RLS policies.

Every table addition is a nullable column. Every RLS policy has a CASE/WHEN that falls back to the current `agent_id = requesting_user_id()` behavior when no org is active. Every server function returns `orgId: null` for solo agents. Every UI component checks for `orgId` before rendering team features.

**What does NOT change for solo agents:**
- Auth flow (Clerk login → redirect to /quote)
- Every existing page layout and component
- All 58 API routes (they gain optional org context but default to personal)
- All 4 Zustand stores (they load whatever the server returns)
- RLS enforcement (solo policies are the ELSE branch of new CASE/WHEN)
- Billing (Free/Pro plans unchanged; Agency plan is additive)
- All Telnyx, Deepgram, Compulife, Google integrations
- styles/globals.css, components/ui/*, all design system files

**What changes:**
- 8 tables gain a nullable `org_id` column (no data migration, no NOT NULL constraints)
- RLS policies get dual-mode CASE/WHEN (solo branch = today's policy verbatim)
- `requireClerkUser()` returns `{ id, orgId }` instead of `{ id }` (backward compatible — orgId is null for solo)
- Server actions gain optional `scope` parameter (defaults to 'personal' = today's behavior)
- 5 pages gain a scope toggle that only renders when orgId is present
- `/settings/team` placeholder becomes a real page (only visible to org members)

---

## Execution Order

**MT-00 is standalone** — fix existing bugs, no multi-tenant dependency. Can run on `feature/lukas` directly.

**MT-01 through MT-08 are sequential** — each builds on the previous. All run on `feature/multi-tenant`.

| Task | Description | Risk | Touches DB? | Touches UI? |
|------|-------------|------|-------------|-------------|
| **MT-00** | Fix 3 broken RLS policies (standalone cleanup) | Low | Yes (RLS only) | No |
| **MT-01** | Validate Clerk org_id in JWT. Create `requesting_org_id()`. | Low | Yes (function only) | No |
| **MT-02** | Add `org_id` to `leads` table. Dual-mode RLS. | Medium | Yes | No |
| **MT-03** | Add `org_id` to 7 direct-ownership tables. Dual-mode RLS. | Medium | Yes | No |
| **MT-04** | Update `requireClerkUser()`, server actions, API routes for org context. | Medium | No | No |
| **MT-05** | Scope toggle UI on /leads, /pipeline, /dashboard, /inbox, /history. | Low | No | Yes |
| **MT-06** | /settings/team page. Clerk OrganizationProfile. Invite flow. | Low | No | Yes |
| **MT-07** | Lead assignment and reassignment. | Low | No | Yes |
| **MT-08** | Agency billing plan. Org-level feature gating. | Low | Yes (Clerk config) | Yes |

---

## Claude Code Setup Prompt

```
Read these files FIRST, in this order:
1. MULTI_TENANT_AUDIT.md — the codebase snapshot showing current auth, RLS, schema, and patterns
2. .claude/TASKS/MT_TASK_INDEX.md — this file
3. The specific MT-XX task file you're about to execute

Before each task:
1. Read the task file completely (all 9 pillars)
2. Verify every file path mentioned with find/ls against the ACTUAL codebase
3. Read each dependency file listed in the task
4. Cross-reference against MULTI_TENANT_AUDIT.md
5. Plan in planning mode before writing any code
6. Run `bunx tsc --noEmit` after every change

ABSOLUTE RULES:
- Do NOT modify components/ui/* or styles/globals.css
- Do NOT modify any Telnyx integration files (lib/telnyx/*, components/calling/*)
- Do NOT modify the Compulife engine (lib/engine/compulife-provider.ts)
- Do NOT change any existing RLS policy behavior for solo agents (org_id = NULL path must be identical to current)
- Do NOT add NOT NULL constraints to org_id columns
- Do NOT auto-create organizations for existing users
- Codebase is source of truth over any documentation
- Take a Supabase backup before every migration task (MT-00, MT-01, MT-02, MT-03)

Start with MT-00.
```

---

## Dependency Graph

```
MT-00 (standalone — no dependencies, can merge independently)
  │
MT-01 (JWT validation — gate for everything else)
  │
MT-02 (leads table — unlocks child table visibility via joins)
  │
MT-03 (remaining tables — extends pattern from MT-02)
  │
MT-04 (server layer — connects DB changes to application code)
  │
  ├── MT-05 (UI toggles — needs MT-04 for scope parameter)
  ├── MT-06 (team settings — needs MT-04 for org context)
  └── MT-07 (lead assignment — needs MT-04 + MT-05)
       │
       MT-08 (billing — needs team features to exist before gating them)
```
