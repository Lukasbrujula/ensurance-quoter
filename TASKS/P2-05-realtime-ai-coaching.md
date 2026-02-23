# Task: P2-05-realtime-ai-coaching

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

### 1. Model
sonnet

### 2. Tools Required
- [x] Read, Edit, Write (file operations)
- [x] Bash: `bunx tsc --noEmit`
- [x] Grep, Glob (search)
- [ ] WebFetch (external docs)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`, `lib/engine/*`
- [ ] Do NOT expose: carrier intelligence data directly to the client (it's already in the AI system prompt — use server-side analysis)
- [ ] Do NOT spam coaching hints: max 1 hint per 30 seconds, max 10 per call
- [ ] Do NOT show coaching hints for agent speech patterns — only analyze client disclosures

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/store/call-store.ts` (coachingHints[] to populate), `lib/types/call.ts` (CoachingHint type), `lib/ai/system-prompt.ts` (existing carrier intelligence context), `lib/data/carrier-intelligence-summary.ts` (text dump of carrier rules)
- [ ] Current state audit: The AI system prompt already contains carrier intelligence. Coaching needs a specialized prompt that's focused on real-time analysis, not general chat.

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `lib/ai/call-coach.ts` exists — analyzes transcript chunks and returns coaching hints
- [ ] `app/api/coaching/route.ts` exists — POST endpoint that accepts transcript text + lead context, returns CoachingHint
- [ ] Coaching triggers every 30 seconds during active call (or on Deepgram UtteranceEnd event, whichever comes first)
- [ ] CoachingHint includes: type ('tip' | 'warning' | 'info'), text, timestamp, confidence (0-1), relatedCarriers (string[])
- [ ] Coaching hints appear inline in transcript UI (from P2-04)
- [ ] Coaching is contextual: uses lead data (age, state, medical conditions from intake) + carrier intelligence + transcript content
- [ ] Rate limiting: max 1 hint per 30 seconds, skips if last hint was <15 seconds ago
- [ ] Cost tracking: log token usage per coaching call (for monitoring burn rate)
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task P2-01 must be complete (call store with coachingHints[])
- [x] Task P2-03 must be complete (transcript entries flowing into store)
- [x] Task P2-04 should be complete (coaching hints render in UI)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/P2-05-realtime-ai-coaching.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] GPT-4o-mini response latency too high for real-time coaching (>3s)
- [ ] Coaching hints are too generic / not actionable enough — may need prompt engineering
- [ ] Token usage higher than expected (carrier intelligence context is large)

---

## Human Checkpoint
- [x] **NONE** — proceed automatically

---

## Description
Build the real-time AI coaching engine that analyzes call transcripts and surfaces carrier-relevant insights to the agent during live calls. When a client mentions a medical condition, tobacco use, DUI history, or other underwriting-relevant topics, the AI coach generates a contextual hint based on carrier intelligence data.

**Examples of coaching hints:**
- Client says "I use an insulin pump" → "💊 Diabetes (insulin) — John Hancock offers Preferred DB. Most other carriers decline."
- Client says "I quit smoking 2 years ago" → "🚭 Quit 2yr ago — AMAM requires 36-month lookback. Foresters/MOO/JH only need 12 months."
- Client says "I had a DUI 3 years ago" → "🚗 DUI 3yr ago — UHL's DLX product uniquely accepts DUI. Transamerica offers age-based flat extras."
- Client mentions they live in New York → "📍 NY — Only Foresters, John Hancock, SBLI available. AMAM, Americo, F&G, UHL excluded."

## Acceptance Criteria
- [ ] System prompt for coaching is specialized: "You are a life insurance sales coach. Based on the transcript excerpt and lead profile, provide ONE specific, actionable insight about carrier suitability. Be concise (1-2 sentences). Reference specific carriers by name."
- [ ] Context sent to GPT-4o-mini: last 500 words of transcript + lead profile (age, state, gender, tobacco, medical conditions, DUI) + carrier intelligence summary (condensed version)
- [ ] Coaching hint format: { type, text, timestamp, confidence, relatedCarriers }
- [ ] Duplicate detection: don't repeat the same insight (e.g., don't flag "diabetes" twice)
- [ ] Graceful degradation: if API call fails or times out (>5s), skip that coaching cycle silently
- [ ] Cost per coaching call: ~$0.0001 (GPT-4o-mini with 500 words context + 50 word response)

## Steps (high-level)
1. Create `lib/ai/call-coach.ts`:
   a. buildCoachingPrompt(transcriptChunk, leadProfile, existingHints) → system + user messages
   b. parseCoachingResponse(response) → CoachingHint
   c. shouldTriggerCoaching(lastHintTime, transcriptLength) → boolean (rate limiting)
   d. deduplicateHints(newHint, existingHints) → boolean (skip if similar)
2. Create `app/api/coaching/route.ts`:
   a. POST endpoint
   b. Accepts: { transcriptChunk: string, leadProfile: object, existingHints: CoachingHint[] }
   c. Calls GPT-4o-mini with coaching system prompt
   d. Returns: CoachingHint or null (if no actionable insight)
   e. Logs token usage
3. Create coaching trigger in call lifecycle:
   a. In CallNotificationHandler or a separate `useCoachingInterval` hook
   b. Every 30 seconds while call is active: collect last transcript chunk → POST /api/coaching → add to coachingHints[]
   c. Also trigger on significant UtteranceEnd events (long client speech)
4. Create condensed carrier intelligence for coaching context (shorter than full summary — focus on differentiators):
   a. `lib/ai/coaching-context.ts` — buildCoachingContext(leadState, leadAge) → relevant carrier rules string
   b. Only include carriers available in lead's state
   c. Focus on: tobacco rules, medical condition differentiators, DUI rules
5. Run `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: add real-time AI coaching during calls with carrier intelligence`
- **Update:** [x] CLAUDE.md (add /api/coaching route)
- **Handoff notes:** AI coaching works during live calls. Hints appear in the transcript UI. Task P2-06 handles saving everything post-call. The coaching context is carrier-intelligent — it knows which carriers are relevant for this specific lead.

## Notes
- The coaching system prompt should be DIFFERENT from the regular AI chat prompt. It's shorter, more focused, and expects a single insight rather than a conversation.
- Consider a "condensed carrier matrix" for the coaching context — instead of the full intelligence summary, send only the relevant differentiators for the lead's state. This reduces token usage.
- The confidence field (0-1) helps the UI decide how prominently to show the hint. High confidence (>0.8) = bold card. Low confidence (<0.5) = subtle badge.
- GPT-4o-mini is fast enough for real-time coaching (~500ms response time). If it's too slow, batch the context better.
- Don't analyze agent speech for coaching — only look for client disclosures (medical, lifestyle, location, etc.)
- Track coaching hit rate: how often does a coaching call return a useful hint vs. null? This helps tune the prompt.
