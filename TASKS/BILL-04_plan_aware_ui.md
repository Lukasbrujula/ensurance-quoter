# BILL-04: Plan-Aware UI — Current Plan Display and Upgrade Prompts

## 1. Model
Sonnet — small UI additions across a few components.

## 2. Tools Required
- `components/navigation/top-nav.tsx` — Add plan badge
- `components/settings/settings-sidebar.tsx` — Show current plan
- Clerk SDK: `useAuth()` with `has()`

## 3. Guardrails
- DO NOT modify the billing page, pricing page, or feature gating logic
- DO NOT add plan checks that block navigation — this is purely visual/informational
- DO NOT show plan info to unauthenticated users
- Keep it subtle — a small badge, not a banner

## 4. Knowledge
The agent's current plan can be checked with `has({ plan: 'pro' })`. If it returns false (or `has` is undefined), they're on the Free plan. There is no agency plan — only `free_user` and `pro`.

## 5. Memory
- TopNav has: logo, nav links, user menu (Clerk `<UserButton />`), dark mode toggle, notification bell
- Settings sidebar has section links (Profile, Licenses, Carriers, etc.)
- The `/settings/billing` page exists from BILL-02

## 6. Success Criteria
1. TopNav or user menu area shows a small plan badge (e.g., "Pro" in a colored badge, or "Free" in muted)
2. Settings sidebar shows current plan name near the Billing link (e.g., "Billing — Pro Plan")
3. If on Free plan, a subtle upgrade CTA appears in the sidebar (e.g., "Upgrade to Pro →")
4. The plan badge links to `/settings/billing`
5. `bunx tsc --noEmit` and `bun run build` pass

## 7. Dependencies
- BILL-00 completed (plans exist)
- BILL-02 completed (billing settings page works)

## 8. Failure Handling
| Error | Cause | Fix |
|-------|-------|-----|
| Badge shows wrong plan | has() check wrong | Check `has({ plan: 'pro' })` — if true show Pro, otherwise Free |
| Badge flickers on load | Auth state loading | Show nothing until auth is resolved, use Clerk's `isLoaded` |

## 9. Learning
- Note whether `has({ plan: 'x' })` is available on the client via `useAuth()` or needs server-side check
- If it requires a server component, consider passing the plan as a prop from the layout
