# Design: implement-claude-code-skills

> This document is the Change Design.

---

## Context & Goals

**Context**: OMP 已有命令生成器（commands.ts -> .omp/commands/）。Claude Code 需要类似但格式不同的 skill 文件（.claude/skills/）。

**Goals**: 生成 21 个 Claude Code skill 文件，复用 WORKFLOW_REGISTRY 模板内容。

---

## Technical Approach

### Architecture

```text
src/integrations/claude-code/skills.ts [NEW]
  SKILL_DEFS (static array, 21 steps)
  → STEP_DEFS 格式套 Claude Code frontmatter
  → body = WORKFLOW_REGISTRY[step].command().content
  → path = .claude/skills/bp-<step>.md
```

### Key Pattern

与 OMP commands.ts 相同结构，但：
- Frontmatter: `name`, `description`, `allowed-tools`（Claude Code 格式）
- 路径: `.claude/skills/` 而非 `.omp/commands/`
- 参数: `$1`/`$ARGUMENTS` 保持原样（Claude Code 原生支持）

---

## File Manifest

| File | Action | Description |
|------|--------|-------------|
| `src/integrations/claude-code/skills.ts` | Create | SKILL_DEFS + generateClaudeSkills() |
| `src/integrations/claude-code/skills.test.ts` | Create | Golden-file snapshot tests |

---

## Test Strategy

- Golden-file snapshot test: generate all skills, compare against baseline
- Verify frontmatter format correctness

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| WORKFLOW_REGISTRY 模板变更影响快照 | Medium | Low | Vitest snapshot auto-update |
