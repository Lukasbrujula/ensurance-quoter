# Phase 8: Agent Management Page + Transcripts + Usage Dashboard

**Created:** 2026-02-23
**Total Tasks:** 5
**Estimated Total:** ~7 hrs
**Branch:** `feature/lukas`
**Depends on:** Phase 7 complete

---

## What We're Building

Three things:

1. **Dedicated `/agents` page** — Move AI agent management out of Settings into its own top-level page. Support creating multiple agents, each with their own persona, phone number, and call history. List view with agent cards, detail view with config + calls + transcripts.

2. **AI transcript storage** — Store full message-level transcripts (role + content + timestamp per message) for AI agent conversations. Separate from the Phase 2 `call_logs` table which stores flat transcript text from human WebRTC calls.

3. **Usage dashboard** — Show agents how many calls each AI agent handled, total minutes, and estimated cost. Accessible from the agents page or settings.

---

## Execution Order

### Tier 1 — Data Layer
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T8.1** | Database: `ai_agents` table + `ai_transcripts` table + migrate from single-agent pattern | 1 hr | None |

### Tier 2 — Backend
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T8.2** | API routes for multi-agent CRUD + transcript storage | 1.5 hrs | T8.1 |

### Tier 3 — UI
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T8.3** | `/agents` list page — agent cards, create flow, status indicators | 1.5 hrs | T8.2 |
| **T8.4** | `/agents/[id]` detail page — config, call history, transcript viewer | 1.5 hrs | T8.3 |
| **T8.5** | Usage dashboard — call counts, minutes, cost estimates | 1.5 hrs | T8.2 |

---

## Dependency Graph

```
T8.1 (tables) --> T8.2 (API routes) --> T8.3 (list page) --> T8.4 (detail page)
                                    --> T8.5 (usage dashboard)
```

---

## What Changes From Phase 7

Phase 7 built a single-agent system: one AI assistant per Ensurance agent, stored as `ai_agent_id` on `agent_settings`. Phase 8 refactors this to support multiple agents:

- `agent_settings.ai_agent_id` / `ai_agent_enabled` columns become secondary (or removed) once the `ai_agents` table holds the data
- The Settings > Integrations AI Agent panel gets simplified to a link: "Manage your AI agents" pointing to `/agents`
- The existing `ai_agent_calls` table gets a foreign key to `ai_agents` instead of (or in addition to) `agent_settings`
- The webhook endpoint needs to identify which specific AI agent handled the call

---

## Claude Code Setup

```
Read these files first (in order):
1. CODEBASE_AUDIT.md
2. CLAUDE.md
3. PHASE8_TASKS/PHASE8_TASK_INDEX.md

Before executing ANY task:
1. Read the task file completely
2. Verify every file path in Dependencies — use find or ls to confirm
3. Read each dependency file to understand current implementation
4. Cross-reference assumptions against actual codebase — file paths, types, stores, DB schema
5. If task file conflicts with code, follow the code
6. Plan changes before writing

After each task:
- Run npx tsc --noEmit — fix errors before moving on
- Verify each Success Criteria item

Rules:
- Do NOT modify components/ui/ (shadcn)
- Do NOT modify styles/globals.css
- Do NOT install new dependencies without asking
- Follow existing patterns for API routes, Supabase queries, Zustand stores
- Codebase is source of truth

Start with T8.1.
```
