# Phase 调研

对当前 Phase 的实现路径进行调研，回答"要规划好这个阶段需要知道什么"。由 specwf-phase-researcher agent 负责调研，产出 RESEARCH.md 供 planner 使用。

| | |
|---|---|
| **描述** | Phase 调研 — 技术选择 + 架构模式 + 实现路径 + 陷阱识别 |
|**子代理**|派发 specwf-phase-researcher 子代理，调研当前 Phase 的实现路径，产出 research.md|
| **产出** | `research.md`（阶段调研报告） |
| **产出模板** | `specwf template phase-research` |
| **上下文** |
| **参数** | `[phase <name>]` — 指定 Phase。不传时查看当前 milestone 待处理 phase。 | `specwf context research-phase` + `specwf state` |
| **推进** | `specwf continue` |
|| **引用技能** | `skills/specwf-research-phase/SKILL.md` |

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前处于 research-phase 阶段。运行 `specwf continue` 校验前置条件。

### 步骤 2：获取上下文

```bash
specwf context research-phase
```

读取输出的文件清单。


## 子代理

### 子代理类型

`specwf-phase-researcher`（完整 system prompt 见 `.omp/agents/specwf-phase-researcher.md`）

### 子代理提示词结构

派发时，提示词应包括：

```
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

【产出】
- research.md（模板: specwf template phase-research）
```

## 上下文

```bash
specwf context research-phase
specwf state
```

`specwf context research-phase` 输出当前 Phase 上下文：
- `context.md` — Phase 的实现决策（locked decisions 必须遵守，discretion 可自由探索）
- `research/` — 项目级已有调研结果
- 相关 `specs/` — 规格约束

`specwf state` 显示状态机当前位置，确保调研方向与当前 Phase 一致。

## 调研流程

### 1. 获取模板

```bash
specwf template phase-research > milestones/<ms>/phases/<ph>/research.md
```

### 2. 阅读输入

- 读取 `context.md`，提取 locked decisions 和 discretion area
- 阅读项目级 `research/` 了解已有技术选型
- 读取相关 `specs/` 了解规格约束

### 3. 执行调研

- 按 context.md 决策范围确定调研方向
- **locked decisions**：只写实现指引，不质疑
- **discretion area**：调研并推荐最优路径
- 识别常见陷阱和风险

### 4. 产出 research.md

填写模板 `phase-research`，包含：

| 章节 | 内容 | 要求 |
|------|------|------|
| 摘要 | 执行摘要 + 一行主要推荐 | 2-3 段 |
| 标准技术栈 | 核心库/工具 + 辅助工具 + 备选方案对比 | 每项含版本、用途、推荐理由 |
| 架构模式 | 推荐架构、模块划分、关键接口 | 含 ASCII 架构图 |
| 常见陷阱 | 已知问题和缓解方案 | 至少 3 条 |
| 代码示例 | 关键模式代码片段 | 至少 2 段 |
| 包审核 | 依赖包审核结果 | 标注 ✅ / ⚠ |

- 每项推荐标注置信度（high / medium / low）
- 所有产出使用中文

## 验证标准

执行完成后确认：

- [ ] 所有 locked decisions 在调研中遵守（不探索替代方案）
- [ ] 每个推荐标注置信度（high/medium/low）
- [ ] 包含代码示例（不少于 2 段）
- [ ] 常见陷阱列表包含至少 3 条
- [ ] 产出已写入 `research.md`

## 下一步

```bash
specwf continue
```

然后根据输出的"推荐下一步"执行对应操作。

```bash
# 例: 输出 → 下一步: grill
# 则执行 .omp/commands/specwf-grill.md
```

`specwf continue` 读取 state.md，状态机推进到 split/plan 阶段，planner 使用 research.md 作为设计输入。

## 参考
