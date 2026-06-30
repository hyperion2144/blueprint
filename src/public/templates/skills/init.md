# 项目初始化工作流指引

## 概述

初始化 specwf 项目结构。这是整个工作流的起点，负责创建 specwf/ 目录骨架、specs/ 和 conventions/ 目录、project.yml 配置文件，以及平台命令/agent/skill 文件。

对于存量项目，同时执行 codebase mapping 和 spec bootstrap 两个并行任务，从已有代码中提取行为契约。

## 前置条件

- 项目根目录已初始化 git 仓库
- 确定 project.yml 配置内容（profile、workflow 开关等）

## 执行步骤

### 1. 创建目录结构

创建以下目录层级：
\`\`\`
specwf/
  project.yml          # 项目配置
  changes/             # 临时 change
  research/            # 调研产出
milestones/
  <ms-name>/
    ph/
      <ph-name>/
        changes/
          <change-name>/
            specs/     # delta-specs
            design.md
            tasks.md
            reviews/
            VERIFICATION.md
conventions/           # 项目约定（按需手写）
specs/                 # 全局行为契约
  <domain>/
    spec.md            # SHALL/MUST + GIVEN/WHEN/THEN
\`\`\`

### 2. 生成 project.yml

\`\`\`yaml
version: 1
platform:
  - omp
  - claude-code
profile: standard  # lite | standard | strict
context: project   # project | milestone | phase
workflow:
  research: true
  plan_check: true
  tdd: true
  triple_review: true
  auto_advance: true
  spec_injection: true
review:
  gate: all-pass    # all-pass | severity | report-only
  parallel: true
change:
  parallel: serial  # serial | dependency-graph | pipeline
  isolation: false
git:
  branching: none   # none | phase | milestone
  create_tag: false
conventions:
  inject: true
models: {}
\`\`\`

### 3. 生成平台文件

运行 \`specwf init\` 自动生成：
- \`.omp/commands/specwf-<step>.md\` — 14 个 slash command
- \`skills/specwf-<step>/SKILL.md\` — 14 个 skill 指引
- \`.omp/agents/specwf-<role>.md\` — 6 个 agent 定义

### 4. 存量项目：并行引导（可选）

如果目标项目已有代码，执行两个并行任务：

**任务 A — Codebase Mapping**
- 分析技术栈和架构
- 梳理模块结构和依赖关系
- 产出 specwf/research/stack.md + architecture.md

**任务 B — Spec Bootstrap**
- 从核心模块的函数签名和注释提取行为契约
- 写入 specs/<domain>/spec.md（标记 \`# BOOTSTRAPPED\`）
- 从测试文件推断端到端场景

## 产物

- \`specwf/\` 目录结构完整
- \`specwf/project.yml\` 配置文件
- 平台文件已生成（.omp/ + skills/）
- 存量项目额外产出：stack.md + architecture.md + 初始 specs/

## 验证

- [ ] specwf/ 目录存在且结构完整
- [ ] project.yml 可被 loadConfig 读取
- [ ] 平台文件各目录非空
- [ ] （存量）stack.md + architecture.md 已生成

## 常见陷阱

- 不要将 specwf/ 目录放在 .gitignore 中（它承载项目元数据）
- 存量项目的 spec bootstrap 是估算，后续在 plan 的 delta-spec 中精化
- conventions/ 需要人工编写，不自动生成

## 参考

- OpenSpec 的目录结构设计
- GSD Core 的新项目初始化流程
- Trellis 的 spec bootstrap 概念仅作参考（AGPL-3.0 不拷代码）