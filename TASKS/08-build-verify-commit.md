# Task: 08-build-verify-commit

## Status
- [x] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

## Pillars

### 1. Model
sonnet

### 2. Tools Required
- [x] Bash: `bunx tsc --noEmit`, `bun run build`, `git add`, `git commit`, `git push`
- [ ] Read, Edit, Write (only if fixing build errors)
- [ ] Grep, Glob
- [ ] WebFetch
- [ ] Task

### 3. Guardrails (DO NOT)
- [ ] Do NOT push to `main` — push to `feature/lukas` only
- [ ] Do NOT force push
- [ ] Do NOT skip build verification

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)

### 5. Memory
- [x] N/A

### 6. Success Criteria
- [ ] `bunx tsc --noEmit` exits 0 (zero type errors)
- [ ] `bun run build` succeeds with no errors
- [ ] All changes committed with descriptive message
- [ ] Pushed to `feature/lukas`

### 7. Dependencies
- [x] All previous tasks (01-07) must be complete

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] If tsc fails: fix type errors (read error output, fix the specific file)
- [ ] If build fails: read build output, fix the specific issue
- [ ] If push fails: check branch name, check remote

**After max attempts exhausted:**
- [ ] Save full error output to `ERRORS/08-build-verify-commit.md` and STOP

**Rollback command:** `git reset HEAD~1` (if commit was bad)

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Build errors caused by specific task changes

---

## Human Checkpoint
- [x] **NONE** - proceed automatically

---

## Description
Final verification pass. Run TypeScript check and production build to catch any issues across all tasks. Commit and push everything.

## Steps
1. Run `bunx tsc --noEmit` — if errors, fix them
2. Run `bun run build` — if errors, fix them
3. `git add -A`
4. `git status` — review what's being committed (sanity check)
5. `git commit -m "feat: proxy integration, UX polish (searchable meds/state, editable age), production hardening (Redis rate limit, disclaimers)"`
6. `git push origin feature/lukas`

## On Completion
- **Commit:** (this task IS the commit)
- **Update:** [x] CODEBASE_AUDIT.md (update with new components/features added)
- **Handoff notes:** Code is pushed. Lukas needs to complete manual steps: (1) Push compulife-proxy to separate GitHub repo, (2) Deploy to Railway, (3) Create Upstash Redis instance, (4) Add all new env vars to Vercel, (5) Configure Resend SMTP in Supabase dashboard.
