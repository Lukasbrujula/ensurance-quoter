# MT-06: Team Settings Page

**Priority:** Medium — org management UI
**Estimate:** 1.5 hrs
**Branch:** `feature/multi-tenant`

---

## 1. Model
Sonnet. Clerk provides pre-built components that do the heavy lifting.

## 2. Tools Required
- `@clerk/nextjs` — `<OrganizationProfile />`, `<OrganizationSwitcher />`, `<CreateOrganization />`
- shadcn/ui components
- `CODEBASE_AUDIT.md` for existing settings page patterns
- `bunx tsc --noEmit`

## 3. Guardrails
- Do NOT build custom org management UI — use Clerk's pre-built components first
- Do NOT modify the settings sidebar layout for solo agents — `/settings/team` only appears when orgId is present
- Do NOT auto-create orgs — users explicitly create them
- Do NOT change any other settings page

## 4. Knowledge
`/settings/team` is currently a placeholder "Coming Soon" card (CODEBASE_AUDIT.md Section 1, line 56). Replace it with real functionality. The settings sidebar (`components/settings/settings-sidebar.tsx`) controls which links appear. Add conditional rendering: show "Team" link only when `orgId` is present.

Clerk's `<OrganizationProfile />` provides: member list, invite members, role management, org settings, domain verification. This single component handles 80% of what's needed. Wrap it in the existing settings page layout.

Also add `<OrganizationSwitcher />` to the TopNav for users with orgs. This lets agents switch between orgs (Phase 2) or activate/deactivate org context. Solo agents without orgs see nothing.

## 5. Memory
- Settings sidebar is at `components/settings/settings-sidebar.tsx`
- TopNav is at `components/layout/top-nav.tsx`
- Settings pages use the layout at `app/settings/layout.tsx`
- Clerk's `useAuth()` provides `orgId` for conditional rendering

## 6. Success Criteria
- [ ] `/settings/team` shows Clerk's `<OrganizationProfile />` when user has an org
- [ ] `/settings/team` shows a "Create Team" CTA when user has no org (links to org creation)
- [ ] Settings sidebar shows "Team" link only when user has orgId (or always shows it with the CTA)
- [ ] `<OrganizationSwitcher />` appears in TopNav for org members
- [ ] `<OrganizationSwitcher />` is absent for solo agents
- [ ] Inviting a member via the Clerk UI sends an invite email
- [ ] Invited member can accept and join the org
- [ ] `bunx tsc --noEmit` passes

## 7. Dependencies
- MT-01 completed (Clerk Organizations enabled)
- Clerk's Organization features available in the plan (check Clerk pricing)

## 8. Failure Handling
| Error | Solution |
|-------|----------|
| `<OrganizationProfile />` renders blank | Clerk Organizations may not be enabled. Check Dashboard → Organizations → Enable. |
| Invite emails don't send | Check Clerk email configuration. May need custom email template. |
| Styling doesn't match app | Clerk components accept `appearance` prop for theming. Match to existing Tailwind variables. |

## 9. Learning
- Document which Clerk appearance customizations were needed to match the app's design system.
- Note if any Clerk component required wrapping or augmentation.
