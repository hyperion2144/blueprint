# Context: ph.2-claude-code

> Phase implementation decisions document. Express path — no gray areas to discuss.

---

## Phase Goals

实现 Claude Code 平台 provider。生成 `.claude/skills/` + `.claude/agents/` 文件，注册为 `'claude-code'` provider。

## Inherited Decisions (from ph.1)

- D1: `PlatformProvider` 用统一 `generate()` 方法
- D2: `PlatformRegistry` 用 Map + singleton
- D3: `capabilities` 可选属性（`supportsCommands` 默认 false）

---

## Architecture Decisions

### D4: Claude Code 文件路径
- **Decision**: 生成到 `.claude/skills/bp-<step>.md`（单文件，无子目录）和 `.claude/agents/bp-<role>.md`。
- **Rationale**: Claude Code 原生支持 `.claude/commands/<name>.md` 单文件格式。用 `skills` 目录名称与 roadmap 一致。
- **Alternatives considered**: `.claude/commands/` — Claude Code 原生路径，但 roadmap 指定 skill 格式。

### D5: Skill 参数格式 — 保持 `$1`
- **Decision**: WORKFLOW_REGISTRY 模板中的 `$1`/`$ARGUMENTS` 保持不变，不替换为 `[BP:xxx]`。
- **Rationale**: Claude Code 原生支持 `$1`/`$N` 位置参数替换。保留让 Claude Code 自身的模板引擎处理参数，无需 bp 中间层转换。
- **Alternatives considered**: `[BP:xxx]` — 与 `.agent/` 对齐，但需要额外转换层，破坏 Claude Code 原生体验。

### D6: Agent frontmatter
- **Decision**: 使用 Claude Code agent 标准 frontmatter 字段：`name`, `description`, `tools`（tool whitelist）, `model`（简化为 sonnet/opus/haiku/inherit）。
- **Rationale**: 保持与 Claude Code 官方格式兼容。
- **Alternatives considered**: 用 OMP 格式的 frontmatter 直接复制 — 与 Claude Code 不兼容。

---

## Interface Contracts

```typescript
// src/integrations/claude-code/index.ts 注册:
const claudeCodeProvider: PlatformProvider = {
  id: 'claude-code',
  name: 'Claude Code',
  capabilities: { supportsCommands: false }, // 只有 skills，无 commands
  generate(config) {
    return [
      ...generateClaudeSkills(config),
      ...generateClaudeAgents(config),
    ];
  },
};
```

---

## Implementation Constraints

- 文件路径: `.claude/skills/bp-<step>.md`（单文件，扁平结构，无子目录）
- 文件路径: `.claude/agents/bp-<role>.md`
- 参数格式: 保持 `$1`/`$ARGUMENTS`（与 OMP commands 一致）
- 不生成 `.claude/commands/` — Claude Code 不需要 command/slash-command 文件

---

## Change Split Plan

| Change | 内容 | 范围 |
|--------|------|------|
| implement-claude-code-skills | 生成 `.claude/skills/` 文件 | src/integrations/claude-code/commands.ts |
| implement-claude-code-agents | 生成 `.claude/agents/` 文件 | src/integrations/claude-code/agents.ts |

---

## Non-Goals

- 不改动 OMP 生成
- 不为 `.agent/` 格式做任何准备（那是 Phase 3）
- 不生成 `.claude/commands/`（command 格式）
