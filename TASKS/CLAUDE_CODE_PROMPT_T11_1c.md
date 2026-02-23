# T11.1c: Integration + Tuning + Persistence — Claude Code Prompt

## Step 0 — Read context

```bash
cat CODEBASE_AUDIT.md
cat PHASE10_TASKS/T11.1c_INTEGRATION.md

# T11.1a outputs
cat lib/types/coaching.ts
cat lib/coaching/build-coaching-prompt.ts
cat app/api/coaching/route.ts

# T11.1b outputs
cat components/coaching/coaching-card-stack.tsx
cat stores/call-store.ts

# Where coaching is called during live calls
grep -rn "coaching\|/api/coaching" --include="*.ts" --include="*.tsx" components/ stores/ | head -20

# Call log save
cat app/api/call-log/route.ts

# Call lifecycle
grep -rn "callState\|endCall\|clearCall\|onCallEnd" --include="*.ts" stores/ | head -15
```

## Step 1 — Wire coaching response → card store

Find where the frontend calls `/api/coaching` and processes the response. Change it to parse the new `{ cards: CoachingCard[] }` format and call `addCoachingCard()` for each card.

Handle backward compatibility: if the response has the old format (string hints), fall back gracefully.

## Step 2 — Call lifecycle integration

- On call start: `clearCoachingCards()` alongside existing cleanup
- On call end: Serialize coaching cards into the call log save payload:
  ```json
  {
    "style_detected": "S",
    "medications_detected": ["metformin"],
    "life_events_detected": ["New Grandchild"],
    "cards": [...]
  }
  ```

## Step 3 — Call log persistence

In `app/api/call-log/route.ts`, ensure the `coaching_hints` JSONB column accepts the new structured format. Update the Zod schema to accept both old (string[]) and new (structured object) formats.

## Step 4 — Prompt tuning

Review the `buildCoachingSystemPrompt()` output. Check for:
- Is the prompt under ~4K tokens?
- Does the medication DB compress cleanly?
- Are the DISC instructions clear enough?
- Add these safeguards if not already present:
  - "Only return a style card after the CLIENT has spoken at least 3-4 sentences"
  - "Only return medication cards when the client CONFIRMS taking a medication, not when they deny it"
  - "Only return life-event cards when the CLIENT mentions their own life event, not when the AGENT mentions one hypothetically"
  - "Most calls should return 0-1 cards per coaching interval. Only return 2-3 when there are genuinely distinct new signals"

## Step 5 — Remove any test/mock data

If T11.1b left mock card injection for testing, remove it.

## Step 6 — Verify

```bash
npx tsc --noEmit
bun run build
```

## Rules

- Do NOT modify the transcript pipeline (Deepgram → call store)
- Do NOT modify the coaching API call frequency
- Do NOT modify the call_logs table schema — use existing JSONB column
- Do NOT break backward compat with old call logs
- Prompt tuning goes in build-coaching-prompt.ts, NOT inline in the route
