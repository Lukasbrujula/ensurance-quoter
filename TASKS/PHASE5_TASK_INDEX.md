# Phase 5: UI Polish — Task Index

**Created:** 2026-02-22  
**Total Tasks:** 8  
**Estimated Total:** ~5.5 hrs  
**Branch:** `feature/lukas`

---

## Execution Order

Execute in this order for maximum demo impact. Tasks within the same tier can be parallelized if using multiple Claude Code sessions.

### Tier 1 — Immediate (demo-critical)
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T1** | Navigation & routing fixes | 30 min | None |
| **T3** | Carrier results bug fixes (dupes, labels, badges) | 20 min | None |

### Tier 2 — High Impact (usability)
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T2a** | Collapsed panel expand affordances | 45 min | None |
| **T4a** | Settings layout & sidebar navigation | 1.5 hrs | None |

### Tier 3 — Polish (completeness)
| Task | Description | Est. | Depends On |
|------|-------------|------|------------|
| **T2b** | Center panel minimize toggle | 1 hr | T2a |
| **T2c** | Carrier table responsive reflow | 45 min | None |
| **T4b** | Profile settings page | 1 hr | T4a |
| **T4c** | Placeholder settings pages | 30 min | T4a |

---

## Dependency Graph

```
T1  ──────────────────── (standalone)
T3  ──────────────────── (standalone)
T2a ──→ T2b              (panel collapse chain)
T2c ──────────────────── (standalone)
T4a ──→ T4b ──→ T4c      (settings chain)
```

---

## Claude Code Usage

For each task, give Claude Code this prompt pattern:

```
Read the task file at TASKS/T[X]_[NAME].md

Before executing:
1. Read CLAUDE.md and CODEBASE_AUDIT.md for project context
2. Identify all files mentioned in Dependencies
3. Read those files to understand current implementation
4. Plan your changes before making them

Execute the task following all Success Criteria.
Run `npx tsc --noEmit` after changes.
Do NOT modify files listed in Guardrails.
```

---

## Post-Completion

After all 8 tasks are done:
1. Run full type check: `npx tsc --noEmit`
2. Run linter: `bun run lint`
3. Manual walkthrough: login → quote → settings → leads → back
4. Update CODEBASE_AUDIT.md with Phase 5 deliverables
5. Commit as "Phase 5: UI polish — navigation, panels, settings, carrier fixes"
