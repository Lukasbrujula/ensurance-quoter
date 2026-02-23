# T11.1a: Data + Types + Coaching API — Claude Code Prompt

## Step 0 — Read context

```bash
cat CODEBASE_AUDIT.md
cat CLAUDE.md
cat PHASE10_TASKS/T11.1a_DATA_AND_API.md

# Critical: the existing coaching system
cat app/api/coaching/route.ts
cat lib/data/medical-conditions.ts
cat lib/data/carriers.ts | head -200

# How coaching is called from frontend
grep -rn "coaching\|/api/coaching" --include="*.ts" --include="*.tsx" components/ stores/ | head -20

# Existing auth/rate-limit patterns
cat lib/middleware/auth-guard.ts | head -30
```

## Step 1 — Types (`lib/types/coaching.ts`)

Create the 4 card interfaces (StyleCard, MedicationCard, LifeEventCard, CoachingTipCard), the CoachingCard union type, and Zod schemas for response validation. Include a CoachingResponseSchema that validates `{ cards: CoachingCard[] }` with max 3 cards.

Export everything.

## Step 2 — Medication Data (`lib/data/medications.ts`)

Create ~100 medication entries. Each maps: medication name → aliases → condition → carrier eligibility (at minimum: amam, moo, jh, foresters — others as "unknown").

Use the medical conditions data already in the app (`lib/data/medical-conditions.ts` and `lib/data/carriers.ts`) to derive carrier eligibility. Where the medical conditions matrix says "Diabetes (Insulin) → JH: Preferred DB, AMAM: Decline" — medications that treat insulin-dependent diabetes inherit those results.

Include `findMedication(name: string): MedicationEntry | null` with case-insensitive alias matching.

Priority categories: diabetes, cardiovascular, mental health, pain, respiratory, blood thinners, thyroid, cholesterol, HIV, cancer. See task spec for the full list.

## Step 3 — Life-Event Triggers (`lib/data/life-event-triggers.ts`)

Create ~25 trigger entries across 12+ categories. Each has: keywords array, cross-sell suggestions, and a natural-sounding suggested script an agent could read aloud.

See task spec for the full trigger list. Priority HIGH triggers: new baby, marriage, home purchase, new job, retirement.

## Step 4 — Prompt Builder (`lib/coaching/build-coaching-prompt.ts`)

Pure function `buildCoachingSystemPrompt(): string` that assembles:
1. Role/context (you're coaching a life insurance agent during a live call)
2. DISC detection framework (D/I/S/C verbal signatures — see task spec)
3. Persuasion mapping per DISC quadrant
4. Compressed medication DB (one line per drug: `name|aliases → condition → carrier:result`)
5. Life-event trigger list
6. JSON response format specification
7. Rules (max 3 cards, quality over quantity, only classify after 3+ client sentences, only trigger on CLIENT speech not agent)

Also export `compressMedicationDB(): string` to generate the compact medication reference.

Keep total system prompt under ~4K tokens.

## Step 5 — Rewrite Coaching API (`app/api/coaching/route.ts`)

**Keep:** auth guard, rate limiting, 5s timeout, error handling, request validation.

**Change:**
- System prompt → `buildCoachingSystemPrompt()`
- Add `response_format: { type: "json_object" }` to OpenAI call
- Parse response with CoachingResponseSchema (Zod)
- Add `id: crypto.randomUUID()` and `timestamp: Date.now()` to each card server-side
- Return `{ cards: CoachingCard[] }`
- If Zod parse fails → return `{ cards: [] }` (don't crash)
- If model returns >3 cards → truncate to 3

**Do NOT change the request shape** — the frontend already sends transcript chunks.

## Step 6 — Verify

```bash
npx tsc --noEmit
```

## Rules

- Do NOT modify any frontend components
- Do NOT modify the call store
- Do NOT modify any other API routes
- Do NOT change the coaching API request shape
- Keep the system prompt under ~4K tokens
- Carrier IDs in medication data MUST match carriers.ts ("amam", "moo", "jh", "foresters", etc.)
- No new npm dependencies
