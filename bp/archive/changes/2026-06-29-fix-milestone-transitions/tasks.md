# Tasks: fix-milestone-transitions

---

## TDD type 标注规则

| type | 含义 | TDD 协议 |
|------|------|---------|
| `refactor` | 内部改进，不改变外部行为 | 先验证已有测试 → 修改 → 再次验证 |

## Wave 1: 修复里程碑状态机

- [x] task-1: [type:refactor] set-milestone 改为 milestone-active
  - **description**: `blueprint-state.ts` 中 `setMilestone` 将 `active_context.type` 设为 `milestone`（非 `phase`），`step` 设为 `active`（非 `discuss`），`project.status` 设为 `milestone-active`（非 `phase-discuss`）
  - **files**: `src/commands/blueprint-state.ts`
  - **acceptance**: `blueprint state set-milestone m2` 后 state 显示 milestone-active，非 phase-discuss

- [x] task-2: [type:refactor] 状态机添加 milestone-active → grill 转移
  - **description**: `src/types/state.ts` 的 `STATE_TRANSITIONS` 中添加 `{ from: 'milestone-active', command: 'grill', to: 'requirements-defined', slashCommand: '/blueprint:grill' }`
  - **files**: `src/types/state.ts`
  - **acceptance**: `blueprint continue` 在 milestone-active 时显示 /blueprint:grill

---

## 验证

- [x] `vitest run` 全部通过（79/79）
- [x] `npm run build` 通过
- [x] E2E: set-milestone → state 显示 milestone-active → continue 显示 grill
