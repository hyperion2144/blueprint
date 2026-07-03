# Change Summary: fix-state-tracking

> **完成日期**: 2026-06-29
> **Change 类型**: adhoc

---

## Intent

`blueprint archive <change>` 归档时只更新 `state.changes` 中的状态，忽略了 `state.adhoc` 中的 adhoc change。导致 adhoc change archive 后 frontmatter 状态字段仍为 `proposal`，与实际状态不一致。用户无法通过状态机判断哪些 adhoc change 已完成。

问题根因：`blueprint-archive.ts` 的 `updateState` 回调只搜索 `state.changes`，不知道 adhoc change 存储在独立的 `state.adhoc` 数组中。

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| src/commands/blueprint-archive.ts | 修改 | archiveHandler 的 updateState 回调先查 state.changes，未匹配再查 state.adhoc，匹配后设置 status = 'archived' |
| blueprint/changes/fix-state-tracking/proposal.md | 创建 | Proposal 文档 |
| blueprint/changes/fix-state-tracking/design.md | 创建 | Design 文档 |
| blueprint/changes/fix-state-tracking/tasks.md | 创建 | Tasks 文档 |
| blueprint/changes/fix-state-tracking/verification.md | 创建 | Verification 文档 |

## 关键决策

- **先查 changes，再查 adhoc**：`state.changes.find` 匹配后立即 `return`，不执行 adhoc 搜索，确保普通 change 行为完全不变
- **adhoc 搜索不 return**：匹配后仅设置 status，无早期返回——两个数组互斥，但保持语义清晰
- **不合并数组**：备选方案"统一 changes + adhoc 数组"因需改 schema + migration 被否决，属于过度设计
- **只修 archive 命令**：其他状态修改命令（如 `blueprint continue`）没有此遗漏，scope 限定

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ 0 errors |
| vitest run | ✅ 79/79 passed |
| npm run build | ✅ 62.81KB |
| archive adhoc change → adhoc status 更新 | ✅ E2E 确认，临时目录验证通过 |
| archive 普通 change 行为不变 | ✅ changes.find 优先 return，不进入 adhoc 逻辑 |
