# Proposal: fix-phase-researcher

---

## Intent

项目调研、codebase 映射、阶段调研是三个不同的职责，但目前共用同一个 `blueprint-researcher` agent。缺少专门的阶段调研 agent 和对应的输出模板。

本变更为：
1. 新增 `blueprint-phase-researcher` agent — 阶段级调研，面向实现方案
2. 新建 `templates/research/phase-research.md` 模板
3. 注册 `blueprint template phase-research`
4. 更新 `/blueprint:research-phase` 命令模板引用新 agent

---

## Scope

| 项目 | 操作 |
|------|------|
| `templates/research/phase-research.md` | 创建（模板） |
| `agents/phase-researcher.md` | 创建（agent 定义） |
| `commands/research-phase.md` | 更新（引用新 agent） |
| `skills/research-phase.md` | 更新（引用新 agent） |
| `src/generators/omp-agents.ts` | AGENT_DEFS + thinkingLevel 加新 agent |
| `src/commands/blueprint-template.ts` | TEMPLATE_TYPES 加 phase-research |

---

## 三分职责

| agent | 方向 | 模板 | 触发 |
|-------|------|------|------|
| `blueprint-researcher` | 项目技术选型 | codebase/stack/architecture/pitfalls | `/blueprint:research` |
| `blueprint-codebase-mapper` | 存量代码分析 | codebase/stack/architecture/conventions/pitfalls | `blueprint init --brownfield` |
| `blueprint-phase-researcher` | 阶段实现方案 | research/phase-research.md | `/blueprint:research-phase` |
