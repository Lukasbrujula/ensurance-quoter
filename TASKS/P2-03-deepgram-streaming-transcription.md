# Task: P2-03-deepgram-streaming-transcription

## Status
- [x] Pending — **SPLIT into sub-tasks, execute P2-03A → P2-03B → P2-03C**
- [x] In Progress
- [x] Verified
- [x] Complete

## Sub-tasks
| Task | Scope | File |
|------|-------|------|
| **P2-03A** | Audio capture — PCM Int16 @ 16kHz mono from local+remote streams | `P2-03A-audio-capture.md` |
| **P2-03B** | Server routes — SSE + POST proxy to Deepgram | `P2-03B-server-routes.md` |
| **P2-03C** | Wire together — client manager, call lifecycle integration | `P2-03C-wire-together.md` |

## Pillars

### 1. Model
opus

### 2. Tools Required
- [x] Read, Edit, Write (file operations)
- [x] Bash: `bun add @deepgram/sdk`, `bunx tsc --noEmit`
- [x] Grep, Glob (search)
- [x] WebFetch: Deepgram streaming API docs (https://developers.deepgram.com/docs/getting-started-with-live-streaming-audio)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`, `lib/engine/*`
- [ ] Do NOT expose: Deepgram API key in client-side code
- [ ] Do NOT skip: audio capture error handling (getUserMedia failures, AudioContext issues)
- [ ] Do NOT record or store raw audio files — only text transcripts (privacy/storage)

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/store/call-store.ts` (transcript[] array to populate), `lib/types/call.ts` (TranscriptEntry type), `components/calling/call-notification-handler.tsx` (call state events to hook into)
- [ ] External docs: https://developers.deepgram.com/docs/getting-started-with-live-streaming-audio, https://developers.deepgram.com/docs/diarization

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `@deepgram/sdk` installed
- [ ] `app/api/transcribe/route.ts` — **SSE endpoint** that streams transcript JSON to the client + accepts audio via POST (Next.js doesn't support WS upgrades — SSE + POST is the chosen approach). Server-side connects to Deepgram WebSocket, keeps API key server-side.
- [ ] `app/api/transcribe/audio/route.ts` — **POST endpoint** that accepts PCM audio chunks and forwards them to the active Deepgram WebSocket connection
- [ ] `lib/telnyx/audio-capture.ts` — captures call audio from MediaStream using AudioContext + ScriptProcessorNode, outputs PCM Int16 chunks at 16kHz mono
- [ ] `lib/deepgram/stream.ts` — client-side manager: opens SSE connection to `/api/transcribe` for transcript output, POSTs audio chunks to `/api/transcribe/audio`, parses transcript JSON into TranscriptEntry[]
- [ ] TranscriptEntry includes: speaker (0=agent, 1=client), text, timestamp, isFinal (boolean)
- [ ] Transcript entries flow into call-store.transcript[] in real-time during a call
- [ ] When call ends (hangup), audio capture stops, WebSocket closes cleanly
- [ ] Speaker diarization works — agent and client are distinguished
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task P2-01 must be complete (call store with transcript[] array)
- [x] Task P2-02 must be complete (active call provides MediaStream to capture from)
- [ ] DEEPGRAM_API_KEY in `.env.local`
- [ ] Deepgram account with $200 free credits

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach
- [ ] If WebSocket proxy fails: try direct Deepgram WebSocket from client (less secure but functional)
- [ ] If AudioContext fails: try MediaRecorder API as fallback

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/P2-03-deepgram-streaming-transcription.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] SSE + POST approach has unexpected latency or reliability issues
- [ ] AudioContext sample rate issues (browser default vs Deepgram 16kHz requirement)
- [ ] ScriptProcessorNode deprecation — may need AudioWorklet instead
- [ ] Deepgram diarization accuracy with WebRTC audio quality
- [ ] Browser MediaStream capture only gets local mic, not remote audio — may need to mix streams

---

## Human Checkpoint
- [x] **REQUIRED** — Test with a real call. Verify that spoken words appear as transcript entries in the call store. Check that agent and client speech are distinguished (diarization).

---

## Description
Build the audio capture pipeline and real-time transcription integration. During an active Telnyx call, capture the audio stream, send it to Deepgram via a server-side WebSocket proxy, and receive transcript entries that populate the call store. This is the data pipeline — the UI for displaying transcripts is Task P2-04.

**This is the most technically complex task in Phase 2.** It involves:
1. Browser audio capture (MediaStream → AudioContext → PCM)
2. **SSE + POST proxy** (client POSTs audio chunks → server forwards to Deepgram WS; server streams transcripts back via SSE) — chosen over WebSocket proxy because Next.js App Router doesn't support WS upgrades natively
3. Deepgram streaming API (audio in, transcript JSON out)
4. Speaker diarization (distinguish agent from client)
5. State management (transcript entries into Zustand)

## Acceptance Criteria
- [ ] Audio capture starts automatically when call goes active (callState === 'active')
- [ ] Audio capture stops automatically when call ends
- [ ] Audio is captured at 16kHz mono (Deepgram recommended format)
- [ ] SSE + POST proxy handles: connection, reconnection (3 retries with exponential backoff), clean shutdown
- [ ] Deepgram receives audio and returns transcript with `is_final` flag
- [ ] Interim results (is_final: false) shown differently from final results (is_final: true)
- [ ] Speaker labels: speaker 0 = agent, speaker 1 = client (mapped from Deepgram diarization)
- [ ] Transcript entries have timestamps relative to call start
- [ ] No audio data stored — only text transcripts
- [ ] Memory: audio buffers released after sending (no accumulation)

## Steps (high-level)
1. Install Deepgram SDK: `bun add @deepgram/sdk`
2. Create `lib/types/call.ts` update — ensure TranscriptEntry has: id, speaker ('agent' | 'client'), text, timestamp, isFinal, words[]
3. Create `lib/telnyx/audio-capture.ts`:
   a. Accept MediaStream (from active call)
   b. Create AudioContext at 16000Hz sample rate
   c. Create ScriptProcessorNode (bufferSize: 4096)
   d. Convert Float32 audio samples to Int16 PCM
   e. Output PCM chunks via callback
   f. Clean shutdown: disconnect nodes, close context
4. Create `app/api/transcribe/route.ts` (GET — SSE endpoint):
   a. On GET request, open SSE stream to client
   b. Server-side: connect to Deepgram Live API WebSocket with: model=nova-3, language=en, diarize=true, punctuate=true, interim_results=true, utterance_end_ms=1000
   c. Store the Deepgram WS connection keyed by a session ID (returned to client in SSE init event)
   d. Pipe Deepgram transcript events → SSE stream to client
   e. Handle Deepgram connection errors, reconnect
5. Create `app/api/transcribe/audio/route.ts` (POST — audio upload):
   a. Accept PCM audio chunks + session ID in request
   b. Forward audio to the active Deepgram WS connection for that session
   c. Return 200 on success
6. Create `lib/deepgram/stream.ts`:
   a. Client-side manager (NOT WebSocket — uses EventSource + fetch)
   b. Opens EventSource to `/api/transcribe` for receiving transcripts
   c. POSTs PCM chunks from audio-capture to `/api/transcribe/audio` with session ID
   d. Parses transcript JSON from SSE events into TranscriptEntry
   e. Dispatches to call-store.addTranscriptEntry()
   f. Handles reconnection, buffering during disconnect
6. Wire into call lifecycle: in CallNotificationHandler, when call goes active → start audio capture + Deepgram stream. On hangup → stop both.
7. Add env var: DEEPGRAM_API_KEY to `.env.local.example`
8. Run `bunx tsc --noEmit`

## Sub-task Consideration
**If this task proves too large**, split into:
- **P2-03A**: Audio capture only (MediaStream → PCM chunks → console.log chunk sizes). Success = chunks flowing.
- **P2-03B**: WebSocket proxy + Deepgram connection (hardcoded audio file → Deepgram → transcript). Success = transcripts returning from Deepgram.
- **P2-03C**: Wire together (live audio → proxy → Deepgram → call store). Success = real-time transcript in store during call.

## On Completion
- **Commit:** `feat: add Deepgram streaming transcription with speaker diarization`
- **Update:** [x] CLAUDE.md (add Deepgram to tech stack, add DEEPGRAM_API_KEY to env vars)
- **Handoff notes:** Transcription pipeline works. call-store.transcript[] populates during active calls. Task P2-04 builds the UI to display this. Task P2-05 uses transcript text for AI coaching.

## Notes
- **Critical browser limitation**: MediaStream from WebRTC may only give local mic audio (agent), not remote audio (client). To capture both sides, you may need:
  - Option A: Telnyx call recording API (records both sides server-side) → download after
  - Option B: Web Audio API to mix local mic + remote stream (from `<audio>` element's MediaStream)
  - Option C: Use Telnyx's built-in media forking to send audio to Deepgram directly (advanced)
  - **Start with Option B** (mix streams) and document if it doesn't work.
- **DECIDED: SSE + POST approach.** Next.js App Router doesn't support WebSocket upgrades. Use SSE (`GET /api/transcribe`) for streaming transcripts to client + POST (`/api/transcribe/audio`) for sending audio chunks to server. Server maintains the Deepgram WebSocket connection internally. This is the most Next.js-native approach — no extra packages or servers needed. The tiny added latency from POST vs WS is negligible for transcription display.
- Deepgram Nova-3 at $0.0077/min is very affordable. The $200 free credit = ~430 hours.
- ScriptProcessorNode is deprecated but still widely supported. AudioWorklet is the replacement but more complex. Use ScriptProcessorNode for MVP, migrate later if needed.
- Buffer audio during WebSocket reconnection (max 5 seconds), then send buffered chunks when reconnected.
