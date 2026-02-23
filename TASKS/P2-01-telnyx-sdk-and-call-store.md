# Task: P2-01-telnyx-sdk-and-call-store

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
- [x] Bash: `bun add @telnyx/webrtc`, `bunx tsc --noEmit`
- [x] Grep, Glob (search)
- [x] WebFetch: Telnyx WebRTC SDK docs (https://www.npmjs.com/package/@telnyx/webrtc)
- [ ] Task (sub-agents)

### 3. Guardrails (DO NOT)
- [ ] Do NOT modify: `components/ui/*`, `styles/globals.css`, `lib/engine/*`
- [ ] Do NOT expose: Telnyx API key or SIP credentials in client-side code
- [ ] Do NOT install: `@telnyx/react-client` (we'll build our own React wrapper for more control)
- [ ] Do NOT skip: TypeScript strict mode compliance

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [x] PROJECT_SCOPE.md
- [ ] Specific files: `lib/store/lead-store.ts` (existing Zustand pattern), `lib/store/ui-store.ts` (existing Zustand pattern), `lib/types/lead.ts` (Lead type — note: no callLogs field, call logs live separately in call-store), `lib/types/database.ts` (has existing `CallDirection` type to reuse)
- [ ] External docs: https://www.npmjs.com/package/@telnyx/webrtc, https://developers.telnyx.com/development/webrtc/js-sdk/demo-app
- [ ] Reference repo: Clone https://github.com/team-telnyx/webrtc-demo-js.git — study `src/atoms/telnyxClient.ts` and `src/components/CallNotificationHandler.tsx` for SDK patterns

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `@telnyx/webrtc` installed and importable
- [ ] `lib/types/call.ts` exists with: CallState, CallLogEntry, TelnyxConfig interfaces (reuse `CallDirection` from `lib/types/database.ts` — do NOT redefine)
- [ ] `lib/store/call-store.ts` exists with Zustand store: telnyxClient, activeCall, callState, callDuration, isMuted, isOnHold, transcript[], coachingHints[], error
- [ ] `app/api/telnyx/token/route.ts` exists — server action that generates JWT token from Telnyx API key + Connection ID (credentials stay server-side)
- [ ] `lib/telnyx/client.ts` exists — singleton wrapper: initClient(token), connect(), disconnect(), getClient()
- [ ] Token endpoint returns valid JWT when called (test with curl or fetch)
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [ ] Telnyx account with: Credential Connection created, Outbound Voice Profile created, API v2 key generated
- [ ] TELNYX_API_KEY in `.env.local`
- [ ] TELNYX_CONNECTION_ID in `.env.local`
- [ ] Phase 1 complete (Zustand stores exist, lead store pattern established)

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach
- [ ] If Telnyx API returns auth errors: verify API key format and Connection ID in portal

**After max attempts exhausted:**
- [ ] Escalate to human immediately (likely credential/portal config issue)

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] JWT token generation requires specific Telnyx API endpoint or format
- [ ] @telnyx/webrtc has SSR/bundling issues with Next.js (may need dynamic import)
- [ ] WebSocket connection to rtc.telnyx.com requires specific CORS or security headers

---

## Human Checkpoint
- [x] **REQUIRED** — Lukas must configure Telnyx portal (Credential Connection + OVP + API key) before this task can complete. The task creates code, but the token endpoint won't work without valid credentials.

---

## Description
Install the Telnyx WebRTC SDK, create the call state management store, and build the secure JWT token endpoint. This is the foundation layer — no UI, no calling yet. Just the SDK, types, store, and authentication. Everything above this (dialer UI, transcription, AI coaching) depends on this task.

## Acceptance Criteria
- [ ] `bun add @telnyx/webrtc` succeeds
- [ ] CallState enum: 'idle' | 'connecting' | 'ringing' | 'active' | 'held' | 'ending' | 'error'
- [ ] CallStore actions: initiateCall, answerCall, hangupCall, toggleMute, toggleHold, resetCall, setError
- [ ] CallStore computed: callDurationFormatted (mm:ss), isCallActive, canDial
- [ ] Token endpoint validates request body (requires leadId for call logging context)
- [ ] Client wrapper handles: connect/disconnect lifecycle, reconnection on WebSocket drop
- [ ] No Telnyx credentials appear in any client-side bundle

## Steps (high-level)
1. Install SDK: `bun add @telnyx/webrtc`
2. Create `lib/types/call.ts` — CallState, CallLogEntry, TranscriptEntry, CoachingHint, TelnyxConfig (import `CallDirection` from `lib/types/database.ts`, do NOT redefine it)
3. Create `lib/store/call-store.ts` — Zustand store following existing lead-store pattern
4. Create `app/api/telnyx/token/route.ts` — POST endpoint that calls Telnyx API to generate JWT
5. Create `lib/telnyx/client.ts` — singleton TelnyxRTC wrapper with connect/disconnect/getClient
6. Add env vars to `.env.local.example`: TELNYX_API_KEY, TELNYX_CONNECTION_ID
7. Run `bunx tsc --noEmit`

## On Completion
- **Commit:** `feat: add Telnyx WebRTC SDK, call store, and JWT token endpoint`
- **Update:** [x] CLAUDE.md (add Telnyx to tech stack, add call-store to stores, add /api/telnyx routes)
- **Handoff notes:** SDK is installed, store is ready, token endpoint works. Task P2-02 builds the dialer UI on top of this. The TelnyxRTC client is NOT connected yet — that happens when the dialer component mounts and calls initClient().

## Notes
- The Telnyx demo repo uses Jotai atoms (`src/atoms/telnyxClient.ts`). We adapt the same patterns to Zustand since that's our state management.
- JWT tokens from Telnyx expire after 24 hours. The client wrapper should handle token refresh.
- `@telnyx/webrtc` is a client-side only library. Use `dynamic(() => import(...), { ssr: false })` if it causes SSR issues.
- The token endpoint is a server action — Telnyx API key never leaves the server.
- CallStore.transcript[] and coachingHints[] are empty arrays for now — populated by Tasks P2-03 and P2-05.
