# 测试验证工作流指引

## 概述

在 Review 通过后，对实现进行完整的测试验证。Verify 负责确保代码正确运行、所有场景覆盖，并处理回环路由 —— 根据缺陷类型路由到不同的修复阶段。

## 前置条件

- review 阶段已通过（三重审查全部 PASS 或 gate 条件满足）
- 测试套件完整（包括 RED 阶段写的测试）

## 执行步骤

### 1. 运行完整测试套件

\`\`\`
# 运行所有测试
bun run test

# 运行类型检查
bun run typecheck

#（可选）运行集成测试
bun run test:integration
\`\`\`

### 2. 测试覆盖率分析

分析测试覆盖缺口：
- delta-specs 中每个 SHALL/MUST 是否有测试
- 正常路径覆盖
- 边界路径覆盖
- 异常路径覆盖

### 3. 人工检查点验证

逐项检查 tasks.md 中每个任务的完成标准：
\`\`\`
- [ ] 所有 type:behavior 验证通过
- [ ] 所有非 TDD 任务验证通过
- [ ] 无回归（已有测试通过）
- [ ] 代码未破坏依赖项
\`\`\`

### 4. 诊断失败（如有）

如果任何测试失败或验证不通过：

**根因诊断**：
1. 确定失败是测试问题还是实现问题
2. 明确缺陷的类型（见下方路由规则）
3. 在 VERIFICATION.md 中记录根因

### 5. 回环路由

根据缺陷类型路由到不同阶段：

\`\`\`
# 路由规则

## 计划缺陷 → 回 plan 重设计
触发条件：
- delta-specs 中的场景在代码中无法实现（设计不合理）
- design.md 的方案有架构缺陷
- 依赖关系在 split 时未正确识别
- 拆分的 tasks 粒度不合理

行为：
1. 标记缺陷类型为 PLAN
2. 记录问题和修改建议
3. 输出 \`路由目标: plan\`
4. 不修代码，回 plan 更新 design.md / tasks.md / delta-specs

## 实现缺陷 → 回 apply 重实现
触发条件：
- 测试失败（实现未满足 delta-spec）
- 代码逻辑错误
- 类型错误
- 性能不达标
- 缺少边界处理

行为：
1. 标记缺陷类型为 IMPLEMENTATION
2. 记录根因和具体位置（文件+行号）
3. 输出 \`路由目标: apply\`
4. 回 apply 修复实现

## 规格缺陷 → 标记 spec 待修（回 plan）
触发条件：
- delta-specs 本身不合理或矛盾
- 现有 specs/ 被违反但 delta-specs 未覆盖
- 场景遗漏（关键路径缺少 spec 定义）
- spec 与需求矛盾

行为：
1. 标记缺陷类型为 SPEC
2. 记录问题描述和修复建议
3. 输出 \`路由目标: plan（spec 待修）\`
4. 在 specs/ 中标记 \`[TODO: FIX SPEC]\`
5. 回 plan 修正规格
\`\`\`

### 6. 产出 VERIFICATION.md

\`\`\`markdown
# Change: <名称> — 验证报告

## 测试结果
- 单元测试: 通过 / 失败（N/N）
- 类型检查: 通过 / 失败
- 集成测试: 通过 / 失败（可选）

## 覆盖率
- 正常路径: N/N
- 边界路径: N/N
- 异常路径: N/N

## 路由决策
- 状态: passed | replan | reapply
- 路由目标: （通过时不填）
- 缺陷类型: PLAN | IMPLEMENTATION | SPEC
- 根因: ...
\`\`\`

## 产物

- \`changes/<change-name>/VERIFICATION.md\` — 验证报告

## 验证

- [ ] 测试套件全部通过（passed 时）
- [ ] delta-specs SHALL/MUST 全覆盖
- [ ] tasks.md 完成标准全通过
- [ ] VERIFICATION.md 路由决策清晰

## 常见陷阱

- 不要自己修发现的问题 — 路由是给主流程的信号，不是直接在 verify 中修改代码
- 不要混淆缺陷类型 —「这代码写错了」是 IMPLEMENTATION，「这规格就不对」是 SPEC
- 如果多个缺陷属于不同类型，按优先级最高的路由
- 不要只跑单元测试 — 集成测试才能暴露接口交互问题
- 路由前确认缺陷确实可重现，不是测试环境配置问题

## 参考

- GSD Core 的 verify phase 回环机制
- OpenSpec 的 verification 模板