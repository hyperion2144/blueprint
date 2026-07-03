# Proposal: fix-state-preconditions

---

## Intent

当前状态转移（step advance / set-milestone / set-phase / archive）不检查前置条件。CLI 可以随意推进状态，即使必要文档不存在或还是模板空壳。OMP command 模板也没有指引 agent 使用 CLI 来推进状态。

本变更为系统性改进，目标是：
1. 所有状态转移命令增加前置条件校验
2. OMP command/skill 模板明确指引 agent 用 CLI 推进状态
3. `blueprint continue` 输出包含前置条件检查

---

## Scope

### In scope

**CLI 前置校验**（`src/core/state-validator.ts` 新增模块）：
- `blueprint state set-step <step>` 校验当前状态到目标状态的转移是否满足前置条件
- 校验规则：必要文件存在、文件内容非模板空壳（不包含 `{{` 占位符）、spec/requirements 有实际内容
- 校验失败时输出具体缺失项，不修改状态

**受影响的命令**：
- `blueprint state set-step <step>` — 所有步骤推进都走校验
- `blueprint state set-milestone <id>` — 检查 roadmap 中该 milestone 已定义
- `blueprint state set-phase <id>` — 检查 phase 在 roadmap 中已定义
- `blueprint archive <change>` — 检查 verify 已完成

**OMP 模板更新**：
- 所有 command 模板在"下一步"部分增加 `blueprint continue` / `blueprint state set-step` 指引
- 明确说明：状态必须通过 CLI 推进，不能手动编辑 state.md

### Out of scope

- 不修改状态机转移表（transitions 本身不变）
- 不涉及 git 操作校验
- 不涉及 npm publish 校验

---

## Approach

新增 `src/core/state-validator.ts`，导出一个 `validateTransition(from: string, to: string, blueprintDir: string)` 函数：

```
validateTransition(currentStatus, nextStep, blueprintDir) → { valid: boolean, errors: string[] }
```

每条状态转移的校验规则定义在规则表中：
- milestone-active → requirements-defined: requirements.md 存在且不含 `{{`
- requirements-defined → researching: research/ 目录存在且有内容
- researching → researched: research/summary.md 存在且不含 `{{`
- researched → roadmap-defined: roadmap.md 存在且有 phase 定义
- roadmap-defined → phase-discuss: 当前 milestone 有至少一个 phase
- phase-discuss → phase-research: context.md 存在
- phase-research → phase-split: research.md 存在
- 等等

---

## Must-haves

- `blueprint state set-step discuss̀` 当 requirements.md 不存在时报错
- `blueprint state set-milestone m2` 当时 roadmap.md 中 m2 未定义时报错
- 校验错误输出具体缺失项（如"requirements.md 不存在"或"requirements.md 内容为模板，请填写后重试"）
- 校验通过时正常修改状态
- OMP command 模板的"下一步"包含 `blueprint state set-step` 指引

---

## Non-goals

- 不自动创建缺失文件
- 不修改状态机转移定义
- 不改变现有的 `blueprint continue` 输出格式
