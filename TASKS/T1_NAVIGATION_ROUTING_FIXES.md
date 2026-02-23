# T1: Navigation & Routing Fixes

**Priority:** High — eliminates first-impression confusion  
**Estimate:** 30 min  
**Phase:** 5 (UI Polish)

---

## Context

The current navigation has several confusing behaviors:
- Clicking the "Ensurance" logo navigates to `/leads` (CRM) instead of the quoter — the core product
- "Quick Quote" label in the top nav is confusing — implies a secondary/simplified version when it IS the main product
- After signup confirmation, users land on `/leads` (an empty CRM page) instead of the quoter
- No contextual back-navigation anywhere — users must use browser back button

## Tasks

### 1. Logo destination → `/quote`
- In `components/navigation/top-nav.tsx` (or wherever the logo/brand link lives), change the logo `href` from `/leads` to `/quote`
- The quoter is the core product — it should be home base for authenticated users

### 2. Rename "Quick Quote" nav item
- Rename to just **"Quotes"** in the top nav
- If the logo already goes to `/quote`, evaluate whether this nav item is even needed (could remove to reduce clutter)
- If kept, it should remain linked to `/quote`

### 3. Post-signup redirect → `/quote`
- In `app/auth/callback/route.ts`, change the post-confirmation redirect from `/leads` to `/quote`
- Also check `middleware.ts` — if there's a default authenticated redirect, it should be `/quote`

### 4. Add contextual back links
- `/leads/[id]` — Add "← Back to Leads" link above the lead detail header
- `/settings` — Add "← Back to Quotes" link (or breadcrumb: Ensurance > Settings)
- Use a consistent pattern: `<Link href="..." className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft size={14} /> Back to X</Link>`

---

## Success Criteria

- [ ] Clicking "Ensurance" logo from any page navigates to `/quote`
- [ ] Top nav shows "Quotes" (not "Quick Quote")
- [ ] After email confirmation + callback, user lands on `/quote`
- [ ] `/leads/[id]` has visible "← Back to Leads" link
- [ ] `/settings` has visible back navigation
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] All existing navigation still works (Leads, Settings links unchanged)

## Dependencies

- `components/navigation/top-nav.tsx` — Logo link, nav items
- `app/auth/callback/route.ts` — Post-confirmation redirect
- `middleware.ts` — Default redirect logic
- `app/leads/[id]/page.tsx` or `components/leads/lead-detail.tsx` — Back link placement
- `app/settings/page.tsx` — Back link placement

## Guardrails

- Do NOT modify auth logic — only the redirect destination
- Do NOT change route protection rules in middleware
- Do NOT rename route paths (keep `/quote`, `/leads`, `/settings`)
- Do NOT modify landing page (`/`) navigation — that has its own nav for public users

## Failure Handling

- If callback redirect breaks auth flow, revert to `/leads` and debug the redirect chain
- If middleware has conflicting redirect logic, check for `redirectTo` query params that might override
