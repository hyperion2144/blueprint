# v0.2.1 — 状态校验与输出增强

> 2026-06-29

前置校验、continue 输出增强、里程碑状态机修复。

### 新增

- 状态转移前置校验（state-validator）：推进状态前检查退出条件
- continue 输出增加步骤描述、产出物列表、command 文件参考

### 修复

- 里程碑流程修正（milestone-active → grill → ...，不跳 phase）
- Adhoc change 状态机完整路径（adhoc-proposal → ... → adhoc-archived）
- archive 命令同时更新 state.adhoc 状态
- continue 支持 change 子命令
- saveState 保留现有 body
- 模板内容充实（ship/adhoc/continue）

### CI

- GitHub Actions npm 自动发布

---

# v0.2.0 — v1 修复

> 2026-06-29

根据工作流审计结果修复的全部问题。

## v0.1.0 功能

- 9 个 CLI 子命令：init / update / config / state / context / continue / archive / list / template
- OMP 平台文件生成（14 commands + 6 agents + 14 skills）
- delta-spec 合并 + 代码认知回灌

## v0.2.0 变更

### Bug 修复

- `saveState` 写入时保留现有 body，不再覆盖用户编写的详细内容
- `specwf archive` 同时检查 `state.adhoc`，修复 adhoc change 归档后状态不更新
- `specwf continue change <name>` 新子命令，可查询指定 change/adhoc 的下一步
- `archive` 状态转移增加 `subagent: true` 标注
- 添加 adhoc change 完整状态机退出路径（adhoc-proposal → change-archived → adhoc-archived）
- `continue` 无参数时提示 pending adhoc change
- 模板内容充实：ship/adhoc/continue 命令指引更完整

### CI

- GitHub Actions npm 自动发布 workflow（tag push 触发）

### 验证

- tsc --noEmit: 0 errors
- vitest: 79/79 tests passed
