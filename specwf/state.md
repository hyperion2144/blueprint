---
project:
  name: specwf
  status: change-reviewing
  current_milestone: m2-claude-code
  current_phase: null
active_context:
  type: project
  ref: null
  step: change-reviewing
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
  - name: fix-ship-command
    status: archived
    depends_on: []
  - name: fix-continue-args
    status: archived
    depends_on: []
  - name: fix-state-overwrite
    status: archived
    depends_on: []
  - name: fix-state-tracking
    status: archived
    depends_on: []
  - name: ci-npm-publish
    status: archived
    depends_on: []
  - name: fix-state-machine-adhoc
    status: archived
    depends_on: []
  - name: fix-template-content
    status: archived
    depends_on: []
  - name: fix-milestone-transitions
    status: archived
    depends_on: []
  - name: fix-state-preconditions
    status: archived
    depends_on: []
  - name: fix-agent-templates
    status: archived
    depends_on: []
  - name: fix-change-summary
    status: archived
    depends_on: []
  - name: fix-phase-researcher
    status: archived
    depends_on: []
  - name: fix-milestone-archive
    status: archived
    depends_on: []
  - name: fix-command-templates
    status: archived
    depends_on: []
  - name: fix-archive-structure
    status: archived
    depends_on: []
  - name: fix-subagent-instructions
    status: archived
    depends_on: []
  - name: fix-command-params
    status: archived
    depends_on: []
  - name: refactor-templates-i18n
    status: archived
    depends_on: []
  - name: update-conventions
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

## 变更列表

全部 17 个 Change 已归档，涵盖 6 个 Phase：

| Phase | Change ID | 描述 | 状态 |
|-------|-----------|------|------|
| 1 — 项目骨架 + 类型 + 解析层 | scaffold-project | npm 项目初始化 + 构建配置 | archived |
| 1 | define-types | TypeScript 类型定义 | archived |
| 1 | implement-parsers | YAML/frontmatter/heading-tree/spec 解析器 | archived |
| 2 — 配置 + 状态机 | config-state | project.yml 读写 + 状态机 | archived |
| 2 | core-engines | continue 逻辑 + state-file | archived |
| 3 — 核心引擎 | implement-command-generator → implement-skill-generator | context/delta-merge/code-extract 引擎 | archived |
| 4 — 平台生成器 | implement-command-generator | OMP 14 命令生成 | archived |
| 4 | implement-agent-generator | OMP 6 agent 生成 | archived |
| 4 | implement-skill-generator | OMP 14 skill 生成 | archived |
| 5 — CLI 命令层 | implement-init | init 命令 + 交互向导 | archived |
| 5 | implement-update | update 命令 | archived |
| 5 | implement-config-state | config + state 命令 | archived |
| 5 | implement-context-continue | context + continue 命令 | archived |
| 5 | implement-archive | archive 命令 | archived |
| 5 | implement-list-template | list + template 命令 | archived |
| 5 | fix-generator-architecture | 生成器内联→模板文件驱动 | archived |
| 6 — 集成验证 | integration-tests | 端到端集成测试 | archived |
| 6 | brownfield-init | 存量项目 init 模式 | archived |
| 6 | npm-publish-config | 发布配置 + README | archived |

## 临时变更

| ID | 描述 | 状态 | 关联 Phase |
|----|------|------|-----------|
| bootstrap-specwf | 用 specwf 自身工作流自举项目结构 | archived | 全流程验证 |
| fix-ship-command | 修复 ship 输出内容太薄 | proposal | m1-core |
| fix-continue-args | `specwf continue` 支持 change 子命令 | archived | m1-core |
| fix-state-overwrite | `saveState` 写入时覆盖 body | archived | m1-core |
| fix-state-tracking | 归档时未更新 adhoc 状态 | archived | m1-core |

## 历史

- **2026-06-29** — init: 创建 specwf 项目结构
- **2026-06-29** — research: 技术栈选型完成
- **2026-06-29** — roadmap: m1-core × 6 Phase × 21 Change 拆分完成
- **2026-06-29** — Phase 1~6 陆续 shipped
- **2026-06-29** — m1-core 全部 Change archived（17/17）
- **2026-06-29** — milestone shipped: m1-core v0.1.0
- **2026-06-29** — 仓库创建: https://github.com/hyperion2144/specwf
- **2026-06-29** — adhoc changes 创建: fix-ship-command, fix-continue-args, fix-state-overwrite
- **2026-06-29** — v0.2.1 released: 状态校验 + continue 输出增强 + 多项修复
- **2026-06-29** — fix-state-overwrite archived: `saveState` 写入时保留现有 body
- **2026-06-29** — fix-state-tracking archived: `specwf archive` 同时检查 state.adhoc
- **2026-06-29** — fix-continue-args archived: `specwf continue change <name>` 查询 change 的下一步

## 状态变更检查清单

### phase ship 前
- [x] 所有 Change 已 archived
- [x] phase summary 已生成
- [x] 文档已更新

---

*state.md 由 specwf 自动管理。不要手动编辑 frontmatter 的缩进和层级结构。*
