# MT-05: Scope Toggle UI

**Priority:** Medium — first user-visible multi-tenant feature
**Estimate:** 2 hrs
**Branch:** `feature/multi-tenant`

---

## 1. Model
Sonnet. UI component work with clear patterns.

## 2. Tools Required
- Codebase access (components, stores, pages)
- `MULTI_TENANT_AUDIT.md` Section 6 (component data-fetching patterns)
- shadcn/ui components (Tabs or ToggleGroup)
- `bunx tsc --noEmit`

## 3. Guardrails
- Do NOT render the toggle when `orgId` is null — solo agents see no change
- Do NOT modify any shadcn/ui base components
- Do NOT change the data-fetching pattern — just add the `scope` parameter to existing fetch calls
- Do NOT build a new org store yet — use Clerk's `useAuth()` hook directly for `orgId`
- The default scope is ALWAYS 'personal' for agents, 'team' for owners

## 4. Knowledge
Five pages need the toggle: `/leads`, `/pipeline`, `/dashboard`, `/inbox`, `/history`. Each fetches data differently (MULTI_TENANT_AUDIT.md Section 6):
- `/leads` + `/pipeline`: `useLeadStore.hydrateLeads()` → `fetchLeadsAction()` server action
- `/dashboard`: `fetch('/api/dashboard/stats')` in `useEffect`
- `/inbox`: `fetch('/api/inbox/conversations')` in `useCallback` with 30s polling
- `/history`: `fetch('/api/activity-log/history')` with filters

The toggle is a small segmented control: "My Data" | "Team". It sets a `scope` state that gets passed to the data-fetching function. When scope changes, data refetches.

## 5. Memory
- `useAuth()` from `@clerk/nextjs` provides `orgId` and `orgRole` client-side
- `useLeadStore` is 620 lines — `hydrateLeads()` needs to accept scope param
- Pipeline uses the same LeadStore — no separate data source
- Dashboard polls on mount — scope change should trigger re-fetch

## 6. Success Criteria
- [ ] Toggle component exists as a shared component (e.g., `components/shared/scope-toggle.tsx`)
- [ ] Toggle renders on /leads, /pipeline, /dashboard, /inbox, /history ONLY when user has orgId
- [ ] Toggle is completely absent (not hidden, not disabled — absent from DOM) for solo agents
- [ ] Switching toggle refetches data with the new scope
- [ ] 'personal' scope returns same data as before this change
- [ ] 'team' scope returns org-wide data (requires test org with multiple agents)
- [ ] `bunx tsc --noEmit` passes
- [ ] Visual: toggle matches existing UI design (shadcn Tabs or ToggleGroup component)

## 7. Dependencies
- MT-04 completed (server actions and API routes accept scope parameter)
- Clerk Organizations enabled with test org (MT-01)

## 8. Failure Handling
| Error | Solution |
|-------|----------|
| `useAuth()` returns undefined orgId despite being in an org | Check that Clerk's `<OrganizationSwitcher>` is rendered somewhere, or that the active org is set programmatically |
| Toggle shows for solo agents | The render condition is `if (!orgId) return null` — verify orgId check |
| Data doesn't change on toggle | The scope param isn't being passed to the fetch. Check that `hydrateLeads(scope)` actually calls `fetchLeadsAction(scope)` |

## 9. Learning
- Document which pages needed the most changes to support scope toggle.
- Note if the LeadStore needed structural changes beyond adding a scope parameter.
