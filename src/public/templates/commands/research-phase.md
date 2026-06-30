# Phase 调研

对当前 Phase 的实现路径进行调研，回答"要规划好这个阶段需要知道什么"。由 specwf-phase-researcher agent 负责调研。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前状态是否可执行本步骤。

### 步骤 2：获取上下文

```bash
specwf context research-phase
```

读取输出的文件清单，包括 `context.md`（locked decisions）、`research/`（已有技术选型）、`specs/`（规格约束）。

### 步骤 3：获取模板

```bash
specwf template phase-research > milestones/<ms>/phases/<ph>/research.md
```

### 步骤 4：派发子代理调研

派发 `specwf-phase-researcher` 子代理（完整 system prompt 见 `.omp/agents/specwf-phase-researcher.md`）。

提示词内容：

```text
子代理类型: specwf-phase-researcher
描述: 阶段调研 — 调研当前 Phase 实现路径，产出 research.md

【项目上下文】
- 从 context.md 提取 locked decisions 和 discretion area
- 从项目级 research/ 了解已有技术选型
- 从 specs/ 了解规格约束

【本次职责】
- 对 locked decisions：只写实现指引，不探索替代方案
- 对 discretion area：调研并推荐最优路径
- 识别常见陷阱和风险（至少 3 条）
- 包含代码示例（至少 2 段）
```

research.md 应包含：摘要、标准技术栈（含备选方案对比）、架构模式（含 ASCII 架构图）、常见陷阱（至少 3 条）、代码示例（至少 2 段）、包审核。

每项推荐标注置信度（high / medium / low）。

### 步骤 5：推进

```bash
specwf continue
```

planner 使用 research.md 作为设计输入。

---

## 参数

```
[phase <name>]
```

不传时查看当前 milestone 的待处理 phase。

## 产出

| 文件 | 模板 |
|------|------|
| milestones/<ms>/phases/<ph>/research.md | specwf template phase-research |

## 参考

技能文件：`.omp/skills/specwf-research-phase/SKILL.md`
