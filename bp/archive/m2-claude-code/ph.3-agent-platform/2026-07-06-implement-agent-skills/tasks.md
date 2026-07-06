# Design: implement-agent-skills

Same pattern as claude-code skills but:
- Path: `.agent/skills/bp-<step>/SKILL.md` (subdir)
- Body: WORKFLOW_REGISTRY with `$1`→`[BP:CHANGE_NAME]`, `$ARGUMENTS`→`[BP:CHANGE_NAME]`, etc.
- Frontmatter: name, description, hide: false (standard skill format)

# Tasks: implement-agent-skills

- [x] task-agent-skills: [type:scaffolding] Create agent skills generator with [BP:xxx] params <!-- commit: a5a960a -->
- [ ] task-agent-skills-test: [type:scaffolding] Add golden-file test

## Verification
- [ ] `vitest run` passes
