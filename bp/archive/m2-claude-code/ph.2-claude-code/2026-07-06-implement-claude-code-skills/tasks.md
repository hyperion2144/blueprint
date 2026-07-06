# Tasks: implement-claude-code-skills

> Lightweight — all tasks type:scaffolding.

---

## TDD Type Annotations

| type | Meaning | TDD Protocol |
|------|---------|-------------|
| `scaffolding` | Skeleton code | Direct implementation, no TDD |

---

## Wave 1: Claude Code Skills Generator

- [x] task-claude-skills: [type:scaffolding] Create Claude Code skills generator <!-- commit: daa06e3 -->
  - **description**: Create `src/integrations/claude-code/skills.ts`. Define SKILL_DEFS (22 steps). Each def: name, description. body from WORKFLOW_REGISTRY. File path: `.claude/skills/bp-<step>.md`.
  - **files**: src/integrations/claude-code/skills.ts
  - **acceptance**: `generateClaudeSkills()` returns 22 skill files with correct frontmatter and body

- [x] task-claude-skills-test: [type:scaffolding] Add golden-file test <!-- commit: daa06e3 -->
  - **description**: Snapshot test for skills generation.
  - **files**: src/integrations/claude-code/skills.test.ts
  - **acceptance**: Golden-file snapshot matches

---

## Implementation Verification

- [x] `vitest run` passes
- [x] Golden-file snapshot matches
