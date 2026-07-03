# Tasks: fix-continue-args

---

## TDD type 标注规则

| type | 含义 | TDD 协议 |
|------|------|---------|
| `behavior` | 业务行为 | **RED→GREEN→REFACTOR** |
| `refactor` | 不改变外部行为的内部改进 | 先验证已有测试 → 修改 → 再次验证 |

---

## Wave 1: continue 支持 change 子命令

- [ ] task-1: [type:behavior] `determineChangeNextStep` 从 adhoc/changes 推断状态并查下一步
  - **description**: 在 `src/core/continue.ts` 中新增 `determineChangeNextStep(blueprintDir, changeName)` 函数。根据 change 所在的数组（changes 或 adhoc）构造状态键（`change-{status}` 或 `adhoc-{status}`），用 `getNextSteps()` 获取可用转移，返回 `ContinueResult`
  - **files**: `src/core/continue.ts`
  - **acceptance**: 调用 `determineChangeNextStep` 对 adhoc proposal change 返回 plan 作为下一步
  - ***RED 测试***:
    ```
    GIVEN state.md 中有 status=proposal 的 adhoc change "test-change"
    WHEN determineChangeNextStep(dir, "test-change") 被调用
    THEN 返回的 nextCommand 为 "plan"
    ```

- [ ] task-2: [type:behavior] `blueprint continue change <name>` 子命令解析
  - **description**: 修改 `blueprint-continue.ts` 注册 `continue change <name>` 子命令。无参数时调用原 `determineNextStep`，有 change 参数时调用 `determineChangeNextStep`
  - **files**: `src/commands/blueprint-continue.ts`
  - **acceptance**: `blueprint continue change fix-ship-command` 输出正确信息；`blueprint continue` 无参数行为不变
  - ***RED 测试***:
    ```
    GIVEN fix-ship-command 是 status=proposal 的 adhoc change
    WHEN blueprint continue change fix-ship-command
    THEN 输出显示 proposal → 下一步: plan
    ```

---

## 验证

- [ ] `tsc --noEmit` 通过
- [ ] `vitest run` 全部通过
- [ ] `blueprint continue change fix-ship-command` 输出正确
- [ ] `blueprint continue`（无参数）行为不变
