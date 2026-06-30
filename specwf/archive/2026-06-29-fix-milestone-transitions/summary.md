# Change Summary: fix-milestone-transitions

## 描述

修复 `specwf state set-milestone <id>` 硬编码跳转到 `phase-discuss` 的问题。新 milestone 应先走需求定义阶段（grill），而非直接跳入 phase 讨论。同时补齐状态机缺少的 `milestone-active → grill` 转移路径。

## 产出文件

| 文件 | 修改 |
|------|------|
| `src/commands/specwf-state.ts` | `setMilestone` 中将 `type` 设为 `milestone`、`step` 设为 `active`、`project.status` 设为 `milestone-active`（原为 `phase`/`discuss`/`phase-discuss`） |
| `src/types/state.ts` | `STATE_TRANSITIONS` 中添加 `{ from: 'milestone-active', command: 'grill', to: 'requirements-defined', slashCommand: '/specwf:grill' }` |

## 关键决策

- **milestone 流程复用项目层流程**：`milestone-active → grill → requirements-defined → research → researched → roadmap → roadmap-defined → discuss → phase-discuss`，与 project 流程一致（仅不含 init 阶段）
- **set-milestone 不再跳 phase**：`set-phase` / `set-step` 仅负责 phase 维度切换，与 milestone 解耦

## 验证

- [x] `vitest run` 全部通过（79/79）
- [x] `npm run build` 通过
- [x] E2E: `set-milestone m2-claude-code` 后 state 显示 `milestone-active`，`next: /specwf:grill`
- [x] `specwf continue` 正确推荐 `/specwf:grill` 作为下一步
