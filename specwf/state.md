---
project:
  name: specwf
  status: milestone-shipped
  current_milestone: m1-core
  current_phase: null
active_context:
  type: milestone
  ref: milestones/m1-core
  step: shipped
changes:
  - name: scaffold-project
    status: archived
    depends_on: []
  - name: define-types
    status: archived
    depends_on:
      - scaffold-project
  - name: implement-parsers
    status: archived
    depends_on:
      - define-types
  - name: config-state
    status: archived
    depends_on:
      - implement-parsers
  - name: core-engines
    status: archived
    depends_on:
      - config-state
  - name: implement-command-generator
    status: archived
    depends_on:
      - core-engines
  - name: implement-agent-generator
    status: archived
    depends_on:
      - implement-command-generator
  - name: implement-skill-generator
    status: archived
    depends_on:
      - implement-agent-generator
  - name: implement-init
    status: archived
    depends_on:
      - implement-skill-generator
  - name: implement-update
    status: archived
    depends_on:
      - implement-init
  - name: implement-context-continue
    status: archived
    depends_on: []
  - name: implement-archive
    status: archived
    depends_on: []
  - name: implement-list-template
    status: archived
    depends_on: []
  - name: fix-generator-architecture
    status: archived
    depends_on: []
  - name: integration-tests
    status: archived
    depends_on: []
  - name: brownfield-init
    status: archived
    depends_on: []
  - name: npm-publish-config
    status: archived
    depends_on: []
adhoc:
  - name: bootstrap-specwf
    status: archived
    depends_on: []
---

# specwf — 状态机

## 当前位置

**项目层**: Milestone 1 (m1-core) — CLI 核心可用，已发布 v0.1.0
**当前 Milestone**: m1-core（已 shipped）
**当前 Phase**: 无（所有 Phase 已完成）
**当前 Step**: milestone-shipped

## 状态机

### 项目层状态机

```
initialized → requirements-defined → researched → roadmap-defined
    → milestone-active → project-done / project-paused / project-aborted
```

### Phase 层状态机

```
discuss → research → split → [change执行循环] → ship
                                   ↓
               plan → apply → review → verify → archive
                                    ← replan ←
                                    ← reapply ←
```

### Change 层状态机

```
planned → applying → applied → reviewing → verifying → archived
                         ↑← reapply  ←  ←  ←  ←
```

### 当前状态

- **项目状态**: milestone-shipped
- **Milestone 状态**: m1-core — 已完成（v0.1.0 released）
- **Phase 状态**: 6 个 Phase 全部 shipped
- **Change 状态**: 17 个 Change 全部 archived

## 变更列表 (Changes)

全部 17 个 Change 已归档，涵盖 6 个 Phase：

| Phase | Change ID | 描述 | 状态 |
|-------|-----------|------|------|
| 1 — 项目骨架 + 类型 + 解析层 | scaffold-project | npm 项目初始化 + 构建配置 | archived |
| 1 | define-types | TypeScript 类型定义 | archived |
| 1 | implement-parsers | YAML/frontmatter/heading-tree/spec 解析器 | archived |
| 2 — 配置 + 状态机 | config-state | project.yml 读写 + 状态机 | archived |
| 2 | core-engines | continue 逻辑 + state-file | archived |
| 3 — 核心引擎 | implement-command-generator → implement-skill-generator | context/delta-merge/code-extract 引擎（与后续合并） | archived |
| 4 — 平台生成器 | implement-command-generator | OMP 14 命令生成 | archived |
| 4 | implement-agent-generator | OMP 6 agent 生成 | archived |
| 4 | implement-skill-generator | OMP 14 skill 生成 | archived |
| 5 — CLI 命令层 | implement-init | init 命令 + 交互向导 | archived |
| 5 | implement-update | update 命令 | archived |
| 5 | implement-config-state | config + state 命令 | archived |
| 5 | implement-context-continue | context + continue 命令 | archived |
| 5 | implement-archive | archive 命令（delta 合并 + 回灌） | archived |
| 5 | implement-list-template | list + template 命令 | archived |
| 5 | fix-generator-architecture | 生成器从内联重写为模板文件驱动（4516 → 390 行） | archived |
| 6 — 集成验证 | integration-tests | 端到端集成测试 | archived |
| 6 | brownfield-init | 存量项目 init 模式 | archived |
| 6 | npm-publish-config | 发布配置 + README | archived |

## 临时变更 (Ad-hoc)

| ID | 描述 | 状态 | 关联 Phase |
|----|------|------|-----------|
| bootstrap-specwf | 用 specwf 自身工作流自举项目结构 | archived | 全流程验证 |

## 历史

- **2026-06-29** — init: 创建 specwf 项目结构
- **2026-06-29** — research: 技术栈选型完成（commander/yaml(eemeli)/gray-matter/zod/vitest/tsup）
- **2026-06-29** — roadmap: m1-core × 6 Phase × 21 Change 拆分完成
- **2026-06-29** — Phase 1 shipped: 项目骨架 + 类型 + 解析层
- **2026-06-29** — Phase 2 shipped: 配置 + 状态机
- **2026-06-29** — Phase 3 shipped: 核心引擎
- **2026-06-29** — Phase 4 shipped: 平台生成器（34 文件）
- **2026-06-29** — Phase 5 shipped: CLI 命令层（9 子命令）
- **2026-06-29** — Phase 6 shipped: 集成验证 + brownfield + npm 配置
- **2026-06-29** — m1-core 全部 Change archived（17/17）
- **2026-06-29** — milestone shipped: m1-core v0.1.0 标签已创建，Release 已发布
- **2026-06-29** — 仓库创建: https://github.com/hyperion2144/specwf

## 状态变更检查清单

### milestone 启动前
- [x] 前一 milestone 已 ship（项目第一个）
- [x] roadmap 已定义
- [x] 资源/成员已就位

### phase 启动前
- [x] 当前 milestone 中无冲突 phase
- [x] 依赖的前置 phase 已完成

### phase split → apply
- [x] 所有 Change 已定义
- [x] Change 依赖图已确认无环
- [x] 每个 Change 都有 spec 和 plan

### change apply → review
- [x] 所有 task 已实现并提交
- [x] RED→GREEN→REFACTOR 循环完整（behavior 类型）
- [x] 类型检查通过（tsc --noEmit）
- [x] 测试通过（vitest run）

### change review → verify
- [x] 三重审查全部 PASS
- [x] 无未关闭的 reapply 标记

### change verify → archive
- [x] 验证报告已生成
- [x] 无打开的 replan/reapply 回环
- [x] 代码认知已提取（archive 时触发 delta-spec 合并）

### phase ship 前
- [x] 所有 Change 已 archived
- [x] phase summary 已生成
- [x] 文档已更新

---

*state.md 由 specwf 自动管理。不要手动编辑 frontmatter 的缩进和层级结构。*
