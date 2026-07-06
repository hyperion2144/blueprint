# Context: ph.3-agent-platform

> Express path — no gray areas.

## Phase Goals

实现 `.agent/` 平台 provider。生成 `.agent/skills/` + `.agent/agents/` 文件，使用 `[BP:xxx]` 参数格式，注册为 `'agent'` provider。

## Inherited Decisions (from ph.1, ph.2)

- D1-D3: same PlatformProvider + Registry pattern
- `capabilities.supportsCommands: false`（只有 skills）

## Architecture Decisions

### D7: 文件路径 — `.agent/skills/<step>/SKILL.md`
- **Decision**: `.agent/skills/bp-<step>/SKILL.md`（子目录结构）和 `.agent/agents/bp-<role>.md`（扁平）。
- **Rationale**: Agent Skills 开放标准使用 `<name>/SKILL.md` 子目录格式。

### D8: 参数格式 — `[BP:xxx]`
- **Decision**: WORKFLOW_REGISTRY 模板中的 `$1`/`$ARGUMENTS` 替换为 `[BP:CHANGE_NAME]`/`[BP:MILESTONE_ID]` 等对应键。
- **Rationale**: `.agent/` skills 不支持 `$1` 原生参数。参数替换在文件生成时完成，形成静态 skill 文件。

### D9: Agent frontmatter — 通用格式
- **Decision**: 使用通用 frontmatter：`name`, `description`。不含 OMP 平台字段（modelRoles, thinkingLevel）。
- **Rationale`: `.agent/` 是通用格式，不应包含任何平台特定字段。

## Change Split Plan

| Change | 内容 | 范围 |
|--------|------|------|
| implement-agent-skills | `.agent/skills/` 生成 + `[BP:xxx]` 参数替换 | src/integrations/agent/skills.ts |
| implement-agent-agents | `.agent/agents/` 生成 | src/integrations/agent/agents.ts |
