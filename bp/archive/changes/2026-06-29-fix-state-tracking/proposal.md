# Proposal: fix-state-tracking

---

## Intent

排查所有修改 state 的 CLI 命令，发现 `blueprint archive` 只更新 `state.changes` 的状态，不更新 `state.adhoc`。导致 adhoc change archive 后 frontmatter 中状态仍为 `proposal`。

问题根因：`blueprint-archive.ts:56` 只查找 `state.changes`，不知道 adhoc change 存在 `state.adhoc`。

影响：所有 adhoc change 归档后状态字段与实际不符。用户无法通过状态机判断哪些 adhoc change 已完成。

本变更为 bug fix，目标是让涉及流程状态变更的命令正确更新所有相关的状态字段。

---

## Scope

### In scope

- `blueprint archive <change>` 同时检查 `state.changes` 和 `state.adhoc`，匹配到任意一个就更新其 status 为 `archived`
- 如果有其他命令存在类似的遗漏，一并修复

### Out of scope

- 不新增命令或改变命令签名
- 不改变 state.md 的 frontmatter 结构
- 不涉及 `blueprint continue` 的行为变更（另有一个 change）

---

## Approach

修改 `blueprint-archive.ts` 的 state 更新逻辑，查找 change 时同时搜索 `state.changes` 和 `state.adhoc`：

```ts
updateState(blueprintDir, (state) => {
  const change = state.changes.find((c) => c.name === changeName);
  if (change) {
    change.status = 'archived';
    return;
  }
  const adhoc = state.adhoc.find((c) => c.name === changeName);
  if (adhoc) {
    adhoc.status = 'archived';
  }
});
```

---

## Must-haves

- `blueprint archive <adhoc-change>` 归档后，`state.adhoc` 中对应的 status 变为 `archived`
- `blueprint archive <normal-change>` 行为不变
- 现有 79 测试全部通过

---

## Non-goals

- 不涉及 adhoc change 在 proposal→plan→apply→review→verify 阶段的状态推进（那是 `blueprint continue` 或独立命令的职责）
