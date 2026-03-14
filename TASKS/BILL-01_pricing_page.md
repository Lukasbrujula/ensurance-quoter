# BILL-01: Add Pricing Page with Clerk PricingTable

## 1. Model
Sonnet — straightforward component placement, minimal logic.

## 2. Tools Required
- `app/page.tsx` — Landing page (to add pricing section or link)
- `components/landing/` — Landing page components
- Clerk SDK: `@clerk/nextjs` (already installed)
- `middleware.ts` — May need to add `/pricing` as public route

## 3. Guardrails
- DO NOT modify any existing pages or components except adding a link/section
- DO NOT modify auth flow, quote engine, or any feature code
- DO NOT install new dependencies — Clerk's `<PricingTable />` is in `@clerk/nextjs`
- DO NOT hardcode prices — they come from Clerk Dashboard configuration
- The pricing page must be publicly accessible (unauthenticated users should see it)

## 4. Knowledge
Clerk Billing provides a `<PricingTable />` component that automatically renders your plans as configured in the Clerk Dashboard. It handles plan selection, checkout, and payment — zero custom code needed for the actual billing flow.

```tsx
import { PricingTable } from "@clerk/nextjs";

export default function PricingPage() {
  return <PricingTable />;
}
```

That's genuinely it for the core functionality. The rest is just wrapping it in your page layout.

## 5. Memory
- The landing page at `/` uses `MarketingTemplate` with `HeroSection`, `TrustSection`, `ProductTabSwitcher`, `FeaturesGrid`, `CTASection`
- Auth pages redirect to `/quote` after login
- `middleware.ts` allows unauthenticated access to `/`, `/auth/*`, `/privacy`, `/terms`, `/support`

## 6. Success Criteria
1. `/pricing` page exists and renders the Clerk `<PricingTable />` component
2. The page is publicly accessible (no auth required) — verify `middleware.ts` allows it
3. The page uses the same layout style as other public pages (header, footer)
4. Landing page has a link/CTA pointing to `/pricing`
5. `bunx tsc --noEmit` and `bun run build` pass

## 7. Dependencies
- BILL-00 must be completed first (plans created in Clerk Dashboard)
- `@clerk/nextjs` already installed

## 8. Failure Handling
| Error | Cause | Fix |
|-------|-------|-----|
| PricingTable shows nothing | No plans created in Clerk Dashboard | Complete BILL-00 first |
| 404 on /pricing | Page not created or middleware blocking | Add to public routes in middleware.ts |
| PricingTable shows "loading" forever | Clerk publishable key misconfigured | Check NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY |

## 9. Learning
- Note whether the PricingTable component is customizable (colors, layout) or if it uses Clerk's default styling
- Document if the component requires "use client" directive or works as server component
