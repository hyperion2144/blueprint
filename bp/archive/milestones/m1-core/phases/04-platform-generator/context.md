# Phase 4 Context: 平台生成器

> 讨论时间: 2026-06-29
> 决策来源: research/pitfalls.md §1-3

## Phase 目标

`blueprint update` 能为 OMP 生成 slash commands + agent 定义。生成器本身是独立模块，CLI 命令层（Phase 5）调用它。

## 实现决策

### D1: 生成器位置
`src/generators/` 目录，三个模块：
- `omp-commands.ts` — 14 个 slash command 文件
- `omp-agents.ts` — 6 个 agent 定义文件
- `index.ts` — 调度入口

### D2: 命令文件格式
`.omp/commands/blueprint-<step>.md`，frontmatter 含 `name`（`blueprint:<step>`）+ `description`，body 为 prompt 模板。

### D3: Agent 文件格式
`.omp/agents/blueprint-<role>.md`，frontmatter 含 `name`/`description`/`tools`/`model`/`thinkingLevel`/`spawns`，body 为 systemPrompt。

`model` 字段引用 OMP 角色名（slow/default/smol），不硬编模型 ID。通过 `resolveModels(config)` 从 profile + project.yml models 解析。

### D4: 生成时机
`blueprint update` 命令读取 project.yml → 调度生成器 → 输出文件到 .omp/commands/ + .omp/agents/。
`blueprint init` 在创建骨架后也调用 `blueprint update`。

### D5: 幂等性
重复生成相同内容不产生 diff。覆盖已修改文件前检测 hash 差异并 warning。
