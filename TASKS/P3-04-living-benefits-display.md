# Task: P3-04-living-benefits-display

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

- **Model**: sonnet
- **Tools**: Antigravity (Claude Code)
- **Human Checkpoint**: None

## Description

Living benefits (accelerated death benefit, chronic illness rider, terminal illness rider) data exists in `carriers.ts` for 7 carriers but is only shown in the carrier detail modal's Company tab. This task surfaces living benefits as badges or icons in the main quote results grid so agents can see at a glance which carriers include them — a major selling point for clients.

## Research First

Read `lib/data/carriers.ts` and check the `livingBenefits` field structure. It likely contains:
- Which riders are included vs optional vs not available
- Age-based availability (e.g., "available under age 65")
- Any cost info (included at no cost vs additional premium)

## Files to Modify

### 1. `components/quote/carrier-results.tsx`
- Add a living benefits indicator to each carrier row
- Options (pick the best fit for the existing layout):
  - **Badge approach**: Small "Living Benefits" badge next to carrier name (green if included, gray if not available)
  - **Icon approach**: Heart or Shield icon that's colored if living benefits are included
  - **Column approach**: New narrow column "LB" with checkmark/dash
- Tooltip on hover showing which specific benefits are included (e.g., "Terminal Illness, Chronic Illness, Critical Illness — included at no cost")
- Only show for carriers that have livingBenefits data

### 2. `components/quote/carrier-card.tsx` (if it exists as a separate component)
- Add living benefits indicator consistent with the results grid

### 3. `lib/engine/match-scoring.ts`
- Add small bonus for carriers with living benefits included at no cost (+2 or +3)
- This rewards carriers that bundle living benefits over those that charge extra

### 4. `components/quote/carrier-detail-modal.tsx`
- Living benefits already show in Company tab — make them more prominent
- Consider moving to Pricing tab since they affect value proposition
- Or add a brief mention in Pricing tab: "Includes living benefits (Terminal + Chronic illness riders)"

## UI Design

For the carrier results row, keep it subtle — a small icon or badge. Don't clutter the already-dense grid. Example:

```
| Carrier         | Product    | Rating | Monthly | Annual | Commission | LB  |
| Foresters       | YourTerm   | A      | $42     | $483   | $362       | ❤️   |
| AMAM            | Term Made  | A-     | $45     | $518   | $389       | —   |
```

Or inline with carrier name:
```
Foresters Financial  ❤️ Living Benefits
YourTerm 20 · A Rated
```

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. Living benefits indicator visible in quote results for carriers that have them
3. Tooltip shows specific benefits included
4. Match scoring gives small bonus for included living benefits
5. Carriers without living benefits data show nothing (no "N/A" or empty badge)

## On Completion
- Update CLAUDE.md if new components added
- Commit: `feat: surface living benefits in quote results grid`
