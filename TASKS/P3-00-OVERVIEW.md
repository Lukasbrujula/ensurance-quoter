# Phase 3: Pre-Compulife Prep & Polish

## Overview

Phase 3 focuses on preparing the codebase for the Compulife API integration (arriving this week), cleaning up technical debt, and polishing the quote engine UI. No external dependencies — everything here can be built now.

## Tasks

| Task | Model | Effort | Description |
|------|-------|--------|-------------|
| P3-01 | sonnet | 30 min | Pricing abstraction layer — wrap mock-pricing behind interface for clean Compulife swap |
| P3-02 | sonnet | 45 min | Build chart (height/weight) integration into eligibility engine |
| P3-03 | sonnet | 15 min | Product tabs scaffolding — Final Expense, Whole Life, IUL show "Coming Soon" |
| P3-04 | sonnet | 30 min | Living benefits column/badges in quote results grid |
| P3-05 | sonnet | 45 min | Legacy dashboard cleanup — remove ~36 superseded components |
| P3-06 | sonnet | 30 min | Rate limiting on critical API endpoints |

## Dependency Graph

```
P3-01 (pricing abstraction) — standalone, do first (Compulife prep)
P3-02 (build chart) — standalone
P3-03 (product tabs) — standalone
P3-04 (living benefits) — standalone
P3-05 (legacy cleanup) — standalone, do last (biggest diff, least risk)
P3-06 (rate limiting) — standalone
```

All tasks are independent — can be executed in any order. Recommended order: P3-01 → P3-02 → P3-04 → P3-03 → P3-06 → P3-05

## Architecture Decisions

- **Pricing abstraction**: Create `lib/engine/pricing.ts` with a `PricingProvider` interface. `mock-pricing.ts` becomes one implementation. Compulife becomes another. The quote API route calls the abstraction, not the implementation directly.
- **Build chart**: Height/weight data already exists in carrier intelligence. Add height/weight fields to intake form + eligibility check.
- **Legacy cleanup**: Remove `app/dashboard/` route (except redirecting to `/leads`), remove `components/{atoms,molecules,organisms,templates}/` that are superseded by `components/quote/` and `components/landing/`.
- **Rate limiting**: Use in-memory rate limiter (Map-based with TTL). No Redis dependency for MVP. Protect token endpoint (5/min), transcribe endpoints (20/min), coaching (30/min).
