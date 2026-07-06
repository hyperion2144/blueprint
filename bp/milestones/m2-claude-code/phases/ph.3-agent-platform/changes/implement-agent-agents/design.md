# Design: implement-agent-agents

Pattern same as claude-code agents but:
- Path: `.agent/agents/bp-<role>.md`
- Frontmatter: name, description (no OMP-specific modelRoles/thinkingLevel)
- Register as 'agent' provider

# Tasks: implement-agent-agents

- [ ] task-agent-agents: Create agent/agents.ts + agent/index.ts
- [ ] task-register-agent: Register agent provider in generators/index.ts
- [ ] task-agent-agents-test: Golden-file test

## Verification
- [ ] vitest run passes
