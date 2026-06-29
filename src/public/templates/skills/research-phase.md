# Phase 调研工作流指引

## 概述

对单个 Phase 的实现路径进行技术调研。与项目级 research 不同，phase research 聚焦于具体的实现选择 —— 库的用法、API 设计模式、性能调优策略、已知坑点等。

调研由 specwf-researcher agent 在独立上下文中并行执行。

## 前置条件

- context.md 已记录本次 phase 的决策
- 确定了需要调研的技术问题（1-3 个方向）

## 执行步骤

### 1. 提取调研问题

从 context.md 和相关的 specs 中提取需要调研的具体问题：
- 某个库的特定用法
- 某类问题的模式或最佳实践
- 框架的功能边界和限制
- 性能基准数据

### 2. 执行调研（可并行）

每个问题由 researcher agent 独立调研：
\`\`\`
task agent: specwf-researcher
\`\`\`

调研内容：
- 阅读官方文档和 API 参考
- 检查社区实践和已知陷阱
- （可选）验证关键假设 —— 写最小原型测试
- 产出 RESEARCH.md

### 3. 更新 context.md

将调研结论的记录 \`[RESEARCHED]\` 标记追加到 context.md：
- 推荐的实现路径
- 已知陷阱和规避方法
- 推荐使用的库版本和配置

## 产物

- \`specwf/research/ph-<name>/RESEARCH.md\` — Phase 调研报告
- \`specwf/context.md\`（更新，追加调研结论）

## 验证

- [ ] 所有调研问题都有答案
- [ ] 有推荐的实现路径
- [ ] 已知陷阱和规避方法
- [ ] 不遗漏关键依赖项

## 常见陷阱

- 不要只调研「怎么做成」，还要调研「怎么做对」
- 如果调研发现某个技术选型不可行，立即在 context.md 记录并通知
- 调研结果要可操作 —— 不是知识收集，是为了指导代码
- 最小原型对验证关键假设最有效，但不应对原型做重构

## 参考

- GSD Core 的 phase research 路线
- context.md 格式