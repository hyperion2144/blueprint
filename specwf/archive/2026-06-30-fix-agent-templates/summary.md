# Change Summary: fix-agent-templates

## 描述

为所有 agent 输出文档提供可填写的模板文件，agent 通过 `specwf template <type>` 获取模板；
新增 codebase-mapper 和 spec-bootstrapper 两个 agent；所有现有 agent 说明中标注模板引用。

## 产出文件

### 新建
- `templates/codebase/stack.md` — 技术栈模板
- `templates/codebase/architecture.md` — 架构模板
- `templates/codebase/conventions.md` — 代码规范模板
- `templates/codebase/pitfalls.md` — 陷阱风险模板
- `templates/specs/spec.md` — BOOTSTRAPPED 行为契约规格模板
- `agents/codebase-mapper.md` — 存量代码分析 agent
- `agents/spec-bootstrapper.md` — 规格启动 agent

### 修改
- `agents/researcher.md` — 产物要求加模板引用
- `agents/planner.md` — 产物要求加模板引用
- `agents/executor.md` — 产物要求加模板引用
- `agents/reviewer.md` — 产物要求加模板引用
- `agents/verifier.md` — 产物要求加模板引用
- `agents/archiver.md` — 产物要求加模板引用
- `commands/specwf-template.ts` — 注册 codebase/specs 新模板类型
- `generators/omp-agents.ts` — AGENT_DEFS +2, thinkingLevel +2

### 测试相关
- `tests/e2e.test.ts` — agent 计数 6→8

## 关键决策

- agent 通过 `specwf template <type>` 命令获取模板内容（或直接读 `templates/` 目录文件）
- 模板中的 `{{placeholder}}` 替换为实际内容
- 新增模板类型映射：`codebase-stack` / `codebase-architecture` / `codebase-conventions` / `codebase-pitfalls` / `spec-bootstrap`

## 验证

- [x] vitest run 通过（79/79，1.2s）
- [x] npm run build 通过（76KB）
- [x] `.omp/agents/` 有 8 个 agent 文件
- [x] `specwf template codebase-stack` 可输出模板
- [x] `specwf template codebase-architecture` 可输出模板
- [x] `specwf template codebase-conventions` 可输出模板
- [x] `specwf template codebase-pitfalls` 可输出模板
- [x] `specwf template spec-bootstrap` 可输出模板
- [x] `specwf update` 生成 40 个文件
- [x] 新 agent 模板文件存在
