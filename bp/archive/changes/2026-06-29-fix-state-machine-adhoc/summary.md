# Change Summary: fix-state-machine-adhoc

> **完成日期**: 2026-06-29
> **Change 类型**: adhoc

---

## Intent

Adhoc change 从 `adhoc-proposal → plan` 进入标准 change 循环后，最终走到 `change-archived`，状态前缀从 `adhoc-` 变成了 `change-`。状态机缺少 adhoc 的完整退出路径，导致归档后的 adhoc change 在 `continue change <name>` 中显示为 `change-archived`，与新 adhoc 的语义不一致，也无法从归档状态继续创建新的 adhoc。

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| src/types/state.ts | 修改 | 添加 change-archived → adhoc-archived 和 adhoc-archived → adhoc-proposal 两条状态转移 |
| src/core/continue.ts | 修改 | 修复 adhoc change 状态键前缀检查，统一使用 `'adhoc'` 前缀 |
| blueprint/changes/fix-state-machine-adhoc/proposal.md | 创建 | Proposal 文档 |
| blueprint/changes/fix-state-machine-adhoc/design.md | 创建 | Design 文档 |
| blueprint/changes/fix-state-machine-adhoc/tasks.md | 创建 | Tasks 文档 |

## 关键决策

- 新增两条状态转移：`change-archived → adhoc-archived`（归档后恢复 adhoc 标记）、`adhoc-archived → adhoc-proposal`（从已归档可创建新 adhoc）
- `determineChangeNextStep` 中 adhoc change 不再根据 status 条件判断前缀，改为统一使用 `'adhoc'` 前缀，确保 proposal / progress / archived 状态都正确显示为 `adhoc-{status}`
- 两条转移均为无副作用的纯数据转移（slashCommand 为空），由 `continue` 命令凭状态键展示下一步，不触发额外流程

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ 0 errors |
| vitest run | ✅ 79/79 passed |
| npm run build | ✅ 65.35KB |
| `continue change fix-ship-command`（proposal） | ✅ 显示 adhoc-proposal → plan |
| `continue change fix-state-overwrite`（archived） | ✅ 显示 adhoc-archived，无可用下一步 |
| 不存在的 change | ✅ 输出错误信息 + 可用列表 |
