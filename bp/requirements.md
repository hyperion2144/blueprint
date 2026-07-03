# Requirements

## 概述

构建 blueprint — 一个独立 TypeScript CLI 包，为 AI 编码 agent 提供规格驱动的开发工作流。融合 OpenSpec（CLI 架构/change 结构）、GSD Core（milestone/phase/并行执行）、Trellis（spec 注入/代码认知回灌）的核心能力。

## 核心决策（21 项，grill 产出）

### 形态与实现

1. **项目形态**: 独立 TypeScript CLI 包，agent 纯编排、每步回调 CLI
2. **实现策略**: 全新构建，镜像 OpenSpec 架构模式，按需 vendoring OpenSpec+GSD 的 MIT 模块，Trellis 仅参考概念（AGPL-3.0 不拷代码）
3. **项目名称**: blueprint

### 实体层级与流程

4. **实体层级**: 4 层 — Project → Milestone（恒存）→ Phase → Change
5. **流程结构**: 双循环嵌套 — Phase 循环（discuss→research→split→change循环→ship）⊃ Change 循环（plan→apply→review→verify→archive）
6. **产物目录**: 嵌套式 `blueprint/`（非隐藏），change 放在 `milestones/<ms>/phases/<ph>/changes/<name>/` 下
7. **临时 change**: 根级 `blueprint/changes/<name>/`，与阶段无关，直接走 Change 循环

### Spec 管理

8. **spec 范围**: 分层 — `specs/`（行为契约，SHALL/MUST + GIVEN/WHEN/THEN，有 delta 机制）+ `conventions/`（项目约定，直接编辑，无 delta）
9. **spec 更新**: delta-spec（plan 阶段预写，archive 时确定性合并）+ 代码提取（archive 时子代理从 diff 提取行为/约束回灌 specs/）双保险
10. **spec 自动注入**: `blueprint context <step>` 输出当前步骤上下文清单（相关 specs + conventions），agent 按清单读取

### 架构

11. **三层架构**: CLI（产物管理，bash 调用）+ slash commands（工作流触发，prompt 模板）+ skills（工作流指引，模型按需 read）+ task 子代理（重活 fan-out）
12. **多平台**: CLI 生成平台特定文件（`.omp/commands/` + `.omp/agents/` + `skills/`），先 OMP 后 Claude Code

### Change 并行与 TDD

13. **change 并行**: 依赖图并行 — split 产出依赖图，无依赖的 change 用 OMP isolated 模式并行走循环，有依赖的串行
14. **TDD 强制**: 按 type 区分 — `type:behavior` 走 RED→GREEN→REFACTOR，`type:config/refactor/docs/scaffolding` 跳过

### Review 与 Verify

15. **review 门控**: 全部通过才进 verify（三重 review：规格/质量/目标，batch tasks[3] 并行，可配置降级）
16. **verify 回环**: 计划缺陷→回 plan 重设计；实现缺陷→回 apply 重实现；规格缺陷→标记 spec 待修回 plan

### Config

17. **profile**: 三档 lite/standard/strict，默认 standard。profile 聚合常见配置组合（workflow toggles + 模型映射）

### onboarding 与 ship

18. **存量 onboarding**: codebase mapping（产出技术现状）+ spec bootstrap（提取行为契约）并行
19. **ship**: 两级 — ship phase（PR + STATE 更新）+ ship milestone（release tag + PROJECT 版本）

### 自动推进

20. **continue**: `/blueprint:continue` 读 state.md，状态机确定下一步，自动触发对应 slash command

### 子代理

21. **子代理**: 6 个 agent（researcher/planner/executor/reviewer/verifier/archiver），按工作流角色定义，按职责区分工具集，profile 预设模型 + 按步骤角色覆盖

## 功能需求

### CLI 命令

| 命令 | 作用 |
|---|---|
| `blueprint init` | 初始化 blueprint/ 目录结构 + 生成平台文件 |
| `blueprint update` | 重新生成平台命令文件（slash commands + skills + agents） |
| `blueprint config [set]` | 查看/修改配置 |
| `blueprint state` | 查看当前状态 |
| `blueprint context <step>` | 输出步骤上下文清单（spec 注入） |
| `blueprint continue` | 状态机推进 + 输出下一步 |
| `blueprint archive <change>` | 归档（delta 合并 + 代码提取回灌） |
| `blueprint list` | 列出 milestones/phases/changes |
| `blueprint template <type>` | 生成模板文件 |

### Slash 命令

| 命令 | 步骤 | 子代理 |
|---|---|---|
| `/blueprint:init` | 项目初始化 | ✓ codebase+spec 并行（存量） |
| `/blueprint:grill` | 需求探讨 | - |
| `/blueprint:research` | 项目调研 | ✓ 并行多方向 |
| `/blueprint:roadmap` | 路线图 | - |
| `/blueprint:discuss` | Phase 讨论 | - |
| `/blueprint:research-phase` | Phase 调研 | ✓ 并行 |
| `/blueprint:split` | Change 拆分 | - |
| `/blueprint:plan` | Change 设计 | ✓ 可并行 |
| `/blueprint:apply` | 实现 | ✓ 分组并发 |
| `/blueprint:review` | 审查 | ✓ 三重并行 |
| `/blueprint:verify` | 验证 | ✓ 可并行 |
| `/blueprint:archive` | 归档 | - |
| `/blueprint:ship` | 交付 | - |
| `/blueprint:continue` | 自动推进 | - |

### 子代理 Agent 定义

| Agent | 职责 | 工具集 | 模型角色 | thinkingLevel |
|---|---|---|---|---|
| blueprint-researcher | 技术调研 | read,grep,glob,lsp,web_search,write,bash | research | high |
| blueprint-planner | Change 设计 | read,grep,glob,lsp,write,bash | plan | high |
| blueprint-executor | 代码实现 | read,edit,write,bash,grep,glob,lsp,ast_grep,ast_edit | execute | medium |
| blueprint-reviewer | 三重审查 | read,grep,glob,lsp,ast_grep,bash | review | high |
| blueprint-verifier | 测试验证 | read,bash,grep,glob,lsp,edit,write | verify | medium |
| blueprint-archiver | 归档 | read,grep,glob,write,bash,edit | archive | - |

### Profile 模型映射

| 角色 | lite | standard | strict |
|---|---|---|---|
| research | default | slow | slow:high |
| plan | default | slow | slow:high |
| execute | default | default | slow |
| review | default | slow | slow:high |
| verify | default | default | slow |
| archive | smol | default | default |

## 非目标

- 不做多 IDE 集成（仅 CLI + agent 命令文件）
- 不做在线协作（blueprint/ 目录本地，git 版本控制）
- 不复制 Trellis 代码（AGPL-3.0 许可证约束）
- 不做 spec 可视化 dashboard（CLI 优先）
