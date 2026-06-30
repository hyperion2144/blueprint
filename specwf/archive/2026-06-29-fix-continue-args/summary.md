# Change Summary: fix-continue-args

> **完成日期**: 2026-06-29
> **Change 类型**: adhoc

---

## Intent

`specwf continue` 原来只读 `active_context` 推断下一步，无法查询特定 change 的状态。
adhoc change 创建后 status 为 `proposal`，但 continue 只看 milestone 层状态（shipped），永远看不到 adhoc 的下一步。
本变更让 `specwf continue change <name>` 能搜索 changes/adhoc 数组并输出正确下一步。

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| src/core/continue.ts | 修改 | 新增 `determineChangeNextStep` 函数 |
| src/commands/specwf-continue.ts | 修改 | 注册 `continue change <name>` 子命令 |

## 关键决策

- **搜索顺序：先 changes 后 adhoc** — `state.changes` 优先匹配，未命中再查 `state.adhoc`，都不存在则返回错误
- **不存在的 change 输出可用 change 列表** — 错误信息附带提示，比单纯的 "not found" 更实用
- **无参数行为不变** — `continueHandler` 在无子命令时调用原有的 `determineNextStep`，保证向后兼容
- **milestone/phase 参数暂不实现** — scope 控制，仅实现 change 子命令

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ 0 errors |
| vitest run | ✅ 79/79 passed |
| npm run build | ✅ 64.85KB dist |
| `specwf continue`（无参数） | ✅ milestone-shipped，行为不变 |
| `specwf continue change fix-ship-command` | ✅ adhoc-proposal → plan |
| `specwf continue change nonexistent` | ✅ 错误信息 + 可用 change 列表 |
