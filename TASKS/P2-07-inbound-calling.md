# Task: P2-07-inbound-calling

## Status
- [x] Pending
- [x] In Progress
- [x] Verified
- [x] Complete

## Pillars

- **Model**: sonnet
- **Tools**: Antigravity (Claude Code)
- **Human Checkpoint**: Test inbound call from personal phone to Telnyx number

## Description

Add inbound call handling to the existing Telnyx WebRTC dialer. The SDK already receives inbound call notifications when connected — this task adds the UI and wiring to accept/decline incoming calls, display caller ID, and feed them into the same transcript + coaching + persistence pipeline as outbound calls.

## Prerequisites

### Telnyx Portal Changes (Lukas does manually before execution)
1. Edit the `ensurance-webrtc` SIP Connection → "Authentication and routing" tab
2. Change "Receive SIP URI calls" from "Not enabled" → "From anyone" (or "Only from my Connections" if preferred)
3. Save the connection

### Code Prerequisites
- P2-01 through P2-06 complete and committed
- WebRTC client already connects on app load via `CallNotificationHandler` in root layout
- `CallDirection` type already supports `'inbound' | 'outbound'` in `database.ts`
- `call-store.ts` already has `callDirection` field

## Architecture

The `@telnyx/webrtc` SDK fires a `telnyx.notification` event when an inbound call arrives. The existing `notification-handler.ts` already listens for these events but only handles outbound call state changes. This task extends it to detect inbound invites and surface them to the user.

Inbound call flow:
```
Phone dials Telnyx number
  → Telnyx routes to SIP Connection (ensurance-webrtc)
  → WebRTC SDK receives notification (type: "callUpdate", call.state: "ringing", call.direction: "inbound")
  → notification-handler detects inbound ringing → updates call-store
  → IncomingCallBanner renders (ring sound + caller ID + accept/decline)
  → User clicks Accept → call.answer() → state transitions to "active"
  → Same pipeline: transcript, coaching, post-call save
```

## Files to Create

### 1. `components/calling/incoming-call-banner.tsx` (~80 lines)
- Fixed position banner at top of screen (above everything, z-50)
- Shows: phone icon + incoming number (formatted) + "Incoming Call" label
- Two buttons: Accept (green, Phone icon) and Decline (red, PhoneOff icon)
- Pulsing/ringing animation on the banner (subtle, not distracting)
- Auto-dismiss after 30 seconds if not answered (call times out)
- Only renders when `callDirection === 'inbound' && callState === 'ringing'`

### 2. `components/calling/ring-sound.tsx` (~25 lines)
- Plays a ringtone sound when inbound call is ringing
- Uses HTML5 Audio with a simple built-in tone (use Web Audio API to generate a ring pattern, or a small mp3/ogg asset)
- Loops until call is answered, declined, or times out
- Respects browser autoplay rules (may need user interaction first)
- Alternative: skip the sound, just show the visual banner. Sound is nice-to-have.

### 3. `lib/telnyx/inbound-handler.ts` (~40 lines)
- `handleInboundCall(call)`: Sets call-store state for inbound ringing
- `acceptInboundCall()`: Calls `call.answer()` on the active TelnyxCall, transitions state to active
- `declineInboundCall()`: Calls `call.hangup()` on the active TelnyxCall, resets state
- Stores the inbound TelnyxCall reference (similar to `active-call.ts` for outbound)

## Files to Modify

### 4. `lib/telnyx/notification-handler.ts`
- Add detection for inbound calls: check `call.direction === 'inbound'` in the notification handler
- When inbound ringing detected: call `handleInboundCall(call)` from inbound-handler.ts
- When inbound call answered: same state transitions as outbound (active → timer starts → transcript starts)
- When inbound call ends: same hangup flow (persist call data, reset store)

### 5. `lib/store/call-store.ts`
- Add `inboundCallerNumber: string | null` to the store
- Add `setInboundRinging(callerNumber: string)` action
- Add `acceptInbound()` and `declineInbound()` actions
- `resetCall()` should also clear `inboundCallerNumber`

### 6. `app/layout.tsx`
- Add `<IncomingCallBanner />` to root layout (alongside existing `CallNotificationHandler`)
- This ensures inbound calls are visible regardless of which page the agent is on

### 7. `lib/telnyx/active-call.ts`
- Ensure `setActiveCall()` works for both inbound and outbound TelnyxCall objects
- `getRemoteStream()` should work the same for inbound calls (the SDK handles media the same way)

## Lead Matching (nice-to-have, not required for this task)
- When inbound call arrives, look up the caller's phone number against leads in Supabase
- If match found, show lead name in the banner instead of just the number
- If match found, auto-navigate to that lead's detail page on accept
- This is a stretch goal — skip if it adds complexity. The core task is just accept/decline/transcript.

## Success Criteria
1. `bunx tsc --noEmit` passes clean
2. When a phone calls the Telnyx number, the banner appears in the browser within 2-3 seconds
3. Clicking Accept answers the call — two-way audio works
4. Clicking Decline hangs up — banner disappears
5. After accepting, transcript flows in the AI panel (same as outbound)
6. After hangup, call log saves to Supabase with `direction: 'inbound'`
7. Banner is visible on any page (leads list, lead detail, quote page)

## Acceptance Criteria
- [ ] Incoming call banner renders on inbound ringing
- [ ] Accept button answers call with two-way audio
- [ ] Decline button rejects call and resets UI
- [ ] Inbound calls flow through same transcript pipeline
- [ ] Inbound calls persist to Supabase with correct direction
- [ ] Banner auto-dismisses on timeout (30s)
- [ ] No TypeScript errors

## Failure Handling
- If WebRTC client isn't connected when call arrives → call goes to voicemail/drops (expected, can't prevent)
- If `call.answer()` fails → show toast error, reset state
- If caller hangs up before agent answers → banner auto-dismisses, no crash

## Notes
- The `@telnyx/webrtc` SDK handles inbound and outbound calls with the same Call object — `.answer()` for inbound is analogous to `.newCall()` for outbound
- Inbound calls have `call.options.remoteCallerNumber` for the caller's number
- The transcript pipeline (Deepgram SSE + POST) starts the same way — it just needs an active MediaStream, which exists once the call is answered
- The coaching engine will work automatically since it reads from call-store.transcript[]
- Post-call persistence will work automatically since it triggers on hangup regardless of direction
- Reference the Telnyx WebRTC demo repo at `docs/references/webrtc-demo-js` for inbound call handling patterns

## On Completion
- Mark this file as verified
- Update CLAUDE.md if any new routes or components added
- Commit with message: `feat: add inbound call handling with accept/decline banner`
