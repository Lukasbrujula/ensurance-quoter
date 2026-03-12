# Task: HANGUP-TOOL

## Status
- [ ] Pending
- [ ] In Progress
- [ ] Verified
- [ ] Complete

## Pillars

### 1. Model
sonnet

### 2. Tools Required
- [x] Read, Edit, Write (file operations)
- [x] Bash: `npx tsc --noEmit`
- [x] Grep, Glob (search)

### 3. Guardrails (DO NOT)
- [ ] Do NOT combine hangup tool with handoff tool in the same agent in the same task — test hangup alone first
- [ ] Do NOT set `transcription.model: 'deepgram/nova-2'` — use `deepgram/flux` (newer, works with hangup)
- [ ] Do NOT modify any other part of the Telnyx payload — only add the tools array
- [ ] Do NOT mark complete until a real test call is made and hangup is verified

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md
- [ ] Read current Telnyx assistant creation payload (find the POST to `/v2/ai/assistants`)
- [ ] Read `docs/COMPULIFE_API.md` — not directly relevant but confirms pattern of reading reference files first

**Hangup tool schema (confirmed working in Growthly production tests):**
```typescript
tools: [
  {
    type: "hangup",
    hangup: {
      description: "Use this to end the call when the user says goodbye or wants to end the conversation"
    }
  }
]
```

**Known WebRTC conflict from Growthly research:**
- Adding hangup broke WebRTC in Growthly when `transcription.model` was `deepgram/nova-2`
- Growthly resolved this by switching to `deepgram/flux`
- Ensurance currently uses `deepgram/nova-2` — this task must also switch the transcription model
- If hangup still breaks WebRTC after switching, revert and save error — do NOT keep retrying

**Telnyx API:** POST (not PATCH) for updates

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] All newly created Telnyx assistants include the hangup tool in their payload
- [ ] Transcription model updated to `deepgram/flux`
- [ ] A test call is made (via the Test Call button on the Agents page) and saying "goodbye" ends the call automatically
- [ ] `npx tsc --noEmit` passes clean

### 7. Dependencies
- [ ] Task 01 (CONSOLIDATE-AGENT-TYPES) complete — must have a working single agent before adding tools
- [ ] Tasks 02, 03, 04 do NOT need to be complete — this task is independent of those

### 8. Failure Handling
**Max attempts:** 3

**On failure (WebRTC breaks):**
- Attempt 1: Verify `deepgram/flux` is set, retry
- Attempt 2: Try removing hangup from tools, test if base agent still works — isolate whether hangup or transcription model is the issue
- Attempt 3: Revert both changes (`git stash`), save error to `ERRORS/task-05.md`, STOP — do not leave a broken agent

**Rollback:** `git stash && git checkout HEAD~1`

**⚠️ If rollback is needed:** Any Telnyx assistants created during this task may have the broken config. Note their IDs in the error log — may need manual cleanup in Telnyx dashboard.

---

## Description
Adds the hangup tool to the Telnyx assistant creation payload so agents automatically end calls when callers say goodbye. Also upgrades the transcription model from `deepgram/nova-2` to `deepgram/flux`, which is required for the hangup tool to work correctly in WebRTC. This is a targeted, minimal change — only two fields are modified in the payload.

## Acceptance Criteria
- [ ] `tools: [{ type: "hangup", hangup: { description: "..." } }]` present in Telnyx payload
- [ ] `transcription.model` is `deepgram/flux`
- [ ] Test call made and hangup verified working
- [ ] No TypeScript errors
- [ ] No regression — base WebRTC calling still works after changes

## Steps
1. Find the Telnyx assistant creation function (search for POST to `v2/ai/assistants`)
2. Change `transcription.model` from `deepgram/nova-2` to `deepgram/flux`
3. Add tools array with hangup tool object
4. Create a new test agent via the UI
5. Make a test call — say "goodbye" — verify call ends
6. `npx tsc --noEmit`

## On Completion
- **Commit:** `feat: add hangup tool and upgrade to deepgram/flux`
- **Handoff notes:** Task 03 adds handoff tool alongside hangup — ensure both coexist without conflict (handoff is only added when specialist exists, so tools array will sometimes have 1 item, sometimes 2).
