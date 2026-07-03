# Change Summary: fix-phase-researcher

> **完成日期**: 2026-06-30
> **Change 类型**: feat

---

## Intent

项目调研（项目级技术选型）、codebase 映射（存量代码分析）和阶段调研（实现方案调研）是三个不同的职责，但之前共用同一个 `blueprint-researcher` agent。缺少专门的阶段调研 agent 和对应的输出模板。

本变更为 3-way 拆分：

| agent | 方向 | 模板 | 触发 |
|-------|------|------|------|
| `blueprint-researcher` | 项目技术选型 | codebase/stack/architecture/pitfalls | `/blueprint:research` |
| `blueprint-codebase-mapper` | 存量代码分析 | codebase/map | `blueprint init --brownfield` |
| `blueprint-phase-researcher` | 阶段实现方案 | research/phase-research.md | `/blueprint:research-phase` |

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/public/templates/agents/phase-researcher.md` | 创建 | 阶段调研 agent 定义：角色约束、输入、执行流程、验证标准 |
| `src/public/templates/research/phase-research.md` | 创建 | 阶段调研模板：摘要、标准技术栈、架构模式、常见陷阱、代码示例、包审核 |
| `src/commands/blueprint-template.ts` | 修改 | `TEMPLATE_TYPES` 注册 `phase-research` → `research/phase-research.md` |
| `src/generators/omp-agents.ts` | 修改 | `AGENT_DEFS` 新增 `phase-researcher`（tools: read/grep/glob/lsp/web_search/write/bash, thinkingLevel: high） |
| `src/public/templates/commands/research-phase.md` | 修改 | 命令描述从 `blueprint-researcher` 改为 `blueprint-phase-researcher`，新增 `blueprint template phase-research` 使用说明 |
| `tests/integration/e2e.test.ts` | 修改 | agent 数量断言从 8 → 9 |

## 关键决策

- **3-way 职责拆分**：从单一研究员拆为项目级（researcher）、存量代码（codebase-mapper）、阶段级（phase-researcher），各自输出不同模板，避免职责混用
- **phase-researcher 专注实现方案**：输入是 context.md 的 locked decisions + discretion area，不探索已被锁定的方案，产出可操作的实现指引而非备选方案穷举
- **thinkingLevel: high**：阶段调研需要综合多个输入源（context.md、项目级 research/、specs/）并做技术判断，设为最高推理级别
- **web_search 工具**：phase-researcher 是少数配置了 web_search 的 agent，允许在调研中查阅外部技术资料
- **phase-research.md 模板含包审核表**：除常规的摘要/技术栈/架构/陷阱外，增加包审核 section，要求每次调研审核依赖包

## 验证结果

| 检查项 | 结果 |
|--------|------|
| vitest run | ✅ 79/79 passed |
| npm run build | ✅ 77KB dist |
| `blueprint template phase-research` 输出模板 | ✅ |
| `blueprint update` 生成 9 个 agent | ✅ |
| research-phase command 引用 phase-researcher | ✅ |
| AGENT_DEFS 含 phase-researcher | ✅ |
