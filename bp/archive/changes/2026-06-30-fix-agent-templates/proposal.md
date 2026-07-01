# Proposal: fix-agent-templates

---

## Intent

现有 agent 的"产物要求"只有文字描述，没有指定输出文件格式模板。子代理不知道用哪个模板、如何获取模板内容。同时缺少 codebase-mapper 和 spec-bootstrapper 两个新 agent。

本变更为系统性改进，目标是：
1. 为所有输出文档提供可填写的模板文件
2. 每个 agent 的说明中标注使用哪个模板、如何获取
3. 新增 codebase-mapper 和 spec-bootstrapper 两个 agent
4. 模板文件通过 `specwf template` 命令可获取

---

## Scope

### In scope

**新模板文件（5 个）**：
- `src/public/templates/codebase/stack.md` — 技术栈模板
- `src/public/templates/codebase/architecture.md` — 架构模板
- `src/public/templates/codebase/conventions.md` — 代码规范模板
- `src/public/templates/codebase/pitfalls.md` — 陷阱风险模板
- `src/public/templates/specs/spec.md` — 行为契约模板（BOOTSTRAPPED）

**新 agent 定义（2 个）**：
- `specwf-codebase-mapper` — 存量代码分析 agent
- `specwf-spec-bootstrapper` — 规格启动 agent

**已有 agent 更新（6 个）**：
- 每个 agent 的 `## 产物要求` 标注对应模板文件和获取方式
- 获取方式：通过 `specwf template <type>` 命令读取模板

**CLI 更新**：
- `src/commands/specwf-template.ts` 注册新模板类型

**对 agent 行为的要求**：
- agent 在产出文件时，先执行 `specwf template <type>` 获取模板内容
- 或者读取 `templates/` 目录下的模板文件
- 模板中的 `{{placeholder}}` 替换为实际内容

---

## Approach

### 模板获取方式

每个 agent 的说明中添加：

```
## 产物要求

使用以下模板文件。所有模板可通过 `specwf template <type>` 获取，
或在目录中直接读取 `templates/codebase/<name>.md`。

### stack.md（模板: codebase/stack）
- 使用 `specwf template codebase-stack` 获取模板
- 或读取 `templates/codebase/stack.md`
- 替换模板中的 `[占位符]` 为实际内容
```

### 模板注册

`specwf template <type>` 扩展新类型：
- `codebase-stack` / `codebase-architecture` / `codebase-conventions` / `codebase-pitfalls`
- `spec-bootstrap`

### Agent 注册

`src/generators/omp-agents.ts` 的 `AGENT_DEFS` 新增 2 个条目。
