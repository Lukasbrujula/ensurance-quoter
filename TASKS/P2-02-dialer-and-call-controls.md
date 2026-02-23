# Task: P2-02-dialer-and-call-controls

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
- [ ] Do NOT modify: `components/ui/*`, `lib/engine/*`, `lib/store/lead-store.ts` (extend, don't change)
- [ ] Do NOT auto-dial: agent must explicitly click "Call" button
- [ ] Do NOT skip: microphone permission request handling (graceful error if denied)
- [ ] Do NOT break: existing lead detail view layout or quote functionality

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md (always)
- [ ] Specific files: `lib/store/call-store.ts` (from P2-01), `lib/telnyx/client.ts` (from P2-01), `components/leads/lead-detail-client.tsx` (where dialer integrates)
- [ ] Reference repo: `src/components/Dialer.tsx`, `src/components/ActiveCall.tsx`, `src/components/Keyboard.tsx`, `src/components/CallNotificationHandler.tsx`
- [ ] Current state audit: Lead detail has a header with lead name/info. The "Call" button needs to go here.

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] `components/calling/call-button.tsx` — click-to-call button in lead detail header, shows lead phone number, disabled if no phone
- [ ] `components/calling/active-call-bar.tsx` — appears during active call: timer (mm:ss), mute button, hold button, DTMF keypad button, hangup button
- [ ] `components/calling/dtmf-keypad.tsx` — modal with 0-9, *, # buttons for sending DTMF tones during call
- [ ] `components/calling/call-notification-handler.tsx` — invisible component that listens to TelnyxRTC notification events and updates call-store
- [ ] Call lifecycle works: click Call → connecting → ringing → active (timer starts) → hangup (timer stops, state resets)
- [ ] Mute toggle works (toggles audio, icon changes)
- [ ] Hold toggle works (puts call on hold, icon changes)
- [ ] DTMF sends tones during active call
- [ ] Error handling: mic denied → clear error message, call failed → toast with reason, network drop → reconnect attempt
- [ ] `<audio>` element for remote audio (caller hears the other party)
- [ ] Verification command: `bunx tsc --noEmit` exits 0

### 7. Dependencies
- [x] Task P2-01 must be complete (SDK installed, call store exists, token endpoint works)
- [ ] Telnyx portal configured and credentials in .env.local

### 8. Failure Handling
**Max attempts:** 3

**On failure (per attempt):**
- [ ] Retry with different approach
- [ ] If WebRTC connection fails: check browser compatibility, try with `webrtc-adapter` polyfill

**After max attempts exhausted:**
- [ ] Save error to `ERRORS/P2-02-dialer-and-call-controls.md` and STOP

**Rollback command:** `git stash && git checkout HEAD~1`

### 9. Learning
**Log to LEARNINGS.md if:**
- [ ] TelnyxRTC notification events have different structure than documented
- [ ] Audio element needs specific handling for WebRTC streams (srcObject vs src)
- [ ] Browser auto-play policies block remote audio — may need user gesture
- [ ] Hold/unhold has edge cases (call drops on hold, etc.)

---

## Human Checkpoint
- [x] **REQUIRED** — Test with a real phone call to a known number. Agent must verify: can hear remote party, remote party can hear agent, mute works, call ends cleanly.

---

## Description
Build the click-to-call dialer UI and full call controls. When an agent views a lead with a phone number, they see a "Call" button. Clicking it initiates a Telnyx WebRTC call to that number. During the call, a persistent bar shows call controls (timer, mute, hold, DTMF, hangup). This is the core telephony UI.

## Acceptance Criteria
- [ ] "Call" button visible in lead detail header when lead has phone number
- [ ] "Call" button hidden/disabled when: no phone, already in a call, no Telnyx connection
- [ ] Active call bar sticks to top of lead detail view (doesn't scroll away)
- [ ] Call timer counts up from 00:00 (updates every second)
- [ ] Mute/unmute toggles audio with visual indicator (icon changes, button style changes)
- [ ] Hold/unhold works with visual indicator
- [ ] DTMF keypad opens as popover/modal, sends tones on button press
- [ ] Hangup button ends call, resets all state, stops timer
- [ ] Remote audio plays through browser (uses `<audio>` element with srcObject)
- [ ] Microphone permission requested on first call — if denied, show clear error
- [ ] CallNotificationHandler updates store on: callUpdate (state changes), userMediaError, error
- [ ] Toast notifications for: call connected, call ended, call failed, mic denied

## Steps (high-level)
1. Create `components/calling/call-notification-handler.tsx` — listens to TelnyxRTC `telnyx.notification` events, dispatches to call-store
2. Create `components/calling/call-button.tsx` — reads lead phone from store, initiates call via callStore.initiateCall(phoneNumber)
3. Create `components/calling/active-call-bar.tsx` — shows during active/ringing/held states, renders timer + controls
4. Create `components/calling/dtmf-keypad.tsx` — 4x3 grid keypad, sends call.dtmf(digit) on press
5. Create `components/calling/remote-audio.tsx` — hidden `<audio>` element that attaches to call's remote MediaStream
6. Add CallNotificationHandler to **root layout** (`app/layout.tsx`) so it works globally across all routes (leads, quote, etc.) — not in leads layout
7. Add CallButton to lead detail header (inside `lead-detail-client.tsx` breadcrumb area)
8. Add ActiveCallBar inside `lead-detail-client.tsx`, between the breadcrumb header and `<QuoteWorkspace>` (conditionally rendered when call active)
9. Wire call lifecycle: initiateCall() → client.newCall({destinationNumber, callerNumber}) → notification handler → store updates → UI reacts
10. Add useInterval hook for call timer (updates callDuration every second while call is active)
11. Test with a real call

## On Completion
- **Commit:** `feat: add dialer UI with call controls, mute, hold, DTMF`
- **Update:** [x] CLAUDE.md (add components/calling/ to directory structure)
- **Handoff notes:** Agent can now make outbound calls from lead detail view. Call state is managed in Zustand. Task P2-03 adds live transcription (captures audio stream). Task P2-04 adds the transcript UI to the AI panel.

## Notes
- Reference `src/components/ActiveCall.tsx` from the Telnyx demo for call control patterns. They use `call.muteAudio()`, `call.hold()`, `call.dtmf(digit)`, `call.hangup()`.
- Reference `src/components/CallNotificationHandler.tsx` for how to listen to `telnyx.notification` events and extract call state.
- The `<audio>` element approach: set `audioRef.current.srcObject = call.remoteStream` when call goes active. Reference `src/components/ActiveCall.tsx` for this pattern.
- The active call bar should be compact (one horizontal row) — it lives inside `lead-detail-client.tsx` between the breadcrumb header and `<QuoteWorkspace>`, not inside a panel.
- CallNotificationHandler mounts in the **root layout** (`app/layout.tsx`), not the leads layout, so call state is available on all routes.
- Consider adding a small "calling..." overlay or animation during the ringing state.
- callerNumber should come from the token endpoint response (server returns it alongside the JWT from TELNYX_CALLER_NUMBER env var), not from the lead record.
