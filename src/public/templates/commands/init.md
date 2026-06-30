# 初始化项目

运行 `specwf init` 创建 specwf/ 目录结构、项目配置和状态机文件。这是整个工作流的起点。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前处于 init 阶段。运行 `specwf continue` 校验前置条件。

### 步骤 2：获取上下文

```bash
specwf context init
```

读取输出的文件清单。


## 子代理

### 新项目

无需子代理，CLI 直接创建目录结构和配置文件。

### 存量项目（brownfield）

使用 `--brownfield` 模式。CLI 创建目录结构后，派发两个子代理并行执行。

#### Agent 1: specwf-codebase-mapper

派发 `specwf-codebase-mapper` 子代理（完整 system prompt 见 `.omp/agents/specwf-codebase-mapper.md`）。

提示词内容：

```text
子代理类型: specwf-codebase-mapper
描述: 代码库映射 — 分析存量项目技术栈、架构、代码规范、风险

【项目上下文】
- 从 project.yml 获取项目名称和 profile
- 从 project.md 获取项目描述
- 扫描代码库目录结构

【本次职责】
- 分析技术栈 → research/stack.md（模板: specwf template codebase-stack）
- 分析架构 → research/architecture.md（模板: specwf template codebase-architecture）
- 分析代码规范 → conventions/codebase-conventions.md（模板: specwf template codebase-conventions）
- 识别风险 → research/pitfalls.md（模板: specwf template codebase-pitfalls）

【约束条件】
- 所有产物写入 specwf/ 目录
- 只读分析，不修改代码
- 文件路径使用小写
```

#### Agent 2: specwf-spec-bootstrapper

派发 `specwf-spec-bootstrapper` 子代理（完整 system prompt 见 `.omp/agents/specwf-spec-bootstrapper.md`）。

提示词内容：

```text
子代理类型: specwf-spec-bootstrapper
描述: 规格启动 — 从存量项目代码签名、注释和测试中提取行为契约

【项目上下文】
- 从 project.yml 获取项目名称和 profile
- 扫描 src/ 识别核心模块和领域

【本次职责】
- 从核心模块提取行为契约 → specs/<domain>/spec.md（模板: specwf template spec-bootstrap）
- 标记每个条目的置信度（high/medium/low）
- 标注来源文件路径和行号

【约束条件】
- 提取的内容标注 BOOTSTRAPPED 标记
- 置信度 low 的条目需标注需人工确认
- 只读分析，不修改代码
- 文件路径使用小写
```

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

完成后运行 `specwf continue`，根据输出的"推荐下一步"执行对应操作。

```bash
specwf continue
# → 输出: 推荐下一步: grill
# → 执行 .omp/commands/specwf-grill.md
```

## 参考技能

- `skills/specwf-init/SKILL.md` — 项目初始化完整流程指引、目录结构规范、配置项说明
