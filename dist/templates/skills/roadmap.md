# 路线图工作流指引

## 概述

将项目拆分为 Milestone 和 Phase 两个层级。Milestone 是长期里程碑（通常 1-3 个月），Phase 是 Milestone 内的开发阶段（通常 1-2 周）。

路线图基于 proposal.md 和 research 产出，输出可执行的阶段规划。

## 前置条件

- 已完成 grill
- （可选）已完成 research —— 调研结果指导技术栈拆分
- 对项目范围有清晰共识

## 执行步骤

### 1. 定义 Milestone

按功能领域或发布节奏划分里程碑。每个 milestone 应有：
- **名称**：简短标识（如 \`M1-core\`）
- **目标**：一个句子描述的里程碑目标
- **范围**：包含和不包含的功能
- **成功标准**：可测量的完成条件
- **预估时长**：1-3 个月

示例：
\`\`\`
M1 — Core Infrastructure
目标：搭建基础 CLI 框架 + spec 管理系统
范围：init/grill/research/roadmap/.../archive 完整循环
时长：6 周
\`\`\`

### 2. 为每个 Milestone 拆分 Phase

每个 milestone 包含 3-8 个 phase：
\`\`\`
<ms-name>
├── ph.1 基础搭建
├── ph.2 核心功能 A
├── ph.3 核心功能 B
├── ph.4 集成测试
└── ph.5 文档和完善
\`\`\`

每个 Phase 定义：
- **名称**（ph.N-<name>）
- **目标**
- **依赖**（依赖的技术或前置 phase）
- **输入**（specs 文件、conventions、设计文档）
- **输出**（代码、specs 更新、文档）
- **预估 Change 数**

### 3. 验证里程碑覆盖

逐项检查 proposal.md 的「范围」是否被 Milestone 和 Phase 完整覆盖：
- 没有遗漏的功能
- 依赖关系合理
- Phase 之间的依赖不形成循环

### 4. 产出 ROADMAP.md

\`\`\`markdown
# <项目> 路线图

## Milestone 概览

| Milestone | 目标 | Phase 数 | 时长 |
|---|---|---|---|

## M1 — <名称>
<Milestone 目标>

### Phase 列表

| Phase | 目标 | 依赖 | 预估 Change 数 |
|---|---|---|---|

### ph.1 <名称>
<详细说明>
\`\`\`

## 产物

- \`specwf/ROADMAP.md\` — 完整的路线图文档

## 验证

- [ ] 所有 proposal.md 范围被覆盖
- [ ] Phase 之间的依赖不循环
- [ ] 每个 Phase 有可验证的成功标准
- [ ] 路线图长度合理（3-15 个 Phase 总）

## 常见陷阱

- 不要把 Phase 拆得太细 — 每个 phase 至少能产出可演示的成果
- 第一个 Phase 应该是最小可行路径，不是最复杂的
- 不要忽略集成和文档 phase
- Phase 的先后依赖不要过于乐观 — 列清楚前置条件

## 参考

- GSD Core 的 roadmap 方法
- 产品路线图最佳实践（outcome-focused）