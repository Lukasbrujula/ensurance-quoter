# Phase 9: Security Hardening — Task Index

**Created:** 2026-02-23
**Total Tasks:** 6
**Estimated Total:** ~6 hrs
**Branch:** `feature/lukas`
**Depends on:** Phase 8 complete

---

## What We're Fixing

Phase 3 and 4 security passes fixed 23 vulnerabilities. This phase closes the remaining known gaps: rate limiting that actually works in serverless, RLS as a true safety net (not just a policy that gets bypassed by service role), and the standard web security hardening (CSRF, enumeration, passwords, webhook verification).

This is all code-only work. No external dependencies, no new services, no waiting on anyone.

---

## Execution Order

All tasks are independent. Can be executed in any order, but this sequence minimizes merge conflicts:

| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T9.1** | Redis rate limiter (replace in-memory Map with Upstash Redis) | 1 hr | None |
| **T9.2** | Service role to auth client migration (RLS-respecting queries everywhere) | 1.5 hrs | None |
| **T9.3** | Email enumeration protection (generic auth error messages) | 30 min | None |
| **T9.4** | CSRF protection (origin validation + custom header on mutations) | 45 min | None |
| **T9.5** | Password policy hardening (complexity rules + breach check) | 30 min | None |
| **T9.6** | Webhook signature verification (Telnyx webhook security) | 45 min | None |

---

## Dependency Graph

```
No interdependencies — all tasks can run in parallel or any order.
Recommended sequence for cleanest diffs: T9.1 -> T9.2 -> T9.3 -> T9.4 -> T9.5 -> T9.6
```

---

## Claude Code Setup

```
Read these files first:
1. CODEBASE_AUDIT.md — pay special attention to sections 5 (Auth System), 7 (Database/RLS), and 10 (Known Gaps / Technical Debt)
2. CLAUDE.md — architecture and conventions
3. PHASE9_TASKS/PHASE9_TASK_INDEX.md

Before each task:
1. Read the task file (all 9 pillars)
2. Verify file paths with find/ls
3. Read each dependency file
4. Cross-reference against actual codebase
5. Plan before writing
6. Run npx tsc --noEmit after each task

Rules:
- Do NOT modify components/ui/ or styles/globals.css
- Do NOT change any user-facing behavior (these are invisible security improvements)
- Do NOT break existing tests or type checks
- Codebase is source of truth
- Every change must be backward-compatible — nothing should break for existing users

Start with T9.1.
```
