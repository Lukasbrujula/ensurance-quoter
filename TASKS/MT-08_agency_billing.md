# MT-08: Agency Billing Plan & Org-Level Feature Gating

**Priority:** Low — gates team features behind payment
**Estimate:** 1 hr
**Branch:** `feature/multi-tenant`

---

## 1. Model
Sonnet. Configuration and wiring work.

## 2. Tools Required
- Clerk Dashboard (create Agency plan, assign features)
- `lib/billing/feature-gate.tsx` and `lib/billing/use-feature-gate.ts`
- `MULTI_TENANT_AUDIT.md` Section 8 (current feature gating pattern)
- `bunx tsc --noEmit`

## 3. Guardrails
- Do NOT change Free or Pro plan features — existing solo agent billing is untouched
- Do NOT break the fail-open pattern — `has?.({ feature }) ?? true` stays
- Do NOT gate any feature that solo agents currently have access to
- Do NOT modify the Stripe integration directly — Clerk handles Stripe
- Team features are ADDITIVE — they don't remove anything from Pro

## 4. Knowledge
Current billing (from Ensurance_Billing_Documentation.docx):
- Free: quoting + leads + calling
- Pro ($1/mo test): 7 gated features (SMS, Gmail, AI agents, enrichment, PDF proposals, custom fields, widgets)

New Agency plan adds team features on top of Pro:
- Everything in Pro, PLUS: team management, scope toggle, lead assignment, shared AI agents, team dashboard

Clerk supports org-level billing via `<OrganizationProfile />` billing tab. The `has()` function can check org-level features when the user is in an org context. This means the existing `useFeatureGate()` hook continues to work — it just checks org entitlements instead of personal entitlements when orgId is active.

New feature keys to create in Clerk:
- `team_management` — invite members, role management
- `team_data_view` — scope toggle, team leads/pipeline
- `lead_assignment` — assign/reassign leads

## 5. Memory
- Clerk billing setup steps documented in Ensurance_Billing_Documentation.docx
- Feature gate pattern: `has?.({ feature: 'x' }) ?? true` (fail-open)
- Server-side pattern: `if (has && !has({ feature })) return 403`
- Current feature keys: sms_messaging, gmail_integration, ai_voice_agents, lead_enrichment, pdf_proposals, custom_lead_fields, all_dashboard_widgets

## 6. Success Criteria
- [ ] Agency plan exists in Clerk Dashboard with key `agency`
- [ ] Agency plan includes all Pro features PLUS 3 new team features
- [ ] 3 new feature keys created: `team_management`, `team_data_view`, `lead_assignment`
- [ ] Pricing page shows 3 tiers: Free, Pro, Agency
- [ ] Team scope toggle is gated behind `team_data_view`
- [ ] `/settings/team` invite flow is gated behind `team_management`
- [ ] Lead reassignment is gated behind `lead_assignment`
- [ ] Solo agents on Pro see no team feature gates (these features don't exist in their UI)
- [ ] Fail-open pattern preserved — if Clerk billing is down, team features still work
- [ ] `bunx tsc --noEmit` passes

## 7. Dependencies
- MT-05, MT-06, MT-07 completed (team features exist to be gated)
- Clerk Dashboard access
- Stripe account connected to Clerk (already configured from BILL-00)

## 8. Failure Handling
| Error | Solution |
|-------|----------|
| `has({ feature: 'team_management' })` returns undefined | Feature key may not be created in Clerk. Check Dashboard → Billing → Features. |
| Org-level `has()` doesn't work | Clerk may require the org to have a subscription, not just the user. Check if org billing is configured separately from user billing. |
| Pricing page doesn't show Agency plan | Clerk's `<PricingTable />` needs the plan to be marked as visible. Check plan settings. |

## 9. Learning
- Document whether org-level billing required separate Stripe product/price setup vs just a Clerk plan.
- Note the exact Clerk `has()` behavior for org features vs personal features.
- Record the final pricing you set (even if test prices).

---

## Manual Steps (Clerk Dashboard)

1. **Create Agency plan:** Billing → Plans → Create → key: `agency`, name: "Agency"
2. **Set price:** $99/mo base (test price — adjust before launch)
3. **Create 3 new features:** `team_management`, `team_data_view`, `lead_assignment`
4. **Assign features:** Agency plan gets all 7 existing Pro features + 3 new team features
5. **Configure PricingTable:** Ensure all 3 plans (Free, Pro, Agency) are visible

## Code Changes

### `lib/billing/feature-gate.tsx` — add new feature display names

```typescript
export const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  // Existing (unchanged)
  sms_messaging: "SMS Messaging",
  gmail_integration: "Gmail Integration",
  ai_voice_agents: "AI Voice Agents",
  lead_enrichment: "Lead Enrichment",
  pdf_proposals: "PDF Proposals",
  custom_lead_fields: "Custom Lead Fields",
  all_dashboard_widgets: "Dashboard Customization",
  // New team features
  team_management: "Team Management",
  team_data_view: "Team Data View",
  lead_assignment: "Lead Assignment",
}
```

### Gate placement

- Scope toggle component: `useFeatureGate('team_data_view')` — hide toggle if false
- `/settings/team` invite section: `useFeatureGate('team_management')` — show UpgradePrompt if false
- Lead reassign dropdown: `useFeatureGate('lead_assignment')` — hide dropdown if false
- Server-side: `/api/leads/[id]/reassign` — check `has({ feature: 'lead_assignment' })`
