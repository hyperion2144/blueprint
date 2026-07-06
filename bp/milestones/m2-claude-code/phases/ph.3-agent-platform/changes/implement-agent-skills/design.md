# Design: implement-agent-skills

Same pattern as claude-code skills but:
- Path: `.agent/skills/bp-<step>/SKILL.md`
- Body: WORKFLOW_REGISTRY with `$1`→`[BP:CHANGE_NAME]`, `$ARGUMENTS`→`[BP:CHANGE_NAME]`
- Frontmatter: name, description, hide: false
