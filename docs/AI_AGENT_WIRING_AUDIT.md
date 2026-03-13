# AI Voice Agent Configuration — Wiring Audit

**Initial audit:** 2026-03-13
**Last updated:** 2026-03-13 (P0 compliance fix applied)
**Scope:** Agent creation wizard (`/agents`) — 7 settings traced from UI to AI behavior

---

## Status Summary

| # | Setting | Status | Summary | Fixed In |
|---|---------|--------|---------|----------|
| 1 | [Phone Number Dropdown](#1-phone-number-dropdown) | :x: NOT WIRED | Free text input; DB has purchased numbers but wizard doesn't query them | — |
| 2 | [Tone/Personality → Prompt](#2-tonepersonality--prompt-mapping) | :white_check_mark: WIRED | Tone presets map to distinct personality strings injected into system prompt | — |
| 3 | [After-Hours Mode](#3-after-hours-mode) | :warning: PARTIAL | Greeting/hours stored and in prompt, but no runtime time-of-day check | — |
| 4 | [Voice Selection](#4-voice-selection--gender-balance) | :warning: PARTIAL | Voice passed to Telnyx on create/update; gender skew 3F/1M; no preview | — |
| 5 | [Extraction Fields → Prompt](#5-extraction-fields--system-prompt) | :white_check_mark: WIRED | Selected fields change both the AI prompt and the post-call extraction schema | — |
| 6 | [Google Calendar + Biz Hours](#6-google-calendar--business-hours) | :warning: PARTIAL | OAuth works, hours in prompt, but `book_calendar` post-call action is a no-op | — |
| 7 | [AI Disclosure](#7-ai-disclosure-verification) | :white_check_mark: WIRED | AI identification + recording notice in greeting field and system prompt | AI-AGENTS-02a |

**Legend:** Update the "Fixed In" column with the commit SHA or PR link when a fix lands. Change status to :white_check_mark: once verified.

---

## Fix Priority

| Priority | Item | Fix Description | Complexity | Status |
|----------|------|-----------------|------------|--------|
| **P0** | 7 | Add "I'm a digital assistant" to Telnyx `greeting` field | Small | DONE |
| **P1** | 6 | Implement `book_calendar` handler in `call-complete` webhook | Medium | TODO |
| **P1** | 1 | Replace text input with Select querying `agent_phone_numbers` | Small | TODO |
| **P2** | 4 | Add male voices, verify Telnyx voice list via API | Small | TODO |
| **P2** | 2 | Use `compileEnsurancePrompt` consistently in creation path | Small | TODO |
| **P3** | 3 | Implement time-of-day check for after-hours behavior | Medium | TODO |
| **P3** | 4 | Pre-record voice samples, add audio playback to wizard | Small | TODO |

---

## Detailed Findings

### 1. Phone Number Dropdown

**Status:** :x: NOT WIRED
**Files:** `components/agents/wizard-steps/business-step.tsx`, `lib/supabase/phone-numbers.ts`

**Current behavior:** The wizard renders a plain `<Input>` for the phone number (`business-step.tsx:108-119`). The value is stored as a text string in `ai_agents.phone_number`.

**What exists but isn't used:**
- `agent_phone_numbers` table with columns: `id`, `agent_id`, `phone_number`, `telnyx_phone_number_id`, `ai_agent_id`, `is_primary`, `label`, `sms_enabled`, `voice_enabled`
- `listPhoneNumbers(agentId)` function in `lib/supabase/phone-numbers.ts`
- `GET /api/phone-numbers` route already exists
- Phone number management UI at `/settings`

**To fix:**
1. Replace `<Input>` in `business-step.tsx` with a `<Select>` that fetches from `GET /api/phone-numbers`
2. Filter to numbers where `ai_agent_id IS NULL` (unassigned)
3. On agent creation, update the phone number row to set `ai_agent_id`
4. Show empty state with link to Settings if no numbers purchased

---

### 2. Tone/Personality → Prompt Mapping

**Status:** :white_check_mark: WIRED
**Files:** `lib/telnyx/tone-presets.ts`, `lib/voice/ensurance-prompt-compiler.ts`, `lib/telnyx/prompt-compiler.ts`

**How it works:**

1. **UI:** Four tone cards from `TONE_PRESETS` array in `tone-presets.ts`. Each has a distinct `personality` string.
2. **Storage:** `tone_preset` stored in `ai_agents.tone_preset` column.
3. **Prompt injection:** `compileEnsurancePrompt()` reads `tonePreset` and injects the corresponding personality text into the IDENTITY section (`ensurance-prompt-compiler.ts:183-185`).

**Tone preset personalities:**

| ID | Personality injected into prompt |
|----|--------------------------------|
| `warm` | "warm and empathetic... conversational, like a trusted neighbor... 'I completely understand'" |
| `professional` | "polished and professional... 'sir' or 'ma'am'... thorough and reassuring" |
| `direct` | "efficient and get straight to the point... brief and action-oriented... minimal small talk" |
| `casual` | (only in `tone-presets.ts`, not in `ensurance-prompt-compiler.ts` TONE_PRESETS map) |

**Known gap:** The `POST /api/agents` creation route uses `buildInboundAgentPrompt()` which does NOT consume `tonePreset`. The tone only takes effect after the first update (PUT route uses `compileEnsurancePrompt()`). The `casual` preset is defined in `tone-presets.ts` but the `ensurance-prompt-compiler.ts` TONE_PRESETS map only has `warm`, `professional`, `direct` — casual falls back to `professional`.

**Example previews:** The wizard shows `exampleGreeting` and `exampleResponse` from the selected preset, so UI preview is dynamic and correct.

---

### 3. After-Hours Mode

**Status:** :warning: PARTIAL
**Files:** `components/agents/wizard-steps/business-step.tsx`, `lib/voice/ensurance-prompt-compiler.ts`

**What IS wired:**

1. Toggle swaps greeting to after-hours variant: *"We're currently closed, but I can take your information..."*
2. Auto-expands business hours section in Step 3 with Mon-Fri 9-5 defaults
3. `business_hours` and `after_hours_greeting` persisted in `ai_agents` table
4. `compileEnsurancePrompt()` → `buildBusinessHours()` injects schedule and after-hours greeting into prompt

**What is NOT wired:**

- **No runtime time check.** The AI is told "If the current time is outside business hours, use this greeting instead" but LLMs don't reliably know the current time.
- The `afterHoursMode` boolean is **not persisted** — only exists in wizard state. No `after_hours_mode` DB column.
- The Telnyx `greeting` field is static (set once), so the AI can't dynamically switch greetings.

**To fix (options):**
- **Option A (simplest):** Add `{{current_time}}` variable to the prompt, resolved at call time. Check if Telnyx supports dynamic variables.
- **Option B:** Cron job or pre-call hook that swaps the Telnyx greeting via API based on schedule.
- **Option C:** Accept current behavior — hours are informational for the AI, not a hard routing rule.

---

### 4. Voice Selection + Gender Balance

**Status:** :warning: PARTIAL
**Files:** `components/agents/wizard-steps/personality-step.tsx`, `lib/telnyx/ai-config.ts`, `app/api/agents/[id]/route.ts`

**Voice options in UI:**

| Telnyx Voice ID | Label | Description | Likely Gender |
|-----------------|-------|-------------|---------------|
| `Telnyx.NaturalHD.astra` | Astra | Warm, conversational | Female |
| `Telnyx.NaturalHD.celeste` | Celeste | Clear, articulate | Female |
| `Telnyx.NaturalHD.orion` | Orion | Calm, authoritative | Male |
| `Telnyx.NaturalHD.nova` | Nova | Bright, energetic | Female |

**Gender distribution:** ~3 female / 1 male. NOT 50/50.

**Voice passed to Telnyx:**

- On creation (`POST /api/agents:198`): `if (voice) { config.voice_settings = { voice } }` — Yes
- On update (`PUT /api/agents/[id]:395`): `if (voice) config.voice_settings = { voice }` — Yes
- Default fallback: `Telnyx.NaturalHD.astra`

**Voice preview:** No Telnyx API endpoint for voice samples. WebRTC test calls (`supports_unauthenticated_web_calls: true`) are the only way to hear a voice. Workaround: pre-record short clips from test calls.

**To fix:**
1. Check Telnyx voice list via API for additional male voices
2. Add 1-2 male options to achieve closer to 50/50
3. Optionally pre-record and host audio samples for in-wizard preview

---

### 5. Extraction Fields → System Prompt

**Status:** :white_check_mark: WIRED
**Files:** `lib/voice/ensurance-prompt-compiler.ts`, `lib/voice/openai-extraction.ts`, `app/api/agents/call-complete/route.ts`

**Full trace verified:**

1. **UI → Storage:** Checkboxes in `CollectionStep` → `collect_fields` array → `ai_agents.collect_fields` (jsonb)
2. **Fields → AI prompt:** `compileEnsurancePrompt()` → `buildDataCollection()` dynamically injects selected fields with voice-optimized prompts (e.g., email: "Their email address. Spell it back to confirm.")
3. **Fields → Post-call extraction:** `call-complete/route.ts:158-161` reads `agent.collect_fields` and passes to `extractFromTranscript()`, which builds a GPT-4o-mini extraction prompt from those fields.
4. **Custom fields supported:** `custom_collect_fields` also flow through both prompt and extraction.

**Minor gap:** The Telnyx `save_caller_info` webhook tool schema (`ai-config.ts:101-146`) has **hardcoded** parameters (always: caller_name, callback_number, reason, callback_time, age_range, state, urgency, notes). It does not dynamically match configured fields. However, this is a secondary data source — the primary extraction via OpenAI IS fully dynamic.

---

### 6. Google Calendar + Business Hours

**Status:** :warning: PARTIAL
**Files:** `components/agents/wizard-steps/collection-step.tsx`, `app/api/agents/call-complete/route.ts`, `app/api/auth/google/`

**Google Calendar OAuth — WORKS:**
- `CollectionStep` fetches `GET /api/auth/google/status` for connection status
- Shows Connected/Not Connected badges
- OAuth flow saves wizard state to sessionStorage, redirects, restores on return
- Tokens stored in `google_integrations` table

**Calendar booking post-call — NOT WIRED:**

The `call-complete` webhook checks `post_call_actions` and handles:
- `"save_lead"` → `upsertLeadFromExtraction()` (:white_check_mark:)
- `"send_notification"` → `insertActivityLog()` (:white_check_mark:)
- `"book_calendar"` → **No handler exists** (:x:)

Zero references to Google Calendar in the entire `app/api/agents/` directory.

**Business hours — Informational only:** Stored in DB, injected into AI prompt. The AI will share hours if asked. No runtime time-based routing.

**To fix `book_calendar`:**
1. In `call-complete/route.ts`, after the `send_notification` block, add a `book_calendar` handler
2. Read Google OAuth tokens from `google_integrations` for the agent_id
3. Use existing `lib/google/calendar.ts` service to create a calendar event
4. Event details: caller name, reason, extracted `callback_time`, phone number
5. Handle: no calendar connected, expired OAuth token, no callback_time in extraction
6. Fire-and-forget pattern (like other post-call actions)

---

### 7. AI Disclosure Verification

**Status:** :white_check_mark: WIRED (with minor gap)
**Files:** `lib/telnyx/ai-config.ts`, `lib/voice/ensurance-prompt-compiler.ts`, `lib/agents/prompt-builder.ts`

**Two prompt systems, both include disclosure:**

**System A — `buildInboundAgentPrompt()` (creation path):**
> "Within the first 30 seconds of the call, naturally disclose that you are an AI assistant helping with calls for ${agency}."

**System B — `compileEnsurancePrompt()` (update path):**
> "At the start of every call, you must disclose that you are a digital assistant. Do not claim to be a human."
> "After introducing yourself, inform the caller that the call may be recorded for quality purposes."

Both include: AI identification :white_check_mark:, recording notice :white_check_mark:, honesty if asked :white_check_mark:

**Telnyx `greeting` field (guaranteed first utterance):**

English (`ai-config.ts:34`):
```
"Hi, you've reached {agent}'s office. They're not available right now, but I can take
some information so they can call you back. Just so you know, this call may be recorded
and transcribed for quality purposes. How can I help?"
```

Spanish (`ai-config.ts:182`):
```
"Hola, se ha comunicado con la oficina de {agent}. No está disponible en este momento,
pero puedo tomar su información... esta llamada puede ser grabada y transcrita con
fines de calidad."
```

**FIXED (AI-AGENTS-02a):** AI identification ("I'm a digital assistant helping with calls today") added to ALL Telnyx greeting fields:
- English main greeting (`ai-config.ts:34`)
- Spanish main greeting (`ai-config.ts:182`)
- English template greeting (`agent-templates.ts:50`)
- English after-hours template greeting (`agent-templates.ts:61`)

All caller-facing greetings now explicitly identify the voice as a digital assistant before any LLM generation occurs.

---

## Telnyx AI Platform Notes

| Topic | Finding |
|-------|---------|
| **Voice IDs** | Format: `Telnyx.NaturalHD.<name>`. Known voices: astra, celeste, orion, nova, vespera (Spanish). |
| **Voice samples** | No Telnyx API for voice previews. WebRTC test calls are the only way to hear a voice. |
| **Model** | Must be `Qwen/Qwen3-235B-A22B`. Llama outputs JSON as speech — unusable for voice. |
| **Transcription** | Must be `deepgram/flux`. nova-2 breaks WebRTC when hangup tool is enabled. |
| **Greeting field** | Spoken immediately by Telnyx before LLM generation. Best place for compliance disclosures. |
| **Tools** | `hangup` and `handoff` are mutually exclusive (untested together per code comment). |
| **Webhook tool** | `save_caller_info` schema is hardcoded in `ai-config.ts`. Does not dynamically match configured collect fields. |

---

## Architecture Notes

### Two Prompt Compilers

The codebase has **three** prompt builders, used in different paths:

| Builder | File | Used By | Consumes Tone? | Consumes Fields? |
|---------|------|---------|----------------|-----------------|
| `buildInboundAgentPrompt()` | `lib/agents/prompt-builder.ts` | `POST /api/agents` (creation) | No | Hardcoded |
| `compileAgentPrompt()` | `lib/telnyx/prompt-compiler.ts` | Wizard preview (step 3→4) | Yes (via `getTonePresetById`) | Yes |
| `compileEnsurancePrompt()` | `lib/voice/ensurance-prompt-compiler.ts` | `PUT /api/agents/[id]` (update) | Yes (built-in map) | Yes |

**Recommendation:** Consolidate to `compileEnsurancePrompt()` for all paths. It's the most complete — handles tone, fields, custom fields, FAQ, knowledge base, business hours, after-hours, Spanish, and call forwarding.

---

## Changelog

| Date | Change | Commit |
|------|--------|--------|
| 2026-03-13 | Initial audit — 7 items investigated | — |
| 2026-03-13 | P0 fix: AI identification added to all greeting fields (EN/ES/after-hours) | AI-AGENTS-02a |
