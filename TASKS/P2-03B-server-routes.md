# Task: P2-03B-server-routes

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
- [x] Bash: `bun add @deepgram/sdk`, `bunx tsc --noEmit`
- [x] Grep, Glob (search)
- [x] WebFetch: Deepgram streaming API docs
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`, `lib/engine/*`
- [ ] Do NOT expose: DEEPGRAM_API_KEY in client-side code (server-side only)
- [ ] Do NOT store audio data — only forward it to Deepgram in real-time
- [ ] Do NOT break: existing API routes

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/types/call.ts` (TranscriptEntry, TranscriptWord types), `app/api/telnyx/token/route.ts` (pattern for server-side API routes with env var validation)
- [ ] External docs: https://developers.deepgram.com/docs/getting-started-with-live-streaming-audio
- [ ] Deepgram Nova-3 config: `model=nova-3`, `language=en`, `diarize=true`, `punctuate=true`, `interim_results=true`, `utterance_end_ms=1000`, `encoding=linear16`, `sample_rate=16000`, `channels=1`

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `@deepgram/sdk` installed
- [ ] `app/api/transcribe/stream/route.ts` — **GET endpoint** returns SSE stream:
  - On connect: creates a session ID, opens Deepgram Live WebSocket server-side
  - Sends SSE events: `session_init` (session ID), `transcript` (TranscriptEntry JSON), `error`, `close`
  - Keeps Deepgram WS connection alive for the duration of the SSE stream
  - Closes Deepgram WS when client disconnects (SSE close)
- [ ] `app/api/transcribe/audio/route.ts` — **POST endpoint** accepts audio:
  - Receives: `{ sessionId: string, audio: base64-encoded PCM }` (JSON body)
  - Looks up active Deepgram WS by session ID
  - Forwards decoded PCM bytes to Deepgram WS
  - Returns 200 on success, 404 if session not found, 400 if invalid
- [ ] Session management: `lib/deepgram/sessions.ts` — Map<sessionId, DeepgramConnection>
  - Auto-cleanup on disconnect / timeout (30s idle)
  - Max 10 concurrent sessions (prevent abuse)
- [ ] Deepgram transcript events mapped to our TranscriptEntry format:
  - `channel.alternatives[0].transcript` → text
  - `channel.alternatives[0].words[].speaker` → speaker (0=agent, 1=client)
  - `is_final` → isFinal
  - `start` → timestamp (relative to stream start)
- [ ] DEEPGRAM_API_KEY validated at startup, 500 if missing
- [ ] Verification: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task P2-01 must be complete (TranscriptEntry type exists)
- [ ] DEEPGRAM_API_KEY in `.env.local`
- [ ] Deepgram account (free tier has $200 credit)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] If Deepgram SDK has issues: use raw WebSocket to `wss://api.deepgram.com/v1/listen`
- [ ] If SSE has issues with Next.js: try ReadableStream with TransformStream instead of raw SSE
- [ ] If session management leaks: add aggressive cleanup timers

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/P2-03B-server-routes.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Deepgram SDK vs raw WebSocket — which is simpler for streaming
- [ ] SSE in Next.js App Router has gotchas (buffering, timeouts, edge runtime)
- [ ] Session management patterns for stateful server-side connections in serverless
- [ ] Deepgram diarization accuracy with mixed mono audio

---

## Human Checkpoint
- [ ] **NOT REQUIRED** — Can be tested with a static audio file. Real call testing happens in P2-03C.

---

## Description
Build the server-side routes that proxy audio to Deepgram and stream transcripts back. The architecture is SSE + POST because Next.js App Router doesn't support WebSocket upgrades:

```
Client                          Server                         Deepgram
  │                               │                               │
  │── GET /api/transcribe/stream ─→│                               │
  │←─ SSE: session_init {id} ─────│                               │
  │                               │── WS connect ────────────────→│
  │                               │←─ WS ready ──────────────────│
  │── POST /api/transcribe/audio ─→│── WS: audio bytes ──────────→│
  │                               │←─ WS: transcript JSON ───────│
  │←─ SSE: transcript {data} ─────│                               │
  │── POST /api/transcribe/audio ─→│── WS: audio bytes ──────────→│
  │                               │←─ WS: transcript JSON ───────│
  │←─ SSE: transcript {data} ─────│                               │
  │── SSE close ──────────────────→│── WS close ─────────────────→│
```

## Steps (high-level)
1. Install Deepgram SDK: `bun add @deepgram/sdk`
2. Create `lib/deepgram/sessions.ts`:
   - `Map<string, { ws: DeepgramWebSocket, sseController: ReadableStreamDefaultController }>`
   - `createSession(controller)`: generates UUID, opens Deepgram WS, stores mapping, returns sessionId
   - `sendAudio(sessionId, audio: Buffer)`: forwards to Deepgram WS
   - `closeSession(sessionId)`: closes WS, removes from map
   - Auto-cleanup: 30s idle timeout per session, max 10 concurrent
3. Create `app/api/transcribe/stream/route.ts` (GET):
   - Create ReadableStream for SSE
   - On stream start: create session, send `session_init` event with ID
   - Wire Deepgram transcript events → SSE `transcript` events
   - On client disconnect: close session
   - Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
4. Create `app/api/transcribe/audio/route.ts` (POST):
   - Parse JSON body: `{ sessionId: string, audio: string }` (base64)
   - Validate sessionId exists in sessions map
   - Decode base64 → Buffer
   - Forward to Deepgram WS via `sendAudio(sessionId, buffer)`
   - Return `{ ok: true }`
5. Map Deepgram response format to TranscriptEntry:
   - Generate UUID for entry ID
   - Map `channel.alternatives[0].words[].speaker` to "agent" | "client" (speaker 0 = agent, speaker 1 = client)
   - Extract word-level timing into TranscriptWord[]
   - Use `start` field as timestamp
6. Type check: `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: add Deepgram transcription server routes (SSE + POST proxy)`
- **Update:** [x] CLAUDE.md (add DEEPGRAM_API_KEY to env vars section, add @deepgram/sdk to tech stack)
- **Handoff notes:** Server routes are ready. P2-03C wires the client-side audio capture to these routes and integrates with call lifecycle.

## Notes
- **SSE in Next.js App Router**: Use `new ReadableStream()` with `new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })`. The stream stays open until the client disconnects. Use `controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))` to send events.
- **Session management is stateful**: This means these routes don't work in a serverless/edge environment with multiple instances. For MVP this is fine (single server). For production, would need Redis-backed session management.
- **Audio encoding**: Client sends base64-encoded PCM in JSON body. This has ~33% overhead vs binary, but avoids Content-Type complexity with Next.js. Acceptable for MVP — PCM at 16kHz mono is ~32KB/s, base64 overhead makes it ~43KB/s. Still very manageable.
- Deepgram Nova-3 costs $0.0077/min. The $200 free credit ≈ 430 hours of transcription.
- **TODO(P5)**: Add auth check on these routes (same as telnyx/token).
