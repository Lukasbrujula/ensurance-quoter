# MT-07: Lead Assignment & Reassignment

**Priority:** Medium — core team workflow
**Estimate:** 1.5 hrs
**Branch:** `feature/multi-tenant`

---

## 1. Model
Sonnet. Standard CRUD UI work.

## 2. Tools Required
- Codebase access (lead detail page, server actions, lead store)
- shadcn/ui Select/Combobox components
- Clerk Backend API or `useOrganization()` hook for member list
- `bunx tsc --noEmit`

## 3. Guardrails
- Do NOT modify the lead detail page layout for solo agents — assignment UI only renders when orgId present
- Do NOT allow agents to reassign leads they don't own (only owners can reassign any lead)
- Do NOT delete or modify lead data during reassignment — only change `agent_id`
- Do NOT touch the quote engine or carrier logic
- Always create an activity log entry for reassignments

## 4. Knowledge
Lead reassignment is changing the `agent_id` on a lead record while keeping `org_id` the same. The lead stays in the org, just owned by a different agent. This requires:
1. A way to list org members (Clerk's `useOrganization().membershipList`)
2. A dropdown on the lead detail page showing "Assigned to: [Agent Name]"
3. An "Unassigned" state where `agent_id` is null but `org_id` is set (lead pool)
4. An activity log entry: "Lead reassigned from Agent A to Agent B"

**RLS consideration:** The UPDATE policy from MT-02 requires `agent_id = requesting_user_id()` — meaning an agent can only update their own leads. For owner reassignment, we need either a service-role endpoint or a relaxed RLS policy for org admins. Recommended: create a dedicated `/api/leads/[id]/reassign` route that uses service role for the assignment update (with org ownership verification in application code).

## 5. Memory
- Lead detail page: `app/leads/[id]/page.tsx` → `components/leads/lead-detail-client.tsx`
- Server actions: `lib/actions/leads.ts` — `updateLeadFields()` enforces ownership
- Activity logging: `lib/actions/log-activity.ts`
- Clerk's `useOrganization()` hook returns `{ membershipList }` with user names and roles

## 6. Success Criteria
- [ ] Lead detail page shows "Assigned to" dropdown when user is org owner and viewing a team lead
- [ ] Dropdown lists all org members by name
- [ ] Selecting a different member updates the lead's `agent_id`
- [ ] Activity log records: "Lead reassigned from [Old Agent] to [New Agent] by [Owner]"
- [ ] Agents cannot reassign leads they don't own (dropdown is read-only for non-owners)
- [ ] Unassigned leads (agent_id = null) appear in a team lead pool
- [ ] Claiming an unassigned lead sets agent_id to the claiming agent
- [ ] Solo agents see no assignment UI whatsoever
- [ ] `bunx tsc --noEmit` passes

## 7. Dependencies
- MT-04 completed (org context in server layer)
- MT-05 completed (team scope toggle to see team leads)
- MT-06 completed (org members available via Clerk)

## 8. Failure Handling
| Error | Solution |
|-------|----------|
| RLS blocks owner from reassigning agent's lead | Use service role client in the reassign API route (not the default Clerk client). Validate org ownership in application code before using service role. |
| Member list is empty | `useOrganization()` may need `{ membershipList: { limit: 100 } }` to populate. Check Clerk docs. |
| Activity log fails silently | logActivity may be fire-and-forget. Add error logging. |

## 9. Learning
- Document whether the service role approach for reassignment was needed or if RLS could be relaxed.
- Note the exact Clerk hook/API used for member enumeration.
