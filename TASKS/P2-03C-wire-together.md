# Task: P2-03C-wire-together

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

### 1. Model
opus

### 2. Tools Required
- [x] Read, Edit, Write (file operations)
- [x] Bash: `bunx tsc --noEmit`
- [x] Grep, Glob (search)
- [ ] WebFetch (external docs)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`, `lib/engine/*`
- [ ] Do NOT auto-start transcription without an active call (waste of Deepgram credits)
- [ ] Do NOT break: existing call lifecycle (P2-02 components)
- [ ] Do NOT accumulate audio buffers — fire and forget each chunk

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/telnyx/audio-capture.ts` (from P2-03A), `app/api/transcribe/stream/route.ts` (from P2-03B), `app/api/transcribe/audio/route.ts` (from P2-03B), `lib/deepgram/sessions.ts` (from P2-03B), `lib/store/call-store.ts` (transcript actions), `lib/telnyx/notification-handler.ts` (call lifecycle hooks), `components/calling/call-notification-handler.tsx` (mount point)

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `lib/deepgram/stream.ts` — client-side transcription manager:
  - `startTranscription(localStream, remoteStream)`: opens SSE to `/api/transcribe/stream`, starts audio capture, POSTs chunks to `/api/transcribe/audio`
  - `stopTranscription()`: stops audio capture, closes SSE, cleanup
  - Parses SSE transcript events → dispatches to `call-store.addTranscriptEntry()` / `replaceInterimEntry()`
- [ ] Transcription starts automatically when `callState === "active"` (in notification handler)
- [ ] Transcription stops automatically on `callState === "hangup"` / `"destroy"` (in notification handler)
- [ ] Audio chunks POSTed at ~256ms intervals (4096 samples @ 16kHz)
- [ ] Interim transcript entries (isFinal: false) replaced by final entries (isFinal: true)
- [ ] Speaker diarization mapped: Deepgram speaker 0 → "agent", speaker 1 → "client"
- [ ] Error handling: SSE disconnect → retry 3x with exponential backoff (1s, 2s, 4s), then give up with toast
- [ ] No transcription state leaks between calls (clean reset on hangup)
- [ ] Verification: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task P2-03A must be complete (audio capture module)
- [x] Task P2-03B must be complete (server routes)
- [ ] DEEPGRAM_API_KEY configured in `.env.local`

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] If SSE connection drops frequently: increase retry count, add exponential backoff
- [ ] If audio POST latency is too high: batch chunks (send 2-3 at a time)
- [ ] If diarization doesn't work with mixed audio: send separate channels

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/P2-03C-wire-together.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] SSE + POST latency vs direct WebSocket — noticeable difference?
- [ ] Audio POST frequency (256ms intervals) — too fast for Next.js to handle?
- [ ] Deepgram interim results — how frequently do they arrive?
- [ ] Diarization with mixed mono audio — does Deepgram still distinguish speakers?

---

## Human Checkpoint
- [x] **REQUIRED** — Test with a real Telnyx call. Verify:
  1. Transcription starts when call connects
  2. Words appear in call-store.transcript[] in real-time
  3. Agent and client speech are labeled correctly (diarization)
  4. Transcription stops cleanly when call ends
  5. No errors in console, no memory leaks

---

## Description
Wire the audio capture (P2-03A) to the server routes (P2-03B) and integrate with the call lifecycle. This is the integration layer that makes transcription "just work" during calls.

The flow:
```
Call goes active
  → startTranscription(localStream, remoteStream)
    → EventSource opens to GET /api/transcribe/stream
    → Receives session_init with sessionId
    → startCapture(localStream, remoteStream, onChunk)
      → onChunk: POST audio to /api/transcribe/audio with sessionId
    → SSE transcript events → addTranscriptEntry() to call-store

Call ends (hangup/destroy)
  → stopTranscription()
    → stopCapture()
    → EventSource.close()
    → Server detects disconnect → closes Deepgram WS
```

## Steps (high-level)
1. Create `lib/deepgram/stream.ts`:
   a. `startTranscription(localStream, remoteStream)` — opens EventSource, waits for session_init, starts audio capture with onChunk callback
   b. onChunk callback: base64-encode PCM, POST to `/api/transcribe/audio` with sessionId (fire-and-forget, no await)
   c. SSE `transcript` event handler: parse JSON, create TranscriptEntry, dispatch to call-store
   d. `stopTranscription()` — stops audio capture, closes EventSource
   e. Error handling: EventSource onerror → retry with backoff
2. Modify `lib/telnyx/notification-handler.ts`:
   - On `"active"` state: get localStream + remoteStream from active call, call `startTranscription()`
   - On `"hangup"` / `"destroy"`: call `stopTranscription()`
3. Ensure clean state between calls:
   - `stopTranscription()` clears all internal state (sessionId, EventSource, capture handle)
   - `call-store.resetCall()` already clears transcript[] (from P2-01)
4. Type check: `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: wire audio capture to Deepgram transcription with call lifecycle`
- **Update:** [x] CLAUDE.md (add Deepgram to tech stack, add DEEPGRAM_API_KEY to env vars, note SSE+POST architecture)
- **Handoff notes:** Full transcription pipeline works end-to-end. Transcript entries populate in call-store during active calls. Task P2-04 builds the UI to display these. Task P2-05 uses the transcript text for AI coaching hints.

## Notes
- **Fire-and-forget POST**: Audio chunks are POSTed without awaiting the response. This prevents backpressure from slowing down audio capture. If a POST fails, the chunk is lost — acceptable for transcription (Deepgram handles gaps gracefully).
- **Base64 encoding**: PCM chunk (8192 bytes) → base64 (~10923 chars). At ~4 chunks/second, that's ~44KB/s of POST traffic. Acceptable for MVP.
- **Interim vs Final**: Deepgram sends interim results (is_final: false) frequently, then a final result (is_final: true) when it's confident. Use `replaceInterimEntry()` for interims and `addTranscriptEntry()` for finals. The call-store already has both methods from P2-01.
- **Speaker mapping**: Deepgram's diarization assigns speaker IDs (0, 1, 2...). Since we mix both streams into mono, Deepgram should still detect speaker changes. Map speaker 0 → "agent" (first speaker in outbound call is typically the agent) and speaker 1 → "client". This may need tuning after testing.
- **Getting MediaStreams**: Use `(getActiveCall() as any).localStream` and `(getActiveCall() as any).remoteStream`. Both should be available when callState is "active". Add null checks.
