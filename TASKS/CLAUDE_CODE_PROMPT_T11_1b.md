# T11.1b: Frontend Cards + Panel Redesign — Claude Code Prompt

## Step 0 — Read context

```bash
cat CODEBASE_AUDIT.md
cat CLAUDE.md
cat PHASE10_TASKS/T11.1b_FRONTEND_CARDS.md

# T11.1a outputs (must exist)
cat lib/types/coaching.ts

# Current panel + store
cat components/quote/ai-assistant-panel.tsx
cat stores/call-store.ts

# UI patterns
cat components/ui/card.tsx | head -40
cat components/quote/carrier-results.tsx | head -50
```

## Step 1 — Call Store Updates (`stores/call-store.ts`)

Add to the store:
```typescript
coachingCards: CoachingCard[];
addCoachingCard: (card: CoachingCard) => void;
// If style card and one exists → replace. If medication with same name → skip dupe.
dismissCard: (cardId: string) => void;
clearCoachingCards: () => void;
```

Integrate `clearCoachingCards()` into the existing call-end cleanup.

## Step 2 — Card Components (`components/coaching/`)

Create 4 card components + 1 stack container + barrel export:

- `style-card.tsx` — Blue left border. Pinned. Shows quadrant, confidence dots, tips.
- `medication-card.tsx` — Amber left border. Shows drug name, condition, carrier grid (✅/❌/⚠️).
- `life-event-card.tsx` — Green left border. Shows event, cross-sell bullets, "TRY SAYING" script.
- `coaching-tip-card.tsx` — Gray left border. Shows title, content, optional script.
- `coaching-card-stack.tsx` — Container with: style pinned top, newest-first ordering, auto-collapse timers (style:never, medication:60s, life-event:60s, tip:30s), dismiss buttons, "🎧 Listening..." empty state, max 5 expanded.
- `index.ts` — barrel export

All `"use client"`. Use shadcn Card as base. CSS transitions only (no framer-motion). Tailwind `border-l-4` for colored borders.

## Step 3 — Panel Redesign (`ai-assistant-panel.tsx`)

**Call Mode only. Do NOT touch Chat Mode.**

Replace transcript/coaching-hints display with:
1. `<CoachingCardStack />` as main content (flex-1, overflow-y-auto)
2. "📝 Show Transcript" toggle button at bottom → collapsible raw transcript view (max-h-48, text-xs)

Transcript data still flows to call-store. Just not the primary display anymore.

## Step 4 — Verify

```bash
npx tsc --noEmit
```

To visually test, temporarily inject mock cards in the store on mount (remove before committing):
```typescript
// Temporary test: add to call store init or a useEffect
addCoachingCard({ id: '1', type: 'style', quadrant: 'S', label: 'Steady', confidence: 3, description: 'Relationship-first', tips: ['Match pace', 'Offer follow-up'], timestamp: Date.now() });
addCoachingCard({ id: '2', type: 'medication', medicationName: 'Metformin', condition: 'Type 2 Diabetes', carrierResults: [{carrier:'John Hancock',carrierId:'jh',result:'accept',detail:'Preferred DB'},{carrier:'AMAM',carrierId:'amam',result:'decline'}], agentNote: 'JH strongest for diabetes', timestamp: Date.now() });
```

## Rules

- Do NOT modify Chat Mode
- Do NOT modify Telnyx/Deepgram/calling code
- Do NOT wire up the coaching API call — that's T11.1c
- Do NOT add animation libraries
- Do NOT remove transcript from call-store
- Cards must be readable in 2 seconds (glance test)
- No new npm dependencies
