# Task: LANGUAGE-SPECIALIST-HANDOFF

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
- [ ] Do NOT add `{ type: 'hangup' }` alongside the handoff tool — this combination is untested and may break WebRTC
- [ ] Do NOT add the handoff tool to the tools array if no specialist is configured — only add tools key when specialists exist
- [ ] Do NOT modify the main agent model, enabled_features, or telephony_settings
- [ ] Do NOT store `telnyx_assistant_id` of specialist anywhere other than the `voice_agents` table

### 4. Knowledge (MUST READ)
- [x] CLAUDE.md
- [x] CODEBASE_AUDIT.md — auth system, Supabase tables, voice_agents table structure
- [ ] Read current Telnyx assistant creation code (the POST to `/v2/ai/assistants`)
- [ ] Read `lib/supabase/` for voice_agents table schema

**Handoff tool schema (verified working from Growthly production):**
```typescript
// Only include tools key when specialists are configured
const tools = [];
if (spanishAgentAssistantId) {
  tools.push({
    type: 'handoff',
    handoff: {
      description: 'Transfer the caller to a Spanish-speaking specialist when they prefer Spanish',
      ai_assistants: [
        {
          name: 'Spanish Agent',
          id: spanishAgentAssistantId,
        }
      ]
    }
  });
}
if (tools.length > 0) {
  mainAgentPayload.tools = tools;
}
// Do NOT include tools key at all if array is empty
```

**Telnyx API note:** Use POST (not PATCH) for updates to `/v2/ai/assistants/:id`

### 5. Memory
- [x] N/A (fresh context)

### 6. Success Criteria
- [ ] Agent settings page has a toggle: "Enable Spanish-language specialist agent"
- [ ] When toggled ON and saved: a second Telnyx assistant is created with Spanish prompt, and the main agent's Telnyx payload is updated to include the handoff tool pointing to the specialist's assistant ID
- [ ] When toggled OFF: specialist assistant is deleted from Telnyx, handoff tool is removed from main agent
- [ ] Both assistant IDs are persisted in the database
- [ ] `npx tsc --noEmit` passes clean

### 7. Dependencies
- [ ] Task 01 (CONSOLIDATE-AGENT-TYPES) complete
- [ ] Task 02 (UNIFIED-PROMPT-TEMPLATE) complete — Spanish prompt uses same builder with `language: 'es'`

### 8. Failure Handling
**Max attempts:** 3

**On failure:**
- Attempt 1: Retry
- Attempt 2: Scope down — implement the toggle UI only, without actually creating the Telnyx specialist (mock the creation, leave a TODO)
- Attempt 3: Save error to `ERRORS/task-03.md` and STOP

**Rollback:** `git stash && git checkout HEAD~1`
If Telnyx assistants were created during the failed attempt, log their IDs and manually delete via Telnyx dashboard.

---

## Description
Adds an optional Spanish-language specialist agent. When enabled, a second Telnyx AI assistant is created using the same prompt builder with `language: 'es'`. The main agent receives a `handoff` tool pointing to the specialist, so callers who prefer Spanish are automatically transferred. The handoff tool is only added to the payload when a specialist exists — an empty tools array is never sent.

## Acceptance Criteria
- [ ] Toggle exists in agent edit UI (not create — edit/settings after agent is created)
- [ ] Enabling toggle creates specialist Telnyx assistant + stores its ID
- [ ] Main agent is updated via POST to include handoff tool
- [ ] Disabling toggle deletes specialist from Telnyx + removes handoff tool from main agent
- [ ] No TypeScript errors

## Steps
1. Add `spanish_agent_assistant_id` column to voice_agents table (or equivalent) via Supabase migration
2. Add toggle to agent edit/settings UI
3. On save with toggle ON: call `buildInboundAgentPrompt({ language: 'es', ...config })`, POST to Telnyx to create specialist, store ID
4. Update main agent via POST to `/v2/ai/assistants/:id` with handoff tool in tools array
5. On save with toggle OFF: DELETE specialist from Telnyx, POST main agent update removing tools
6. `npx tsc --noEmit`

## On Completion
- **Commit:** `feat: spanish specialist agent with handoff tool`
- **Human Checkpoint:** ✅ REQUIRED — Supabase migration must be reviewed before running
- **Handoff notes:** Task 04 builds the knowledge base UI. Task 05 wires the hangup tool (separate from handoff).
