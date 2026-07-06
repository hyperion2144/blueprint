# Proposal: implement-claude-code-agents

> This document is a Change Proposal.

---

## Intent

**Problem**: Claude Code 平台需要 agent 定义文件才能使用 blueprint 的子代理。
**Who affected**: 使用 Claude Code 平台的用户。
**What if not done**: 用户需要手动编写 `.claude/agents/` 文件。
**Type**: feature

---

## Scope

### In scope

- 定义 `AGENT_DEFS` 静态表（7 个 agent，Claude Code 格式 frontmatter）
- 从 `AGENT_PROMPTS` 获取 body（system prompt）
- 生成 `.claude/agents/bp-<role>.md` 文件
- golden-file 快照测试
- `src/integrations/claude-code/index.ts` 注册 provider

### Out of scope

- 不生成 `.claude/skills/`（那是另一个 change）
- 不改动 OMP 任何代码

---

## Approach

- `src/integrations/claude-code/agents.ts` — 定义 AGENT_DEFS（7 个 agent），类似 OMP agents.ts
- 每个 agent 的 frontmatter: `name`, `description`, `tools`, `model`, `effort`
- body: `AGENT_PROMPTS[role]`（system prompt）
- 生成路径: `.claude/agents/bp-<role>.md`
- `src/integrations/claude-code/index.ts` 导出 `registerClaudeCodeProvider()`

---

## Must-haves

1. SHALL `platform: [claude-code]` 时 `blueprint update` 生成 `.claude/agents/bp-*.md`
2. SHALL 每个 agent 文件的 frontmatter 格式正确（name/description/tools/model）
3. SHALL body 内容与对应 AGENT_PROMPTS 一致
4. SHALL `registerClaudeCodeProvider()` 在 `generators/index.ts` 注册后 provider 可用
5. SHALL golden-file 测试

---

## Non-goals

- 不生成 skill 文件
- 不改动 OMP 已有代码
