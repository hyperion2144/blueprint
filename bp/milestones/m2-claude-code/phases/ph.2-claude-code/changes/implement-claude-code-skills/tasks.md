# Tasks: implement-claude-code-skills

> Lightweight — all tasks type:scaffolding.

---

## TDD Type Annotations

| type | Meaning | TDD Protocol |
|------|---------|-------------|
| `scaffolding` | Skeleton code | Direct implementation, no TDD |

---

## Wave 1: Claude Code Skills Generator

- [ ] task-claude-skills: [type:scaffolding] Create Claude Code skills generator
  - **description**: Create `src/integrations/claude-code/skills.ts`. Define SKILL_DEFS (21 steps, same as OMP STEP_DEFS). Each def: name, description, allowed-tools. body from WORKFLOW_REGISTRY[step].command().content. File path: `.claude/skills/bp-<step>.md`.
  - **files**: src/integrations/claude-code/skills.ts
  - **acceptance**: `generateClaudeSkills()` returns 21 skill files with correct frontmatter and body

- [ ] task-claude-skills-test: [type:scaffolding] Add golden-file test
  - **description**: Snapshot test for skills generation.
  - **files**: src/integrations/claude-code/skills.test.ts
  - **acceptance**: Golden-file snapshot matches

---

## Implementation Verification

- [ ] `vitest run` passes
- [ ] Golden-file snapshot matches
