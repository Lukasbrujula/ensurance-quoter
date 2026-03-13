# Telnyx AI Agents — Architecture Reference

> Last updated: 2026-03-13 (after AI-AGENTS-02 fixes)

---

## Voice Configuration

### Available Voices

All voices use the `Telnyx.NaturalHD` prefix. Defined in `components/agents/wizard-steps/personality-step.tsx`.

| Voice ID | Display Name | Gender | Description |
|----------|-------------|--------|-------------|
| `Telnyx.NaturalHD.astra` | Astra | Female | Warm, friendly tone |
| `Telnyx.NaturalHD.celeste` | Celeste | Female | Clear, bright tone |
| `Telnyx.NaturalHD.andersen_johan` | Johan | Male | Deep, reassuring tone |
| `Telnyx.NaturalHD.orion` | Orion | Male | Calm, steady tone |

**Default voice**: `Telnyx.NaturalHD.astra` (set in `lib/supabase/ai-agents.ts`)

**Spanish-only voice**: `Telnyx.NaturalHD.vespera` (female) — locked to the Spanish specialist agent in `lib/voice/spanish-agent.service.ts`.

**Voice previews**: No Telnyx API endpoint exists for voice previews. Workaround is pre-recorded sample audio files.

---

## Prompt Architecture

### Two Prompt Builders

The system has two prompt builders. Both are used during agent creation; only the newer one is used during updates.

#### `compileEnsurancePrompt()` — Primary Builder

- **File**: `lib/voice/ensurance-prompt-compiler.ts`
- **Called by**: `POST /api/agents` and `PUT /api/agents/[id]`
- **Purpose**: Full-featured prompt with tone presets, collect fields, business hours, FAQ, compliance sections
- **Output**: Modular plain-text sections (IDENTITY, DATA COLLECTION, COMPLIANCE, BUSINESS HOURS, etc.)

#### `buildInboundAgentPrompt()` — Legacy Builder

- **File**: `lib/agents/prompt-builder.ts`
- **Called by**: `buildInsuranceAssistantConfig()` in `lib/telnyx/ai-config.ts`
- **Purpose**: Minimal prompt with language packs (EN/ES), used for Telnyx assistant config creation
- **Output**: Plain-text system prompt safe for TTS (no markdown)

### Tone Preset → Prompt Mapping

Defined in `lib/telnyx/tone-presets.ts`. Each preset maps to a personality string injected into the IDENTITY section.

| Preset | Personality | Icon |
|--------|------------|------|
| `warm` | "You are a warm, friendly receptionist who puts callers at ease..." | Heart |
| `professional` | "You are a polished, professional receptionist..." | Briefcase |
| `direct` | "You are a direct, efficient assistant..." | Zap |
| `casual` | "You are a relaxed, down-to-earth assistant..." | Coffee |

Each preset also includes `exampleGreeting` and `exampleResponse` shown in the wizard preview.

---

## Extraction Pipeline

### Configurable Collection Fields

Defined as `CollectFieldId` in `lib/types/database.ts`. Agents toggle these in the wizard's collection step.

| Field ID | Voice Prompt | Always Required |
|----------|-------------|----------------|
| `name` | "The caller's full name." | Yes |
| `phone` | "The best callback phone number. Always ask even if you have caller ID." | Yes |
| `reason` | "Why they are calling, in a brief summary." | Yes |
| `callback_time` | "When they prefer to be called back, such as morning, afternoon, or a specific time." | No |
| `email` | "Their email address. Spell it back to confirm." | No |
| `date_of_birth` | "Their date of birth or approximate age." | No |
| `state` | "Which state they live in." | No |

**Custom fields**: Agents can define additional fields via `custom_collect_fields` column (JSON array of `{ name, description, required? }`). Settable via API but not yet exposed in the wizard UI.

### Field Flow: UI → DB → Prompt → Extraction

```
Wizard (collection-step.tsx)
  → toggle CollectFieldId values
    → stored as JSON array in ai_agents.collect_fields
      → compileEnsurancePrompt() reads fields, injects voice-optimized prompts
        → Telnyx AI asks caller for each field during call
          → Post-call: extractFromTranscript() (GPT-4o-mini) extracts structured data
            → Extracted data saved to call record + lead created/updated
```

### Telnyx Webhook Tool Schema

The `save_caller_info` webhook tool is defined in `buildInsuranceAssistantConfig()` (`lib/telnyx/ai-config.ts`). Its schema is **hardcoded** — not generated from `collect_fields`:

```
caller_name (required), callback_number, reason (required),
callback_time, age_range, state, urgency, notes
```

This means the webhook tool schema and `collect_fields` are independent data sources. The primary extraction source is the post-call OpenAI extraction from the full transcript.

### Post-Call Extraction

Handled in `lib/voice/openai-extraction.ts`:

- **Model**: `gpt-4o-mini` (temperature 0, max 1000 tokens)
- **Input**: Full call transcript
- **Output**: Structured JSON with extracted fields
- **Trigger**: `call-complete` webhook fires → `extractFromTranscript()` → data stored in `call_logs.extracted_data`

### Post-Call Actions

Configured per-agent as `post_call_actions` (default: all three):

| Action | Behavior |
|--------|----------|
| `save_lead` | Upsert CRM lead from extracted data |
| `book_calendar` | Create Google Calendar event (see Calendar section) |
| `send_notification` | Send notification to agent |

---

## After-Hours Mode

### Database Columns

- `business_hours` (`BusinessHours | null`): Weekly schedule with IANA timezone
- `after_hours_greeting` (`string | null`): Alternative greeting for outside hours

### BusinessHours Schema

```typescript
{
  timezone: string           // e.g., "America/New_York"
  schedule: {
    monday: { open: "HH:MM", close: "HH:MM" } | null
    tuesday: ...             // null = closed that day
    // ... through sunday
  }
}
```

### How It Works

1. `compileEnsurancePrompt()` injects a `BUSINESS HOURS` section listing each day's hours + timezone
2. If `after_hours_greeting` is set, the prompt instructs: "If current time is outside business hours, use this greeting instead..."
3. The LLM checks current time against the schedule at runtime (no server-side gate)
4. Template default after-hours greeting: *"Hi, you've reached {agent}'s office. I'm a digital assistant helping with calls today. We're currently closed, but I can take your information so {agent} can call you back during business hours..."*

### Limitations

- No DST handling — schedule is static
- No holiday overrides — single weekly schedule only
- Runtime check is LLM-dependent (no server-side enforcement)

---

## Google Calendar Integration

### OAuth Flow

1. Agent clicks "Connect Calendar" in wizard or settings
2. Backend generates auth URL via `generateAuthUrl()` in `lib/google/oauth.ts`
   - HMAC-signed state parameter (userId + returnTo)
   - Scope: `https://www.googleapis.com/auth/calendar.events`
3. Google redirects to `/api/auth/google/callback` with auth code
4. `exchangeCodeForTokens()` exchanges code → stores tokens in `google_integrations` table
5. Tokens auto-refresh via Google client event listener in `getCalendarClient()`

### Token Storage

Table: `google_integrations`
Columns: `agent_id`, `access_token`, `refresh_token`, `expiry_date`, `calendar_id`

### Calendar Booking Trigger

In `app/api/agents/call-complete/route.ts`, after extraction:

1. Check if `book_calendar` is in `post_call_actions`
2. Look up Google tokens for the agent
3. Parse `callback_time` from extracted data

**If valid future datetime**: Create 15-minute timed event
- Title: `"Callback: {callerName}"`
- Reminders: 15 min + 5 min popups

**If unparseable or missing**: Create all-day event on next business day (skip Sat/Sun)
- Title: `"Callback needed: {callerName}"`

Both include: caller name, phone, reason, source ("AI Agent call"), and `ensurance_lead_id` in extended properties.

### Edge Cases

- **No tokens / not connected**: Silently skipped (fire-and-forget, never blocks the 200 response)
- **Expired tokens**: Auto-refreshed by Google client; if refresh fails, event creation silently fails
- **No callback_time**: Falls back to all-day event on next business day
- **Freeform time strings**: Only ISO 8601 parses correctly; "next Tuesday" becomes an all-day fallback

---

## Compliance

### AI Identification

AI disclosure is **guaranteed** because it lives in the Telnyx `greeting` field — spoken before any LLM generation occurs.

**English greeting** (`lib/telnyx/ai-config.ts`):
> "Hi, you've reached {agentName}'s office. I'm a digital assistant helping with calls today. They're not available right now, but I can take some information so they can call you back. Just so you know, this call may be recorded and transcribed for quality purposes. How can I help?"

**Spanish greeting** (`lib/telnyx/ai-config.ts`):
> "Hola, se ha comunicado con la oficina de {agentName}. Soy un asistente digital que ayuda con las llamadas hoy. No está disponible en este momento, pero puedo tomar su información para que le devuelva la llamada. Solo para que sepa, esta llamada puede ser grabada y transcrita con fines de calidad. ¿En qué le puedo ayudar?"

### Backup Disclosure in System Prompt

The system prompt (`ensurance-prompt-compiler.ts`) contains a LOCKED `AI_DISCLOSURE` section requiring the agent to disclose its AI nature within 30 seconds and be honest if asked directly. This is a backup in case greeting is customized.

### Recording Notice

Built into the greeting (above). Additionally, the system prompt contains a LOCKED `RECORDING_NOTICE` section instructing the agent to inform callers and handle objections gracefully.

### Insurance Compliance

A LOCKED section in `ensurance-prompt-compiler.ts` prohibits the AI from:
- Providing quotes, pricing, or premium calculations
- Recommending carriers, products, or policy types
- Interpreting policy language or advising on coverage
- Discussing medical conditions in clinical detail
- Promising coverage, eligibility, or approval
- Using insurance jargon the caller didn't introduce

---

## Spanish Language Support

### Two-Assistant Architecture

- **Primary English agent**: Handles all inbound calls, has a handoff tool to transfer Spanish-speaking callers
- **Spanish specialist**: Companion agent with Spanish voice (Vespera), receives transferred calls

### Lifecycle

Managed by `lib/voice/spanish-agent.service.ts`:

- **Create**: `createSpanishAgent(config)` → creates Telnyx assistant, returns handoff tool config
- **Update**: `updateSpanishAgent(id, config)` → syncs name, greeting, KB, hours with primary
- **Delete**: `deleteSpanishAgent(id)` → removes Telnyx assistant when Spanish toggled off or parent deleted

### Handoff Tool

Automatically added to primary agent's tools when `spanish_enabled: true`:
```json
{
  "type": "handoff",
  "description": "Transfer the caller to a Spanish-speaking specialist when they prefer Spanish",
  "ai_assistants": [{ "name": "Spanish Agent", "id": "<spanishAssistantId>" }]
}
```

### Limitations

- Spanish specialist has no webhook tool — only the primary agent collects data
- Cannot be a standalone primary agent; requires handoff from English agent
- Configuration mirrors primary agent (no independent customization beyond voice/greeting)

---

## Known Limitations

| Constraint | Detail |
|-----------|--------|
| **LLM model** | Must be `Qwen/Qwen3-235B-A22B` — Llama models output raw JSON as speech (unusable for TTS) |
| **Transcription** | Must be `deepgram/flux` — `nova-2` breaks WebRTC when hangup tool is enabled |
| **Hangup + handoff** | Mutually exclusive — if Spanish enabled, uses handoff (no hangup); if no Spanish, uses hangup (no handoff) |
| **AI inference costs** | Not trackable per-billing-group — Telnyx bills inference separately from telephony |
| **Webhook tool schema** | Hardcoded in `ai-config.ts`, not generated from `collect_fields` |
| **Custom collect fields** | API-only — no wizard UI yet |
| **Calendar time parsing** | Only ISO 8601; freeform strings ("next Tuesday") fall back to all-day events |
| **Business hours** | No DST handling, no holiday overrides, LLM-enforced (not server-side) |
| **Voice previews** | No Telnyx API for previews — requires pre-recorded samples |

---

## Key File Reference

| Area | File |
|------|------|
| Prompt compiler | `lib/voice/ensurance-prompt-compiler.ts` |
| Legacy prompt builder | `lib/agents/prompt-builder.ts` |
| Telnyx assistant config | `lib/telnyx/ai-config.ts` |
| Tone presets | `lib/telnyx/tone-presets.ts` |
| Agent templates | `lib/telnyx/agent-templates.ts` |
| Spanish agent service | `lib/voice/spanish-agent.service.ts` |
| Post-call extraction | `lib/voice/openai-extraction.ts` |
| Call-complete webhook | `app/api/agents/call-complete/route.ts` |
| Agent CRUD API | `app/api/agents/route.ts`, `app/api/agents/[id]/route.ts` |
| Agent DB layer | `lib/supabase/ai-agents.ts` |
| Google OAuth | `lib/google/oauth.ts` |
| Calendar service | `lib/google/calendar-service.ts` |
| Wizard steps | `components/agents/wizard-steps/` |
| Type definitions | `lib/types/database.ts` (CollectFieldId, PostCallActionId, BusinessHours) |
