# Task: P3-05-legacy-cleanup

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

- **Model**: sonnet
- **Tools**: Antigravity (Claude Code)
- **Human Checkpoint**: Confirm no pages break after cleanup

## Description

Remove ~36 legacy prototype components and the old dashboard route that are superseded by the current quote/leads architecture. This dead code causes confusion for Claude Code sessions (it reads irrelevant files) and inflates the codebase. The landing page components in `components/landing/` are NOT legacy — those stay.

## Research First

Before deleting anything, Claude Code must:
1. Search the entire codebase for imports from the directories being removed
2. Confirm no active page/component references any of these files
3. Check if `app/dashboard/page.tsx` is linked from anywhere (nav, redirects, etc.)

## Directories to Evaluate for Removal

### Likely safe to remove entirely:
- `components/atoms/` — Legacy atomic components (Button, Input, etc.) superseded by shadcn/ui `components/ui/`
- `components/molecules/` — Legacy molecules superseded by `components/quote/` and `components/leads/`
- `components/organisms/` — Legacy organisms (QuoteEngineHeader, MarketComparisonTable, etc.)
- `components/templates/` — Legacy page templates

### Routes to evaluate:
- `app/dashboard/page.tsx` — Prototype dashboard, superseded by `/leads` and `/quote`
- `app/dashboard/profile/` — No auth system, no user profile
- `app/dashboard/payment/` — No payment integration

### Keep:
- `components/landing/` — Active marketing page (used by `app/page.tsx`)
- `components/auth/` — Auth forms (UI scaffolds, needed for future auth)
- `components/ui/` — shadcn/ui (NEVER touch)
- `app/dashboard/` layout if it's referenced by payment/profile routes being kept

## Process

1. **Audit imports**: `grep -r "from.*components/atoms" --include="*.tsx" --include="*.ts"` (repeat for molecules, organisms, templates)
2. **Audit dashboard route**: Check TopNav links, any redirects to /dashboard
3. **Remove with confidence**: Only delete files with ZERO active imports
4. **Redirect /dashboard**: If removing the page, add a redirect to `/leads` in `next.config.ts` or a simple redirect page
5. **Run tsc**: Confirm no broken imports

## Safety Rules
- **NEVER delete** anything in `components/ui/`
- **NEVER delete** `components/landing/`
- **Check twice, delete once** — grep before removing each directory
- If ANY active import exists, keep the file and document why

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. All active pages render correctly (/, /leads, /leads/[id], /quote, /settings)
3. No broken imports anywhere
4. /dashboard either removed or redirects to /leads
5. Codebase is smaller and cleaner for future Claude Code sessions

## On Completion
- Update CLAUDE.md to remove references to deleted directories
- Update CODEBASE_AUDIT.md if it exists
- Commit: `chore: remove legacy dashboard and superseded prototype components`
