# Proposal: fix-continue-args

---

## Intent

`specwf continue` 当前不接受参数，只能从当前 state 的 active_context 推断下一步。对于 adhoc change 或想检查其他 change/milestone/phase 进度时完全不可用。例如 adhoc change 创建后 status 为 `proposal`，但 `specwf continue` 只看 milestone 层状态（shipped），永远看不到 adhoc 的下一步。

本变更为 feature enhancement，目标是让 `specwf continue` 支持指定目标，输出特定实体的下一步。

---

## Scope

### In scope

- `specwf continue`（无参数）— 保持现有行为不变
- `specwf continue change <name>` — 输出指定 change 的下一步（查 state.changes 和 state.adhoc 的状态）
- `specwf continue milestone <name>` — 输出指定 milestone 的下一步
- `specwf continue phase <name>` — 输出指定 phase 的下一步
- 输出格式与无参数版本一致（当前位置 + 当前步骤 + 推荐的下一步）

### Out of scope

- 不自动推进状态（continue 是只读的，只输出建议）
- 不修改状态机转移表
- 不涉及 `specwf state set-step` 等状态变更命令

---

## Approach

给 `specwf continue` 添加可选参数：

```bash
specwf continue                    # 当前行为：从 active_context 推断
specwf continue change <name>      # 查 changes/adhoc 数组中的状态
specwf continue milestone <name>   # 查 milestone 状态
specwf continue phase <name>       # 查 phase 状态
```

实现思路（`src/core/continue.ts`）：

1. 无参数 → 调用 `determineFromState(state)`（当前逻辑不变）
2. `change <name>` → 在 state.changes 和 state.adhoc 中查找 name → 取 status → 用状态机查下一步
3. `milestone <name>` → 查 milestones/ 目录 → 推断状态 → 查下一步
4. `phase <name>` → 查 milestones/*/phases/<name> → 推断状态 → 查下一步

---

## Must-haves

- `specwf continue change fix-ship-command` 显示 `proposal` 状态的下一步（plan）
- `specwf continue`（无参数）行为与之前一致
- 指定不存在的 change/milestone/phase 输出明确错误信息
- 现有测试全部通过

---

## Non-goals

- 不自动切换 active_context
- 不改状态机（state-machine.ts / state.ts 的转移表）
