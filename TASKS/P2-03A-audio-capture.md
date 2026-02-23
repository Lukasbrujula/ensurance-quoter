# Task: P2-03A-audio-capture

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
- [x] WebFetch: Web Audio API docs, AudioWorklet vs ScriptProcessorNode
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`, `lib/engine/*`
- [ ] Do NOT store or persist raw audio data — only PCM chunks in flight
- [ ] Do NOT add network calls — this task is pure audio processing
- [ ] Do NOT use MediaRecorder (we need raw PCM, not encoded audio)

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/telnyx/active-call.ts` (getRemoteStream, getActiveCall for localStream), `lib/store/call-store.ts` (callState to know when capture should run)
- [ ] Reference: Web Audio API AudioContext, ScriptProcessorNode (or AudioWorklet for modern path)
- [ ] Critical: Must capture BOTH sides of the call — local mic (agent) + remote stream (client). Use Web Audio API to mix both MediaStreams into a single AudioContext before downsampling.

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `lib/telnyx/audio-capture.ts` exists with clean API:
  - `startCapture(localStream: MediaStream, remoteStream: MediaStream, onChunk: (pcm: Int16Array) => void): AudioCaptureHandle`
  - `stopCapture(handle: AudioCaptureHandle): void`
- [ ] Captures both local mic (agent) AND remote audio (client) by mixing streams
- [ ] Output: PCM Int16 at 16kHz mono, ~4096 samples per chunk (~256ms per chunk)
- [ ] Downsampling from browser default (usually 44.1kHz or 48kHz) to 16kHz handled correctly
- [ ] Float32 → Int16 conversion is correct (clamp, scale by 0x7FFF)
- [ ] Clean shutdown: disconnect all AudioNodes, close AudioContext, release MediaStreams
- [ ] No memory leaks — buffers are not accumulated, only passed through
- [ ] Test hook: when `onChunk` logs `chunk.byteLength`, sizes should be consistent (~8192 bytes = 4096 samples × 2 bytes)
- [ ] Verification: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task P2-02 must be complete (active call provides local + remote MediaStreams)
- [ ] No external dependencies needed — Web Audio API is built into browsers

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] If AudioContext sampleRate can't be set to 16kHz: create at default rate, downsample in ScriptProcessorNode
- [ ] If ScriptProcessorNode deprecated warnings cause issues: try AudioWorklet approach
- [ ] If remote stream capture fails: document limitation, capture local only (diarization will still work via Deepgram)

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/P2-03A-audio-capture.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] Browser AudioContext doesn't support 16kHz sample rate (common — most browsers default to 44.1kHz or 48kHz)
- [ ] ScriptProcessorNode has noticeable latency or buffer issues
- [ ] Remote MediaStream from TelnyxRTC requires special handling to feed into AudioContext
- [ ] Mixing two MediaStreams produces artifacts or volume issues

---

## Human Checkpoint
- [ ] **NOT REQUIRED** — This is testable via console.log output. Real call testing happens in P2-03C.

---

## Description
Build the audio capture module that takes raw MediaStreams from an active Telnyx call and outputs PCM Int16 chunks suitable for Deepgram. This is pure audio processing — no network, no Deepgram, no state management. Just: MediaStream in → PCM chunks out.

The key technical challenge is capturing BOTH sides of the conversation:
- **Agent (local)**: `call.localStream` from TelnyxRTC
- **Client (remote)**: `call.remoteStream` from TelnyxRTC

Both streams need to be mixed into a single AudioContext, downsampled to 16kHz mono, and converted from Float32 to Int16 PCM.

## Steps (high-level)
1. Create `lib/telnyx/audio-capture.ts`
2. Define `AudioCaptureHandle` interface (for cleanup reference)
3. Implement `startCapture(localStream, remoteStream, onChunk)`:
   a. Create AudioContext (try 16kHz sampleRate, fall back to default + manual downsample)
   b. Create MediaStreamSource for localStream
   c. Create MediaStreamSource for remoteStream
   d. Create ChannelMergerNode to mix both sources
   e. Create ScriptProcessorNode (bufferSize: 4096, inputChannels: 1, outputChannels: 1)
   f. In `onaudioprocess`: extract Float32 inputBuffer → downsample if needed → convert to Int16 → call `onChunk(int16Array)`
   g. Connect: sources → merger → processor → context.destination (or a dummy sink)
4. Implement `stopCapture(handle)`: disconnect nodes, close AudioContext
5. Add downsample helper: `downsample(buffer: Float32Array, fromRate: number, toRate: number): Float32Array`
6. Add float-to-int16 helper: `floatToInt16(input: Float32Array): Int16Array`
7. Type check: `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: add audio capture module for call recording (PCM Int16 @ 16kHz)`
- **Update:** None (internal module, no user-facing changes)
- **Handoff notes:** Audio capture produces PCM chunks. P2-03B builds the server routes to send these to Deepgram. P2-03C wires everything together.

## Notes
- ScriptProcessorNode is deprecated but still works in all browsers. AudioWorklet is the modern replacement but significantly more complex (requires a separate worklet file, MessagePort communication). Use ScriptProcessorNode for MVP.
- Browser AudioContext default sample rate is typically 44100 or 48000. Deepgram wants 16000. The downsample step is critical — dropping samples naively causes aliasing. Use linear interpolation for acceptable quality.
- The ChannelMergerNode approach mixes both streams. Alternative: create two separate ScriptProcessorNodes and interleave. Merger is simpler.
- Don't create the AudioContext until user clicks Call — browsers require a user gesture to start AudioContext.
