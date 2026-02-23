# Phase 7: Telnyx AI Agent (Inbound) — Task Index

**Created:** 2026-02-23  
**Total Tasks:** 6  
**Estimated Total:** ~6 hrs  
**Branch:** `feature/lukas`  
**Depends on:** Phase 6 complete

---

## What We're Building

When a lead calls the agent's Telnyx number and the agent doesn't pick up, a Telnyx AI voice agent answers instead. It collects basic info (name, reason for calling, callback preference), then creates a lead in the Ensurance CRM with source `'ai_agent'`. The agent sees the AI-collected lead in their normal leads list and can call back with context.

**This is NOT a full agent builder.** It's a single pre-configured AI assistant per Ensurance agent, managed through the Settings > Integrations page.

---

## UI Integration

| Surface | What Changes |
|---|---|
| `/settings/integrations` | Transforms from placeholder to AI Agent config panel (on/off toggle, prompt preview, phone number, test call) |
| `/leads` list | AI-collected leads appear with `source: 'ai_agent'` badge. No new page needed. |
| `/leads/[id]` detail | AI agent conversations show in call logs + activity timeline, tagged as AI-handled |

No new top-level pages. Configuration in settings, results in CRM.

---

## Reference Implementation

There is a complete Telnyx AI voice agent implementation in a separate repo that Claude Code should clone and reference during development.

### How to access:
```bash
gh repo clone Lukasbrujula/growthlywhatsapp
# or
git clone https://github.com/Lukasbrujula/growthlywhatsapp.git
```

### Key files to read (in priority order):

| File | What It Contains | How To Use It |
|---|---|---|
| `TELNYX_WORKING_CONFIG.md` | **READ FIRST.** Battle-tested config that works. Critical gotchas (model selection, hangup tool bug, required fields). Exact working payload for creating assistants. | Follow this config exactly. Don't deviate on model, required fields, or defaults. |
| `src/voice/services/telnyx.service.ts` | Complete Telnyx AI API wrapper (1932 lines). All interfaces, create/update/delete assistant, phone number management, conversations, transcripts. | Adapt the TypeScript interfaces and API call patterns for Next.js (it's written for NestJS). The `TelnyxAssistantCreateDto`, `TelnyxTool`, `TelnyxVoiceSettings` interfaces are directly reusable. |
| `VOICE_AI_PROMPT_ENGINEERING_REFERENCE.md` | Production-tested prompt patterns for voice AI. 60% shorter rule, explicit paths, goal-based prompting. | Use these principles when writing the insurance intake system prompt. |
| `src/voice/services/voice-agent.service.ts` | Agent lifecycle: create, update, deploy, assign phone number. | Reference for the creation flow. |
| `src/voice/services/agent-webhook.service.ts` | Webhook handling for post-call data extraction. | Reference for how to get conversation data back into our system. |

### Critical gotchas from the reference (MUST follow):
1. **Model:** Use `Qwen/Qwen3-235B-A22B` — Llama outputs JSON that TTS reads literally
2. **No hangup tool:** Adding `{ type: 'hangup' }` breaks WebRTC agents
3. **Required for phone calling:** `enabled_features: ['telephony']` + `telephony_settings.supports_unauthenticated_web_calls: true`
4. **Don't override defaults:** Let Telnyx auto-fill voice_speed, noise_suppression, time_limit_secs
5. **Updates use POST not PATCH:** `POST /assistants/{id}` with `promote_to_main: true`
6. **Tools array is full overwrite:** When updating, send ALL tools or they get removed

---

## Execution Order

### Tier 1 — Backend Foundation
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T7.1** | Telnyx AI service — API wrapper for assistants | 1.5 hrs | None |
| **T7.2** | Insurance intake prompt + assistant configuration | 1 hr | T7.1 |

### Tier 2 — Integration
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T7.3** | Inbound call webhook — receive AI conversation data | 1 hr | T7.1 |
| **T7.4** | Lead creation from AI calls — auto-create CRM leads | 45 min | T7.3 |

### Tier 3 — UI
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T7.5** | Settings > Integrations — AI agent config panel | 1 hr | T7.2 |
| **T7.6** | CRM integration — AI-collected lead badges + call log display | 45 min | T7.4 |

---

## Dependency Graph

```
T7.1 (API wrapper) → T7.2 (prompt + config)
                    → T7.3 (webhook) → T7.4 (lead creation) → T7.6 (CRM badges)
                    → T7.5 (settings UI)
```

---

## Claude Code Usage

```
Before executing any Phase 7 task:
1. Clone the reference repo: gh repo clone Lukasbrujula/growthlywhatsapp
2. Read these files from the reference repo:
   - TELNYX_WORKING_CONFIG.md (critical gotchas — read first)
   - src/voice/services/telnyx.service.ts (API wrapper reference)
   - VOICE_AI_PROMPT_ENGINEERING_REFERENCE.md (prompt patterns)
3. Read CODEBASE_AUDIT.md and CLAUDE.md from the Ensurance project
4. Read the specific task file
5. Cross-reference all assumptions against the actual codebase
6. Plan changes before writing code

The reference repo is NestJS — adapt patterns for Next.js App Router.
The Telnyx API interfaces can be copied almost directly.
The API call patterns need to be rewritten as simple fetch() calls in Next.js API routes.
```

---

## Post-Completion

After all 6 tasks are done:
1. Run full type check: `npx tsc --noEmit`
2. Run linter: `bun run lint`
3. Manual test: Enable AI agent in settings → call the Telnyx number → let AI answer → verify lead created in CRM with AI badge
4. Update CODEBASE_AUDIT.md with Phase 7 deliverables
5. Commit as "Phase 7: Telnyx AI agent (inbound)"
