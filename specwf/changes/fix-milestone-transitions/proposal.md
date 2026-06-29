# Proposal: fix-milestone-transitions

---

## Intent

`specwf state set-milestone <id>` 硬编码跳转到 `phase-discuss`，但新 milestone 需要先定义 phase 拆分。状态机也缺少从 `milestone-active` 到 `phase-discuss` 的合法转移。

## Scope

1. `specwf state set-milestone <id>` — 改为设置 `milestone-active` + `type: milestone` + `step: active`，不跳 phase
2. 状态机添加 `milestone-active → discuss → phase-discuss` 转移
3. `set-phase` / `set-step` 检查一致性

## Must-haves

- `specwf state set-milestone m2` 后状态为 `milestone-active`，不是 `phase-discuss`
- `specwf continue` 显示下一步 `/specwf:discuss`
- `specwf state set-phase phase-1` 正常切换到 phase

## 转移表

```typescript
{ from: 'milestone-active', command: 'discuss', to: 'phase-discuss', slashCommand: '/specwf:discuss' },
```
