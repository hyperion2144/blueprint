# Design: fix-state-tracking

---

## 背景与目标

`blueprint archive` 归档时只更新 `state.changes` 的状态，adhoc change 存在 `state.adhoc` 中，因此归档后状态仍为 `proposal`。

本设计目标：
- `blueprint archive` 同时搜索 `state.changes` 和 `state.adhoc`
- 不改变其他命令行为

---

## 技术方案

### 架构图

```text
archiveHandler() → updateState(updater)
  │
  ├─ state.changes.find(name) → 匹配 → status = 'archived' → return
  │
  └─ state.adhoc.find(name) → 匹配 → status = 'archived'
```

### 核心数据结构

无变更。

### 数据流

1. `blueprint archive fix-state-overwrite` → `archiveHandler('blueprint/changes/fix-state-overwrite')`
2. `changeName` = `fix-state-overwrite`
3. `updateState(blueprintDir, updater)`
4. updater 先查 `state.changes.find(c => c.name === changeName)`
5. 未匹配 → 查 `state.adhoc.find(c => c.name === changeName)`
6. 匹配 → `status = 'archived'`
7. `saveState` 写回（保留 body）

### 接口设计

```typescript
// 修改 archiveHandler 中的 updateState 回调
// 签名不变
```

---

## 文件清单

| 文件路径 | 内容描述 | 操作 |
|---------|---------|------|
| `src/commands/blueprint-archive.ts` | archive 状态更新逻辑增加 adhoc 搜索 | 修改 |

---

## 测试策略

### 单元测试
- 现有测试全部通过即可（79 tests）

### 集成测试
- archive adhoc change → state.adhoc 状态变更为 archived
- archive 普通 change → state.changes 状态变更为 archived（行为不变）

### TDD 任务
- 不适用（refactor，无外部行为变更）

---

## 备选方案

| 方案 | 优点 | 缺点 | 不选原因 |
|-----|------|------|---------|
| **统一 changes + adhoc 数组** | 一个数组好管理 | 需改 schema + migration | 过度设计 |
| **archive 不更新 adhoc，由用户手动** | 改动最小 | 状态不一致，不可接受 | 不满足需求 |

---

## 风险点

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| changes.find 匹配 adhoc 的同名 change | 低 | 低 | 先查 changes，再查 adhoc，互斥 |
