# 初始化项目

运行 `specwf init` 创建 specwf/ 目录结构、项目配置和状态机文件。这是整个工作流的起点。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前状态是否可执行本步骤。

### 步骤 2：获取上下文

```bash
specwf context init
```

读取输出的文件清单。

### 步骤 3：执行初始化

```bash
specwf init --yes
```

CLI 自动创建：
- `specwf/` 目录结构
- `specwf/project.yml` — 项目工作流配置
- `specwf/state.md` — 状态机文件
- `.omp/commands/specwf-*.md` — 14 个 Slash Command
- `.omp/agents/specwf-*.md` — 9 个 Agent 定义
- `.omp/skills/specwf-*/SKILL.md` — 14 个 Skill 指引

### 步骤 4：存量项目（brownfield）

已有代码的项目使用 `--brownfield` 模式：

```bash
specwf init --yes --brownfield
```

CLI 创建目录结构后，派发两个子代理并行执行。

**Agent 1: specwf-codebase-mapper**（完整 system prompt 见 `.omp/agents/specwf-codebase-mapper.md`）

提示词内容：

```text
子代理类型: specwf-codebase-mapper
描述: 代码库映射 — 分析存量项目技术栈、架构、代码规范、风险

【项目上下文】从 project.yml 获取项目名称和 profile，扫描代码库目录结构
【本次职责】分析技术栈 → research/stack.md、架构 → research/architecture.md、代码规范 → conventions/codebase-conventions.md、风险 → research/pitfalls.md
【约束条件】只读分析，不修改代码，文件路径小写
```

**Agent 2: specwf-spec-bootstrapper**（完整 system prompt 见 `.omp/agents/specwf-spec-bootstrapper.md`）

提示词内容：

```text
子代理类型: specwf-spec-bootstrapper
描述: 规格启动 — 从存量项目代码签名、注释和测试中提取行为契约

【项目上下文】从 project.yml 获取项目名称，扫描 src/ 识别核心模块
【本次职责】提取行为契约 → specs/<domain>/spec.md，标记置信度，标注来源
【约束条件】标注 BOOTSTRAPPED，低置信度条目需人工确认，只读分析
```

### 步骤 5：推进

```bash
specwf continue
```

进入需求探讨阶段（grill）。

---

## 产出

| 产出 | 说明 |
|------|------|
| specwf/ 目录结构 | 项目骨架 |
| specwf/project.yml | 工作流配置 |
| specwf/state.md | 状态机文件 |
| platform 文件 | commands + agents + skills |

brownfield 额外：research/stack.md、architecture.md、pitfalls.md、conventions/codebase-conventions.md、specs/<domain>/spec.md

## 参考

技能文件：`.omp/skills/specwf-init/SKILL.md`
