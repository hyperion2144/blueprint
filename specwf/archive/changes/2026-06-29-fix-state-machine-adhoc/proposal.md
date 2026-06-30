# Proposal: fix-state-machine-adhoc

---

## Intent

Adhoc change 从 `adhoc-proposal → plan` 进入标准 change 循环后，最终走到 `change-archived`，状态前缀从 `adhoc-` 变成了 `change-`。状态机缺少 adhoc 的完整退出路径。

## Scope

- `src/types/state.ts` 添加 `change-archived → adhoc-archived` 和 `adhoc-archived → adhoc-proposal` 两条转移
- `determineChangeNextStep` 中 adhoc change 的状态键用 `adhoc-{status}` 前缀（已实现）

## Must-haves

- 归档后的 adhoc change 在 `continue change <name>` 中显示 `adhoc-archived`
- 从 `adhoc-archived` 可继续创建新 adhoc

## 转移表

```typescript
{ from: 'change-archived', command: 'adhoc-done', to: 'adhoc-archived', slashCommand: '' },
{ from: 'adhoc-archived', command: 'new-change', to: 'adhoc-proposal', slashCommand: '' },
```
