# Change 实现工作流指引

## 概述

按 tasks.md 实现代码。TDD 强制执行：type:behavior 任务必须走 RED→GREEN→REFACTOR 循环。

Apply 阶段由 specwf-executor agent 在隔离环境中执行，支持多任务分组并发和原子提交。

## 前置条件

- plan 阶段已完成，tasks.md、design.md、delta-specs 已就位
- specwf context apply 已获取上下文
- 隔离环境已准备（git worktree 或 OMP isolated mode）

## 执行步骤

### 1. 读取上下文

运行 \`specwf context apply\`：
- design.md — 技术方案
- tasks.md — 实现清单
- delta-specs — 行为契约
- 依赖的 specs/ — 已有全局规范

### 2. 分组执行

根据 tasks.md 中的依赖关系分组，每组作为一次提交（或一组相关提交）：

**组内串行**：依赖关系强制顺序
**组间并行**：无依赖的任务由不同 executor agent 并行执行

\`\`\`
# 分组示例
Group 1（并行）: task A, task B（无依赖）
├── task A → 代码 + 测试 → commit
└── task B → 代码 + 测试 → commit

Group 2（串行）: task C → task D
├── task C → 代码 + 测试 → commit
└── task D → 代码 + 测试 → commit
\`\`\`

### 3. TDD 执行流程（type:behavior 任务）

每个 type:behavior 任务严格执行：

**RED — 写失败测试**
\`\`\`
1. 根据 delta-spec 的 SHALL/MUST 条目编写测试
2. 测试应该明确断言行为契约
3. 运行测试 → 预期失败（红色）
4. 提交消息格式: \`test(<domain>): add failing test for <feature>\`
\`\`\`

**GREEN — 最小实现**
\`\`\`
1. 写恰好让测试通过的最少量代码
2. 不要过度工程，不要提前优化
3. 运行测试 → 预期通过（绿色）
4. 提交消息格式: \`feat(<domain>): implement <feature>\`
\`\`\`

**REFACTOR — 重构改进**
\`\`\`
1. 在测试保护下重构代码结构
2. 测试应该仍然通过
3. 提交消息格式: \`refactor(<domain>): improve <aspect>\`
4. REFACTOR 不改变行为，不修改测试
\`\`\`

### 4. 原子提交协议

每个任务完成后执行原子提交：

\`\`\`
# 提交原则
- 每个提交是一个逻辑单元，可独立 review
- RED/GREEN/REFACTOR 每个阶段至少一个提交
- 不混合不同任务的改动在一个提交中
- 提交消息使用 Conventional Commits 格式

# 提交消息格式
<type>(<scope>): <description>

[optional body — why]
\`\`\`

### 5. 非 TDD 任务（type:config/refactor/docs/scaffolding）

直接实现，单次提交即可：
\`\`\`
chore(config): add ESLint rule for ...
docs(api): add JSDoc to ...
refactor(core): extract validateInput helper
\`\`\`

### 6. 各组完成检查

每组完成后运行：
- [ ] 所有测试通过
- [ ] 代码风格一致（运行 formatter）
- [ ] delta-specs 中的每个 SHALL/MUST 有对应测试覆盖
- [ ] 无 lint 错误
- [ ] 无死代码/注释掉的代码

## 产物

- 实现代码（按 design.md 和 delta-specs）
- 测试代码（type:behavior 任务）
- 原子提交记录

## 验证

- [ ] 所有 type:behavior 任务已完成 RED→GREEN→REFACTOR
- [ ] 所有非 TDD 任务已实现
- [ ] 所有测试通过
- [ ] 每个 delta-spec 的 SHALL/MUST 有对应测试
- [ ] 代码无 lint/类型错误

## 常见陷阱

- GREEN 阶段只做「恰好通过」的实现 — 不要提前写 REFACTOR 的内容
- 不要在 RED 和 GREEN 之间插入无关改动
- 不要跳过 RED 直接写实现 — 先写测试再写代码
- 如果测试无法先写（IO 密集型、UI 代码），标注为 \`type:refactor\` 或 \`type:scaffolding\`
- 一个提交涵盖多个不相关改动 → 无法原子回滚
- 跨 change 共享代码使用依赖约定或 key_links，不要复制粘贴

## 参考

- TDD (Test-Driven Development) by Kent Beck
- Conventional Commits 规范
- GSD Core 的 execute phase
- OpenSpec 的 atomic commit 协议