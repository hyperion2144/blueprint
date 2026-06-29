# Design: fix-milestone-transitions

---

## 背景与目标

`specwf state set-milestone <id>` 硬编码跳转到 `phase-discuss`，但新里程碑应先走需求定义 → 调研 → 路线图拆分 → 再进 phase。状态机也缺少从 `milestone-active` 到 `phase-discuss` 的合法转移路径。

本设计目标：
- `set-milestone` 将状态设为 `milestone-active`，不跳 phase
- 状态机添加 `milestone-active → grill → requirements-defined` 转移，复用项目层后续路径
- `specwf continue` 在 milestone-active 时显示 `/specwf:grill`

---

## 技术方案

### 架构图

```text
修改前:
set-milestone → type:phase, step:discuss, status:phase-discuss
  → continue 显示无下一步（milestone-shipped 无 adhoc 也无下一步）

修改后:
set-milestone → type:milestone, step:active, status:milestone-active
  → continue → getNextSteps('milestone-active')
    → [{ command: 'grill', to: 'requirements-defined', ... }]
    → 显示 /specwf:grill

后续路径复用项目层:
  milestone-active → grill → requirements-defined → research
    → researched → roadmap → roadmap-defined → discuss → phase-discuss
```

### 修改文件

| 文件 | 修改 |
|------|------|
| `src/commands/specwf-state.ts` | `setMilestone` 中 type→milestone, step→active, status→milestone-active |
| `src/types/state.ts` | 添加 `milestone-active → grill → requirements-defined` 转移 |
