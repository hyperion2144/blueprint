# Tasks: fix-state-tracking

---

## TDD type 标注规则

| type | 含义 | TDD 协议 |
|------|------|---------|
| `refactor` | 不改变外部行为的内部改进 | 先验证已有测试 → 修改 → 再次验证 |

---

## Wave 1: archive 状态更新支持 adhoc

- [ ] task-1: [type:refactor] archive 命令同时搜索 state.changes 和 state.adhoc
  - **description**: `archiveHandler` 中的 `updateState` 回调，先查 `state.changes`，未匹配则查 `state.adhoc`。匹配后设置 status = 'archived'
  - **files**: `src/commands/specwf-archive.ts`
  - **acceptance**: archive adhoc change 后 state.adhoc 状态变更为 archived；archive 普通 change 行为不变；79 tests 全部通过

---

## 验证

- [ ] `vitest run` 全部通过
- [ ] `tsc --noEmit` 通过
- [ ] E2E 验证：archive adhoc change → adhoc status 变更为 archived
