# Phase 10: Dashboard + Usage + Notifications + UX Polish

**Created:** 2026-02-23
**Total Tasks:** 10
**Estimated Total:** ~10 hrs
**Branch:** `feature/lukas`
**Depends on:** Phase 9 complete (security hardening)

---

## What We're Building

Four workstreams in one phase:

1. **Dashboard** (`/dashboard`) — The agent's home base. Call stats, close rate, upcoming calls calendar, commission summary. First thing they see after login.
2. **Usage page** (`/settings/usage`) — Claude-style billing/usage view. Phone numbers owned, minutes used, quotes generated, enrichment lookups. Platform-level metrics.
3. **Notifications inbox** — Bell icon in top nav next to profile. Shows AI agent leads, scheduled callbacks, system events. Slide-out panel.
4. **UX Polish** — Date picker fix (year jump + manual input), AI assistant panel rethink (insights not transcription), back navigation on all pages, commission table scaling.

---

## Execution Order

### Tier 1 — Quick Wins (independent, no dependencies)
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T10.1** | Date picker: year jump + manual input for DOB | 30 min | None |
| **T10.2** | Back navigation arrows on all pages | 30 min | None |
| **T10.3** | Commission table: support unlimited carriers | 45 min | None |

### Tier 2 — New Pages
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T10.4** | Dashboard page with stats cards + calendar | 2 hrs | None |
| **T10.5** | Usage page in settings (Claude-style) | 1.5 hrs | None |
| **T10.6** | Notifications inbox (bell icon + slide-out panel) | 1.5 hrs | None |

### Tier 3 — AI Agent Config Expansion
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T10.7** | Agent templates (pre-built personas) | 1 hr | None |
| **T10.8** | Agent FAQ knowledge base + business hours | 1 hr | T10.7 |

### Tier 4 — AI Assistant Panel Rethink
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T10.9** | Move transcription to background, surface insights only | 1.5 hrs | None |

---

## Dependency Graph

```
Tier 1 (all independent, do first):
T10.1 (date picker) | T10.2 (back nav) | T10.3 (commissions)

Tier 2 (parallel, no dependencies on each other):
T10.4 (dashboard) | T10.5 (usage) | T10.6 (notifications)

Tier 3 (sequential):
T10.7 (agent templates) -> T10.8 (FAQ + hours)

Tier 4:
T10.9 (assistant panel rethink)
```

---

## Navigation Changes

Current top nav: `Leads | Quotes | Agents | Settings | [Profile]`

After Phase 10: `[Dashboard icon] | Leads | Quotes | Agents | Settings | [Bell icon] [Profile]`

- Dashboard icon: far left (home/grid icon), links to `/dashboard`
- Bell icon: right side, next to profile button, opens notifications panel
- All pages get a back arrow in their header pointing to `/quote` (the quoter is the primary workspace)

---

## Claude Code Setup

```
Read these files first:
1. CODEBASE_AUDIT.md
2. CLAUDE.md
3. PHASE10_TASKS/PHASE10_TASK_INDEX.md

Execute Tier 1 first (quick wins), then Tier 2, then Tier 3, then Tier 4.
Within each tier, tasks can be done in any order.

After each task: npx tsc --noEmit

Rules:
- Do NOT modify components/ui/ or styles/globals.css
- Do NOT install new dependencies without asking
- Follow existing patterns for pages, API routes, components
- Codebase is source of truth
- Match existing design language (shadcn/ui, Tailwind, OKLCH colors)

Start with T10.1.
```
