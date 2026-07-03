# Design: Agent 生成器

## 目标

实现 OMP agent 定义文件生成器，从 project.yml 读取配置，生成 .omp/agents/blueprint-<role>.md（6 个 agent）。

## 实现要点

- AGENT_DEFS 定义 6 个角色（researcher/planner/executor/reviewer/verifier/archiver）
- resolveAgentModel 从 profile + project.yml models 解析 model 字段
- generateAgent 生成单个 agent 文件 frontmatter + systemPrompt body
- 与 command 生成器共用 resolveModels 逻辑

## 文件

src/generators/omp-agents.ts（与 commands 同 phases 实现）
