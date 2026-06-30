# Phase 讨论工作流指引

## 概述

为当前 Phase 做详细的实现决策讨论。这是进入技术实现前的最后一道设计关卡 — 确定 Phase 的目标、范围、设计方案和实现决策，产出 context.md 作为后续所有 change 的决策依据。

Discuss 不直接产出代码，但它决定了后续 coding 的质量和方向。

## 前置条件

- 路线图 roadmap.md 已确定
- 当前 phase 的依赖 phase 已完成
- 相关的 specs 和 conventions 已就位

## 执行步骤

### 1. 确定 Phase 范围和边界

- 回顾 roadmap.md 中当前 phase 的描述
- 确认 phase 的输入和输出
- 明确与其他 phase 的接口边界

### 2. 讨论技术决策

逐项讨论以下决策，每项达成共识后记录：

**架构决策**
- 模块划分和分层
- 接口设计模式
- 数据流方向

**技术实现决策**
- 关键数据结构
- 异常处理策略
- 测试策略

**质量要求**
- 性能指标
- 安全要求
- 可维护性要求

### 3. 记录 context.md

将讨论结果写入 \`specwf/context.md\`：

\`\`\`markdown
# Phase: <名称>

## 目标
## 范围
## 架构决策
- ADR-001: <决策项>
  - 上下文: ...
  - 决策: ...
  - 理由: ...

## 接口契约
## 数据模型
## 关键实现约束
## 测试要求
## 未解决问题
\`\`\`

如果 context.md 已存在，追加或更新当前 phase 的部分。

### 4. 识别灰色地带

对尚未明确的决策点标记 \`[TODO: discuss]\`，可以先搁置但需记录：
- 不确定的点
- 需要进一步调研的领域
- 可以延后决定的事项

## 产物

- \`specwf/context.md\`（更新）— 实现决策文档

## 验证

- [ ] 所有架构决策都有记录和理由
- [ ] 接口边界清晰
- [ ] 灰色地带已标记
- [ ] context.md 与 roadmap.md 不矛盾

## 常见陷阱

- 不要跳过「看起来简单」的决策 — 记录所有选择
- 如果决策依赖未完成的 phase，标记为 \`[DEFERRED]\`
- 避免过度设计 — 只讨论当前 phase 需要的决策
- 如果反复无法达成决策，使用 specwf-advisor agent 提供建议

## 参考

- ADR（Architecture Decision Record）模式
- GSD Core 的 discuss 工作流
- OpenSpec 的 context.md 格式