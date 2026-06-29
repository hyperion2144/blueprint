# Change 拆分工作流指引

## 概述

将 Phase 的工作拆分为多个可并行（或有序）执行的 Change。每个 Change 是独立可验证的工作单元，有明确的输入输出和被测试场景覆盖。

拆分产出依赖图，支持三种并行策略：串行、依赖图并行、流水线并行。

## 前置条件

- context.md 已完成
- phase 的 scope 和接口边界明确

## 执行步骤

### 1. 识别独立工作单元

从 phase 的 scope 中识别可独立实现和验证的功能单位：
- 每个 change 对应一个完整的功能切面
- 不跨 change 共享未完成的代码（除非依赖图明确）
- 每个 change 有明确的可验证结果

### 2. 建立依赖关系

绘制 change 之间的依赖图：
\`\`\`
Change A ──→ Change B ──→ Change C
                  ↓
            Change D ──→ Change E
\`\`\`

依赖类型：
- **数据依赖**：B 依赖 A 的数据结构
- **接口依赖**：D 依赖 B 的接口
- **顺序依赖**：C 必须在 B 之后（但不需要 B 的产出物）

### 3. 为每个 Change 准备 skeleton

每个 change 的目录：
\`\`\`
changes/<change-name>/
├── proposal.md       # 当前 change 的需求范围
├── specs/
│   └── <domain>/
│       └── spec.md   # delta-specs（初始空，plan 阶段写）
├── design.md         # （plan 阶段产出）
├── tasks.md          # （plan 阶段产出）
├── reviews/          # （review 阶段产出）
└── VERIFICATION.md   # （verify 阶段产出）
\`\`\`

proposal.md 内容：
\`\`\`markdown
# Change: <名称>

## 目标
## 范围
## 依赖（前置 change 列表）
## 关键接口（输入/输出/副作用）
## 测试场景清单
\`\`\`

### 4. 确认并行策略

根据 change 依赖图配置并行策略：

- **serial**: 所有 change 串行（依赖图全序）
- **dependency-graph**: 无依赖的 change 并行，有依赖的串行（默认推荐）
- **pipeline**: 按依赖深度分层，同层并行、异层流水线

## 产物

- \`changes/<change-name>/proposal.md\` — 每个 change 的定义
- \`changes/<change-name>/specs/\` — 每个 change 的 delta-specs 目录（初始空）
- 依赖图（在 conversation 中记录，不生成独立文件）

## 验证

- [ ] 每个 change 有明确的可验证结果
- [ ] 依赖图无循环
- [ ] 变更范围不重叠
- [ ] 所有 phase scope 被覆盖
- [ ] 依赖关系合理（无缺少的依赖）

## 常见陷阱

- change 太大 → 超出 review 合理范围（建议单个 change ≤ 400 行 diff）
- change 太小 → 上下文切换成本高于并行收益
- 不要「偷渡」未计划的改动到一个 change 中
- 依赖图不要太深（3 层以上意味着拆分粒度需要调整）
- 如果不确定独立程度，宁拆大不拆小

## 参考

- OpenSpec 的 change 结构设计
- GSD Core 的 dependency-graph 并行策略