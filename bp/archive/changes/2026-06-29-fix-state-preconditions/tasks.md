# Tasks: fix-state-preconditions

---

## TDD type 标注规则

| type | 含义 | TDD 协议 |
|------|------|---------|
| `behavior` | 业务行为 | RED→GREEN→REFACTOR |
| `refactor` | 内部改进 | 先验证已有测试 → 修改 → 再次验证 |
| `config` | 配置文件 | 直接实现 |

---

## Wave 1: 校验引擎 + 命令集成

- [ ] task-1: [type:behavior] `validateTransition` 校验函数
  - **description**: 创建 `src/core/state-validator.ts`，定义校验规则表，实现 `validateTransition(from, to, specwfDir)`。检查文件存在、非模板空壳、目录非空等条件
  - **files**: `src/core/state-validator.ts`
  - **acceptance**: `validateTransition('milestone-active', 'requirements-defined', dir)` 当 requirements.md 不存在时返回 valid=false + 错误列表
  - ***RED 测试***:
    ```
    GIVEN specwf 目录中无 requirements.md
    WHEN validateTransition('milestone-active', 'requirements-defined', dir)
    THEN 返回 { valid: false, errors: ["requirements.md 不存在"] }
    ```

- [ ] task-2: [type:refactor] set-step 集成校验
  - **description**: `specwf-state.ts` 的 `setStep` 函数在 `updateState` 前调用 `validateTransition`。校验不通过时输出错误并 return，不修改状态
  - **files**: `src/commands/specwf-state.ts`
  - **acceptance**: `specwf state set-step grill` 当 requirements.md 为空时输出错误，状态不改变

- [ ] task-3: [type:refactor] set-milestone 校验
  - **description**: `setMilestone` 检查 roadmap.md 中该 milestone 是否定义（含 `## Milestone <id>` heading）
  - **files**: `src/commands/specwf-state.ts`
  - **acceptance**: `specwf state set-milestone m3` 当 roadmap.md 没有 m3 时报错

- [ ] task-4: [type:refactor] set-phase 校验
  - **description**: `setPhase` 检查该 phase 在 roadmap.md 中是否定义（当前 milestone 的 `### Phase <id>` heading）
  - **files**: `src/commands/specwf-state.ts`
  - **acceptance**: `specwf state set-phase phase-99` 当 roadmap 中无此 phase 时报错

---

## Wave 2: OMP command 模板更新

- [ ] task-5: [type:config] 所有 command 模板的"下一步"增加 CLI 指引
  - **description**: 每个 command 模板在"下一步"部分增加 `specwf state set-step <step>` 指引，明确告知 agent 必须通过 CLI 推进状态，不能手动编辑 state.md
  - **files**: `src/public/templates/commands/*.md`
  - **acceptance**: 每个 command 模板的"下一步"包含 `specwf state set-step` 或 `specwf continue`

---

## 验证

- [ ] `vitest run` 全部通过
- [ ] `tsc --noEmit` 通过
- [ ] `specwf state set-step discuss` 在 requirements.md 不存在时报错
- [ ] `specwf state set-step discuss` 在 requirements.md 正常时通过
- [ ] `specwf state set-milestone m3` 在 roadmap 中无定义时报错
