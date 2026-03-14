# BILL-02: Replace Billing Settings Placeholder with Subscription Management

## 1. Model
Sonnet — component replacement, minimal custom logic.

## 2. Tools Required
- `app/settings/billing/page.tsx` — Currently a "Coming Soon" placeholder
- `components/settings/settings-placeholder.tsx` — The placeholder component to remove
- Clerk SDK: `@clerk/nextjs` (already installed)

## 3. Guardrails
- DO NOT modify any other settings pages
- DO NOT modify the settings sidebar or layout
- DO NOT build custom payment forms — use Clerk's built-in components
- DO NOT store payment/subscription data in Supabase — Clerk manages this

## 4. Knowledge
Clerk's `<UserProfile />` component has a built-in Billing tab that shows current plan, invoice history, and payment methods when Billing is enabled. Alternatively, you can use individual components for more control.

For the settings billing page, the simplest approach:
```tsx
import { UserProfile } from "@clerk/nextjs";

export default function BillingPage() {
  return <UserProfile path="/settings/billing" />;
}
```

Or for a more custom layout that fits the settings page pattern:
```tsx
"use client";
import { useAuth } from "@clerk/nextjs";
// Use Clerk's billing-specific components or API
```

Check Clerk's docs for whether there's a standalone billing management component separate from UserProfile. If not, embed the UserProfile with only the billing tab visible, or build a simple page that shows:
- Current plan name and price
- "Change Plan" button that links to /pricing
- "Manage Subscription" button that opens Clerk's subscription portal

## 5. Memory
- `/settings/billing` currently renders `settings-placeholder.tsx` with a "Coming Soon" card
- The settings layout has `TopNav`, `SettingsSidebar`, and `BackToQuoter`
- Other settings pages follow the pattern: async server component shell → client component inner
- Settings page header uses `settings-page-header.tsx` with title + description

## 6. Success Criteria
1. `/settings/billing` shows the agent's current subscription plan (not "Coming Soon")
2. Agent can see their plan name, price, and renewal date
3. Agent can access plan change / upgrade flow (links to /pricing or opens Clerk modal)
4. Agent can view invoice history if available
5. Agent can manage payment methods
6. The page fits the settings layout visually (uses same header pattern, card styling)
7. `bunx tsc --noEmit` and `bun run build` pass

## 7. Dependencies
- BILL-00 completed (Clerk Billing enabled, plans created)
- BILL-01 completed (pricing page exists for "Change Plan" links)

## 8. Failure Handling
| Error | Cause | Fix |
|-------|-------|-----|
| "No subscription" shown | User hasn't subscribed yet | Show "You're on the Free plan" with upgrade CTA |
| Clerk billing components not rendering | Billing not enabled in Clerk Dashboard | Complete BILL-00 |
| Styling mismatch | Clerk components have their own styles | Wrap in card container matching settings page pattern |

## 9. Learning
- Document which Clerk component works best for the settings billing page
- Note if Clerk provides a way to show billing info without the full UserProfile component
- Check if subscription status is available via `useAuth()` or needs a separate API call
