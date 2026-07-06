# Design: implement-claude-code-agents

---

## Architecture

```text
src/integrations/claude-code/agents.ts [NEW]
  AGENT_DEFS (7 agents, Claude Code frontmatter)
  → body = AGENT_PROMPTS[role]
  → path = .claude/agents/bp-<role>.md

src/integrations/claude-code/index.ts [NEW]
  → registerClaudeCodeProvider()
  → register in PlatformRegistry('claude-code')
```

## File Manifest

| File | Action |
|------|--------|
| `src/integrations/claude-code/agents.ts` | Create |
| `src/integrations/claude-code/agents.test.ts` | Create |
| `src/integrations/claude-code/index.ts` | Create |
| `src/generators/index.ts` | Modify (add registerClaudeCodeProvider call) |
