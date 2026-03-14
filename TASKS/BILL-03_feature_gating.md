# BILL-03: Add Feature Gating to Premium Features

## 1. Model
Opus — needs careful analysis of which features to gate and where the checks go. Touches many files but each change is small.

## 2. Tools Required
- Clerk SDK: `has()` helper from `@clerk/nextjs` and `@clerk/nextjs/server`
- Multiple page and API route files (listed below)
- A shared utility for consistent gating patterns

## 3. Guardrails
- DO NOT break any feature for existing users — if billing isn't configured yet, features should remain accessible (fail open, not closed)
- DO NOT gate the quote engine core — quoting is available on all plans (with limits on Free)
- DO NOT gate basic lead management — Free plan includes 25 leads
- DO NOT modify the billing components from BILL-01 or BILL-02
- DO NOT add hard blocks that lock users out with no explanation — always show an upgrade prompt
- Feature checks must work on BOTH client and server side

## 4. Knowledge

### Client-side gating
```tsx
"use client";
import { useAuth } from "@clerk/nextjs";

function MyComponent() {
  const { has } = useAuth();
  const canUseSMS = has?.({ feature: 'sms_messaging' }) ?? true; // fail open if billing not configured

  if (!canUseSMS) {
    return <UpgradePrompt feature="SMS Messaging" plan="Pro" />;
  }
  return <SMSPanel />;
}
```

### Server-side gating (API routes)
```typescript
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { has } = await auth();
  if (!has?.({ feature: 'sms_messaging' })) {
    return Response.json({ error: 'SMS requires a Pro plan. Upgrade at /pricing.' }, { status: 403 });
  }
  // ... proceed with SMS logic
}
```

### The `has()` fail-open pattern
During development or if billing isn't configured, `has` might be undefined. Always use optional chaining with a true fallback: `has?.({ feature: 'x' }) ?? true`. This ensures nothing breaks for existing users if billing setup isn't complete.

## 5. Memory
- The actual feature slugs in Clerk Dashboard are: sms_messaging, gmail_integration, ai_voice_agents, lead_enrichment, pdf_proposals, custom_lead_fields, all_dashboard_widgets
- Free plan (key: free_user): basic quoting and leads, no gated features
- Pro plan (key: pro): all 7 features above enabled

## 6. Success Criteria

### Create shared gating utility
1. Create `lib/billing/feature-gate.ts` with helper functions:
   - `checkFeature(feature: string)` — server-side check
   - `useFeatureGate(feature: string)` — client-side hook
   - `UpgradePrompt` component — consistent "upgrade to access this" UI

### Gate these features (soft gates — show upgrade prompt, don't hard block):

**SMS (feature: 'sms_messaging')**
2. Gate the SMS send button in inbox (`components/inbox/conversation-thread.tsx`)
3. Gate `POST /api/sms` endpoint

**Email (feature: 'gmail_integration')**
4. Gate the Gmail connect button in settings (`components/settings/gmail-card.tsx`)
5. Gate `POST /api/email/send` endpoint

**AI Agents (feature: 'ai_voice_agents')**
6. Gate the "Create Agent" button in agents page (`components/agents/agents-list-client.tsx`)
7. Gate `POST /api/agents` endpoint

**Lead Enrichment (feature: 'lead_enrichment')**
8. Gate the enrichment button in quote page (`components/quote/lead-enrichment-popover.tsx`)
9. Gate `POST /api/enrichment` endpoint

**PDF Proposals (feature: 'pdf_proposals')**
10. Gate the proposal button (`components/quote/proposal-dialog.tsx`)
11. Gate `POST /api/proposal` endpoint

**Custom Fields (feature: 'custom_lead_fields')**
12. Gate the custom fields settings page (`components/settings/custom-fields-settings-client.tsx`)

**Dashboard Widgets (feature: 'all_dashboard_widgets')**
13. Gate the widget picker "Customize" button in dashboard — Free users see default 8 widgets only, no customization

### General
14. All gated features show the `UpgradePrompt` component with the feature name and required plan
15. API routes return 403 with a clear message mentioning the required plan
16. Everything fails OPEN if `has` is undefined (billing not configured)
17. `bunx tsc --noEmit` and `bun run build` pass

## 7. Dependencies
- BILL-00 completed (feature slugs defined in Clerk)
- BILL-01 completed (pricing page exists for upgrade links)

## 8. Failure Handling
| Error | Cause | Fix |
|-------|-------|-----|
| All features blocked | has() returning false for everything | Check fail-open pattern: `has?.() ?? true` |
| UpgradePrompt links to 404 | /pricing page doesn't exist | Complete BILL-01 first |
| Type error on has() | Clerk types not updated | Update @clerk/nextjs if needed |
| Feature works in dev but blocked in prod | Different Clerk instances | Verify plans exist in both dev and prod Clerk apps |

## 9. Learning
- Document which features are gated and where the checks live
- Note if `has()` introduces any noticeable latency (it shouldn't — it reads from the session JWT)
- Track whether the fail-open pattern causes any issues
- The feature list will likely evolve — keep the gating utility centralized so changes are easy
