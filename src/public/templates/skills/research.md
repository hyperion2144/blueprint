# 项目技术调研工作流指引

## 概述

对项目涉及的技术方向进行并行多方向调研。产出数据驱动的选型对比报告，为 roadmap 和后续 phase 提供技术基础。

Research 由 specwf-researcher agent 在独立上下文中并行执行。

## 前置条件

- 已完成 grill，proposal.md 已确认
- 确定了 2-5 个需要调研的方向

## 执行步骤

### 1. 确定调研方向

从 proposal.md 提取需要调研的技术决策点，例如：
- 框架选择（如 Express vs Fastify vs Hono）
- 数据库选择（如 PostgreSQL vs SQLite）
- 部署方案（如 Docker vs 无服务器）
- 关键库/工具评估（如 zod vs valibot 等）

列出每个方向的候选方案（2-4 个候选）。

### 2. 并行调研（fan-out）

每个方向由独立 researcher agent 执行：
\`\`\`
task agent: specwf-researcher × N
\`\`\`

每个 researcher 的 assignment 包含：
- **方向**：要调研的技术决策
- **候选方案**：要对比的选项
- **评估维度**：功能满足度、性能、社区活跃度、学习曲线、生态集成、许可证
- **交付要求**：写入 specwf/research/<direction>/stack.md

### 3. 汇总调研结果

收集所有 researcher 的产出，检查：
- 所有方向是否有推荐方案和理由
- 候选方案对比表是否完整
- 已知的 caveat 和陷阱是否记录
- 推荐方案是否相互兼容

### 4. 更新 proposal.md

将调研结论的关键决策追加到 proposal.md 的「技术倾向」部分，添加 \`[RESEARCHED]\` 标记。

## 产物

- \`specwf/research/<direction>/stack.md\` — 每个方向的方案对比和推荐
- \`specwf/research/<direction>/pitfalls.md\` — 已知陷阱和注意事项
- \`specwf/research/summary.md\` — 汇总决策表

## 验证

- [ ] 每个调研方向至少有两个候选方案的对比
- [ ] 推荐方案都有明确理由
- [ ] 已知陷阱已记录
- [ ] 推荐的多个方案之间兼容性已检查
- [ ] proposal.md 已更新调研结论

## 常见陷阱

- 避免只调研一个方案（确认偏差）
- 避免过度调研 — 设定每个方向 10-20 条有效信息来源的上限
- 注意许可证兼容性（GPL/AGPL vs MIT/Apache）
- 框架的版本号重要 — 确认调研的是最新稳定版
- 团队熟悉度是合法因素，在推荐理由中记录

## 参考

- GSD Core 的 research phase 路线
- OpenSpec 的 stack.md 模板