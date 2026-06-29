# Change 设计工作流指引

## 概述

对单个 Change 进行详细设计：产出技术方案（design.md）、实现清单（tasks.md）和 delta-specs（规范预先写好的行为契约）。

PLAN 是 Change 循环的起点，决定了后续实现和审查的质量。PLAN 做得好，apply 和 review 就流畅。

## 前置条件

- change 的 proposal.md 已确认
- context.md 中相关的实现决策已记录
- 相关的 specs/ 和 conventions/ 已读取

## 执行步骤

### 1. 读取上下文

运行 \`specwf context plan\` 获取当前步骤的上下文清单：
- 相关的 specs/ 文件
- conventions/ 文件
- context.md
- 外部依赖文档

逐个读取列出的文件。

### 2. 设计技术方案 — design.md

\`\`\`markdown
# Change: <名称> — 技术方案

## 概述
## 架构变化
### 新增模块
### 修改模块
### 删除模块

## 数据模型
### 新增类型
### 修改类型

## 接口设计
### 新增接口
### 修改接口

## 关键算法 / 流程
## 异常处理
## 测试策略
## 风险评估
\`\`\`

### 3. 编写 delta-specs

在 \`changes/<change>/specs/<domain>/spec.md\` 中预先写本次 change 的行为契约：

\`\`\`markdown
# <domain> 规格

## SHALL
- SHALL <条件>: <预期行为>
  场景: <GIVEN/WHEN/THEN>

## MUST
- MUST <约束条件>
  场景: ...
\`\`\`

**delta-spec 规则**：
- 只写本次 change 引入或修改的行为
- 用 SHALL/MUST 表达强制规范
- 每个条目附带 GIVEN/WHEN/THEN 场景
- 格式遵循 \`SHALL <条件>: <预期行为>\`
- 明确引用变更的 spec ID（如有）
- 覆盖正常路径、边界路径、异常路径

### 4. 拆分为 tasks — tasks.md

\`\`\`markdown
# Change: <名称> — 实现任务

## type:behavior（需走 TDD 循环）
1. [ ] RED: <失败的测试>
   - GREEN: <最小实现>
   - REFACTOR: <重构目标>
2. [ ] RED: ...

## type:config（跳过 TDD）
1. [ ] 配置文件: ...

## type:refactor（跳过 TDD）
1. [ ] 重构: ...

## type:docs（跳过 TDD）
1. [ ] 文档: ...

## type:scaffolding（跳过 TDD）
1. [ ] 脚手架: ...
\`\`\`

**TDD 协议（强制）**：
- \`type:behavior\` 任务必须走 RED→GREEN→REFACTOR 三步
- 每个 RED 任务必须有可运行的失败测试
- GREEN 是使测试通过的最小实现
- REFACTOR 不改变行为，只改进结构
- \`type:config/refactor/docs/scaffolding\` 跳过 RED→GREEN→REFACTOR

### 5. plan-checker 验证

运行 plan-checker 自动验证：
- [ ] 所有 tasks 标注了 type
- [ ] type:behavior 任务有完整的 RED→GREEN→REFACTOR 三元组
- [ ] delta-specs 覆盖了 proposal.md 中所有的 must_haves
- [ ] 与 context.md 中的决策无矛盾（drift check）
- [ ] 依赖图完整（跨 change 的 key_links 已标注）
- [ ] 每个任务有明确的完成标准

## 产物

- \`changes/<change-name>/design.md\` — 技术方案设计
- \`changes/<change-name>/tasks.md\` — 实现任务清单（含 TDD 标注）
- \`changes/<change-name>/specs/<domain>/spec.md\` — delta-specs

## 验证

- [ ] plan-checker 输出 PASS
- [ ] 所有 must_have 被 tasks 覆盖
- [ ] delta-specs 使用 SHALL/MUST 格式
- [ ] type:behavior 任务有完整的 RED→GREEN→REFACTOR
- [ ] design.md 与 context.md 的决策一致

## 常见陷阱

- delta-specs 不能写成实现细节（如「调用 X 函数」），而是行为契约（如「当 X 条件满足时返回 Y」）
- 不要跳过 type:behavior 的 RED 阶段 — TDD 的关键是测试先行
- tasks.md 粒度适中：每个任务在 15-60 分钟内完成
- 如果 change 太大无法清晰拆分 tasks，考虑回到 split 重新拆分
- delta-specs 覆盖异常路径 — 只写 happy path 等于没写

## 参考

- TDD (Test-Driven Development) by Kent Beck
- GSD Core 的 plan phase
- OpenSpec 的 delta-spec 格式
- spec-checker 验证清单