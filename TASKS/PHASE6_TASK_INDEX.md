# Phase 6: Lead Data Expansion + CRM Enhancements — Task Index

**Created:** 2026-02-23  
**Total Tasks:** 8  
**Estimated Total:** ~8 hrs  
**Branch:** `feature/lukas`  
**Depends on:** Phase 5 complete

---

## Execution Order

Strict sequential order — each task builds on the previous. No parallelization within tiers due to schema dependencies.

### Tier 1 — Foundation (schema + types)
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T6.1** | Leads table migration — add new columns | 30 min | None |
| **T6.2** | TypeScript types + Zod schemas update | 30 min | T6.1 |

### Tier 2 — Lead Data UI
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T6.3** | Lead detail form expansion — new fields | 1.5 hrs | T6.2 |
| **T6.4** | CSV upload mapper — recognize new columns | 1 hr | T6.2 |
| **T6.5** | PDL enrichment → auto-populate new fields | 1 hr | T6.3 |

### Tier 3 — CRM Workflow
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T6.6** | Lead status field + workflow | 1 hr | T6.2 |
| **T6.7** | Follow-up scheduling | 1 hr | T6.6 |
| **T6.8** | Activity timeline on lead detail | 1.5 hrs | T6.6 |

---

## Dependency Graph

```
T6.1 (migration) → T6.2 (types) → T6.3 (form) → T6.5 (PDL wiring)
                                  → T6.4 (CSV mapper)
                                  → T6.6 (status) → T6.7 (follow-ups)
                                                   → T6.8 (activity timeline)
```

---

## Claude Code Usage

For each task:

```
Read the task file at PHASE6_TASKS/T6.[X]_[NAME].md

Before executing:
1. Read CODEBASE_AUDIT.md and CLAUDE.md for project context
2. Read GLOBAL_RULES.md for design system rules
3. Verify all file paths in Dependencies — use `find` or `ls` to confirm
4. Read each dependency file to understand current implementation
5. The codebase is the source of truth — if task file paths don't match, use real paths
6. Plan your changes before writing any code

Execute the task following all Success Criteria.
Run `npx tsc --noEmit` after changes.
Do NOT modify files listed in Guardrails.
```

---

## Post-Completion

After all 8 tasks are done:
1. Run full type check: `npx tsc --noEmit`
2. Run linter: `bun run lint`
3. Manual walkthrough: create lead → edit all new fields → CSV upload with new columns → enrich via PDL → change status → schedule follow-up → verify activity timeline
4. Update CODEBASE_AUDIT.md with Phase 6 deliverables
5. Commit as "Phase 6: Lead data expansion + CRM enhancements"
