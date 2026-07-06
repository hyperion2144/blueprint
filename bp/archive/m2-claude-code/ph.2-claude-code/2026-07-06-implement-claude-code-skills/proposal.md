# Proposal: implement-claude-code-skills

> This document is a Change Proposal.

---

## Intent

**Problem**: OMP 生成器已有，但 `project.yml` 配置 `platform: [claude-code]` 时不会生成任何文件。
**Who affected**: 使用 Claude Code 平台的用户。
**What if not done**: 无 Claude Code 平台文件生成。
**Type**: feature

---

## Scope

### In scope

- 创建 `src/integrations/claude-code/` 目录
- 定义 `SKILL_DEFS` 静态表（21 个 step，Claude Code 格式 frontmatter）
- 从 `WORKFLOW_REGISTRY` 获取 body 内容
- 生成 `.claude/skills/bp-<step>.md` 文件（扁平结构）
- golden-file 快照测试

### Out of scope

- 不生成 `.claude/agents/`（那是另一个 change）
- 不修改 `.claude/commands/` 路径
- 不改动 OMP 或任何已有代码

---

## Approach

- `src/integrations/claude-code/skills.ts` — 定义 SKILL_DEFS（21 step），类似 OMP commands.ts
- 每个 skill 的 frontmatter: `name`, `description`, `allowed-tools`
- body: `WORKFLOW_REGISTRY[step].command().content`（保持 `$1`/`$ARGUMENTS`）
- 生成路径: `.claude/skills/bp-<step>.md`

---

## Must-haves

1. SHALL `platform: [claude-code]` 时 `blueprint update` 生成 `.claude/skills/bp-*.md`
2. SHALL 每个 skill 文件的 frontmatter 格式正确（name/description）
3. SHALL body 内容与对应 WORKFLOW_REGISTRY 模板一致
4. SHALL 参数占位符保持 `$1`/`$ARGUMENTS`（不转为 `[BP:xxx]`）
5. SHALL golden-file 测试验证快照

---

## Non-goals

- 不生成 agent 文件
- 不生成 `.claude/commands/`
- 不修改 OMP 已有代码
