# Task: P2-06-post-call-persistence

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
- [ ] Do NOT store: raw audio data (only text transcripts — privacy + storage)
- [ ] Do NOT auto-run: quotes based on call content (agent must trigger manually)
- [ ] Do NOT delete: existing call_logs table columns (extend if needed)

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/store/call-store.ts` (transcript[], coachingHints[], callDuration), `lib/supabase/leads.ts` (existing data access patterns), `lib/types/call.ts` (CallLogEntry type), database migration for call_logs table (from Phase 1 Task 01)
- [ ] Current state audit: call_logs table already exists with: id, lead_id, direction, provider, provider_call_id, duration_seconds, recording_url, transcript_text, started_at, ended_at

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] On call hangup: automatically saves call log to Supabase call_logs table
- [ ] Call log includes: lead_id, direction='outbound', provider='telnyx', duration_seconds, transcript_text (full transcript as formatted text), ai_summary (3-sentence GPT summary), coaching_hints (JSON array), started_at, ended_at
- [ ] `app/api/call-summary/route.ts` — POST endpoint that takes full transcript and returns 3-sentence AI summary
- [ ] `lib/supabase/calls.ts` — data access: saveCallLog, getCallLogs(leadId), getCallLog(id)
- [ ] `components/calling/call-log-viewer.tsx` — expandable call history section in lead detail view
- [ ] Call log viewer shows: date, duration (mm:ss), AI summary preview, "View Transcript" button
- [ ] "View Transcript" opens a modal/sheet with full formatted transcript + coaching hints
- [ ] Call count badge on lead in lead list (shows how many calls)
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task P2-01 (call store)
- [x] Task P2-02 (call lifecycle — hangup event triggers save)
- [x] Task P2-03 (transcript data exists in store)
- [x] Task P2-05 (coaching hints exist in store)
- [ ] Phase 1 Task 01 (call_logs table exists in Supabase)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach
- [ ] If Supabase save fails: buffer call log in localStorage as fallback, retry on next page load

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/P2-06-post-call-persistence.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] call_logs table needs schema migration for new columns (ai_summary, coaching_hints JSONB)
- [ ] AI summary generation takes too long after call ends — may need to be async
- [ ] Transcript text too large for single TEXT column (unlikely but possible with long calls)

---

## Human Checkpoint
- [x] **REQUIRED** — Verify that after a test call, the call log appears in Supabase and in the call log viewer UI.

---

## Description
When a call ends, save everything — transcript, coaching hints, AI summary, and call metadata — to the database. Build a call log viewer in the lead detail view so agents can review past calls. This completes the call lifecycle: dial → talk → transcribe → coach → save → review.

## Acceptance Criteria
- [ ] Save happens automatically on hangup (no manual "save call" button)
- [ ] If save fails, retry 3 times with exponential backoff, then show error toast
- [ ] AI summary is concise: 3 sentences covering what was discussed, key disclosures, and outcome
- [ ] Transcript format in database: "Agent: [text]\nClient: [text]\n..." with timestamps
- [ ] Call log viewer in lead detail: collapsible section below the three-column layout or in a dedicated tab
- [ ] Call history sorted by date (newest first)
- [ ] Each call log entry shows: date/time, duration, AI summary (truncated to 2 lines), expand arrow
- [ ] Expanded view: full transcript with speaker colors + coaching hints inline
- [ ] "View Full Transcript" button opens Sheet/Dialog with scrollable formatted transcript
- [ ] Call count visible in lead list (badge or column)

## Prerequisites (run BEFORE coding starts)
- **Schema migration required**: Add `ai_summary TEXT` and `coaching_hints JSONB` columns to `call_logs` table via Supabase MCP (`apply_migration`). Then regenerate types with `supabase gen types typescript` and update `database.ts` hand-written types (`CallLogRow`, `CallLogInsert`, `CallLogUpdate`) to include the new columns.

## Steps (high-level)
1. **FIRST**: Run Supabase migration to add `ai_summary` (TEXT) and `coaching_hints` (JSONB) columns to `call_logs`. Regenerate `database.generated.ts`. Update hand-written types in `database.ts`.
2. Create `app/api/call-summary/route.ts` — sends full transcript to GPT-4o-mini with prompt: "Summarize this insurance sales call in exactly 3 sentences. Focus on: what was discussed, any health/lifestyle disclosures, and the outcome."
3. Create `lib/supabase/calls.ts` — saveCallLog, getCallLogs, getCallLog functions
4. Create post-call flow in CallNotificationHandler:
   a. On hangup event → set callState to 'ending'
   b. Format transcript text from transcript[] entries
   c. Call /api/call-summary with formatted transcript
   d. Save call log to Supabase via saveCallLog()
   e. Clear call store (reset for next call)
   f. Show toast: "Call saved — [duration] — [summary preview]"
5. Create `components/calling/call-log-viewer.tsx`:
   a. Fetches call logs for active lead on mount
   b. Renders list of past calls
   c. Each entry: date, duration badge, summary text, expand/collapse
6. Create `components/calling/transcript-modal.tsx`:
   a. Full transcript view in a Sheet component
   b. Speaker-colored entries
   c. Coaching hints inline
   d. "Copy" button for clipboard
7. Add call log viewer to lead detail layout
8. Add call count to lead list (update lead-list.tsx to show calls column/badge) — fetch call counts via separate query by lead_id, do NOT add callLogs to the Lead type (call logs live in call-store, not on Lead)
9. Run `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: add post-call persistence, AI summary, and call log viewer`
- **Update:** [x] CLAUDE.md (add call-log-viewer to components, add /api/call-summary route) [x] PROJECT_SCOPE.md (mark Phase 2 complete)
- **Handoff notes:** Phase 2 is complete. Full calling workflow works: lead list → lead detail → call → live transcript + coaching → save → review. Next phases: Ringba inbound (Phase 3), enrichment refinements (Phase 4), Compulife + auth + deployment (Phase 5).

## Notes
- **CONFIRMED**: call_logs table needs migration — `ai_summary` and `coaching_hints` columns do NOT exist yet. Run migration via Supabase MCP as the first step of this task.
- Format coaching_hints as JSONB array: [{ type, text, timestamp, relatedCarriers }]
- The AI summary prompt should NOT include carrier intelligence context — it's just summarizing the conversation, not making recommendations.
- Consider adding a "Call Notes" text area in the call log viewer where agents can add their own notes after a call.
- The call log viewer should load lazily (fetch only when lead detail is opened, not for all leads at once).
- Long calls (30+ minutes) might have large transcripts. Consider pagination or lazy loading for the transcript modal.
- Total cost per call: Telnyx voice (~$0.01/min) + Deepgram transcription ($0.0077/min) + AI coaching (~$0.001/min) + AI summary ($0.0001) = ~$0.02/min or $0.20 for a 10-minute call.
