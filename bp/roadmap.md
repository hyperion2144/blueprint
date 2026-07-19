# Roadmap: blueprint

<!--
  Living document. Tracks project direction and progress.
  NOT a state machine - it doesn't gate change execution.

  Purpose:
  1. Make direction explicit (prevent drift)
  2. Track progress (count of archived changes per phase)
  3. Show what's planned next

  Updated automatically by `bp archive` (marks changes [x], increments counts).
  Updated manually by `bp roadmap` (add milestones, phases, planned changes).

  Format rules:
  - Status tags: [NOT_STARTED], [ACTIVE], [IN_PROGRESS], [COMPLETED], [SHIPPED]
  - Milestone: M{id} (e.g., M1, M2)
  - Phase: P{milestone}.{id} (e.g., P1.1, P1.2)
  - Change: listed under phase with [x] (done) or [ ] (pending)
-->

## Milestone: M1 - v2 Architecture Refactoring [ACTIVE]

**Goal**: Refactor Blueprint from v1 (state machine, 25 commands, PEG grammars) to v2 (artifact-based, 8 commands, YAML schema) while preserving engineering rigor.
**Status**: ACTIVE

### Phase: P1.1 - Core Engine [IN_PROGRESS]

- **Goal**: Rewrite core types, config, file-tree, continue engine for artifact-based progress detection
- **Spec domain**: core
- **Changes**: 1/1 completed
- **Status**: IN_PROGRESS

**Changes**:
- [x] v2-core-refactor (archived 2026-07-16)

**Next**: Phase P1.2

### Phase: P1.2 - Commands & Templates [IN_PROGRESS]

- **Goal**: Rewrite 8 commands, 7 artifact templates, 3 agent prompts, 8 workflow instructions
- **Spec domain**: templates
- **Changes**: 1/1 completed
- **Status**: IN_PROGRESS

**Changes**:
- [x] v2-commands-templates (archived 2026-07-16)

**Next**: Phase P1.3

### Phase: P1.3 - Platform Integration & Testing [NOT_STARTED]

- **Goal**: Update integrations (OMP, Claude Code, .agent), fix test suite, update docs
- **Spec domain**: platform-gen
- **Changes**: 3/3 planned
- **Status**: IN_PROGRESS

**Changes**:
- [x] v2-platform-tests (archived 2026-07-16)
- [ ] e2e-loop-quality-test (proposed 2026-07-16)
- [x] bp-auto-context-injection (archived 2026-07-19)

**Next**: M2 planning

---

## Milestone: M2 - Polish & Extensions [PLANNED]

**Goal**: Polish v2 with custom schemas, brownfield support improvements, and community feedback integration.
**Status**: PLANNED

---

## Progress Summary

| Milestone | Phases | Changes | Status |
|-----------|--------|---------|--------|
| M1 - v2 Architecture Refactoring | 2/3 | 3/3 | ACTIVE |
| M2 - Polish & Extensions | 0/0 | 0/0 | PLANNED |
