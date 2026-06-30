# 初始化项目

运行 `specwf init` 创建 specwf/ 目录结构、项目配置和状态机文件。这是整个工作流的起点。

## Subagent

**新项目**：无需子代理，CLI 直接创建目录结构和配置文件。

**存量项目（brownfield）**：使用 `--brownfield` 模式，CLI 创建目录结构后，agent 通过 `task` 工具 fan-out 两个 subagent 并行执行：

```bash
specwf init --brownfield
```

| Agent | 职责 | 产出 |
|-------|------|------|
| `specwf-codebase-mapper` | 分析技术栈、架构、代码规范、风险 | `research/stack.md`、`architecture.md`、`pitfalls.md`、`codebase-conventions.md` |
| `specwf-spec-bootstrapper` | 从核心模块签名/注释/测试提取行为契约 | `specs/<domain>/spec.md`（标记 `BOOTSTRAPPED`） |

并行任务详情：

1. **Codebase Mapping**（`specwf-codebase-mapper`）— 分析技术栈、模块结构、依赖关系
2. **Spec Bootstrap**（`specwf-spec-bootstrapper`）— 从核心模块提取行为契约

## 产出

CLI 生成的基础结构：

| 产出 | 模板参考 | 说明 |
|------|----------|------|
| `specwf/` 目录结构 | 无模板（CLI 生成） | 项目骨架：project.yml、changes/、research/、milestones/ |
| `specwf/project.yml` | `specwf template project.yml` | 项目工作流配置（profile、workflow 开关、review gate） |
| `specwf/state.md` | `specwf template state` | 多层级状态机文件（project → milestone → phase → change） |
| `.omp/commands/specwf-*.md` | 无模板（CLI 生成） | 14 个 Slash Command 平台注册文件 |
| `skills/specwf-*/SKILL.md` | 无模板（CLI 生成） | 各步骤 agent skill 指引 |
| `.omp/agents/specwf-*.md` | 无模板（CLI 生成） | Agent 角色定义文件 |

brownfield 模式额外产出（由两个 subagent 并行生成）：

| 产出 | 模板参考 | 说明 |
|------|----------|------|
| `specwf/research/stack.md` | `specwf template codebase-stack` | 技术栈分析与选型推荐 |
| `specwf/research/architecture.md` | `specwf template codebase-architecture` | 存量项目架构分析 |
| `specwf/research/pitfalls.md` | `specwf template codebase-pitfalls` | 已知陷阱与风险记录 |
| `specwf/conventions/codebase-conventions.md` | `specwf template codebase-conventions` | 存量项目代码规范 |
| `specwf/specs/<domain>/spec.md` | `specwf template spec-bootstrap` | 领域行为契约（标记 BOOTSTRAPPED） |

## 上下文

```bash
specwf context init
specwf state
```

可参考 `@specwf/conventions/coding.md`。

## 推进

完成后：

```bash
specwf continue
```

## 参考技能

- `skills/specwf-init/SKILL.md` — 项目初始化完整流程指引、目录结构规范、配置项说明
